import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
import { readSecret } from "./secret-input.mjs";
const base = process.env.APP_URL || "http://127.0.0.1:3100";
const password =
  process.env.TEST_PASSWORD ||
  (await readSecret(
    "Current demonstration password for HTTP checks (hidden): ",
  ));
const checks = [];
async function request(path, method = "GET", body, cookie, origin = base) {
  const res = await fetch(base + "/api/" + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...(method === "GET" ? {} : { Origin: origin }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json(), headers: res.headers };
}
async function check(name, fn) {
  await fn();
  checks.push(name);
  console.log("PASS " + name);
}
let coordinatorCookie, responderCookie, technicianCookie;
await check("Unauthenticated dashboard returns 401", async () =>
  assert.equal((await request("dashboard")).status, 401),
);
await check(
  "Coordinator login sets an HttpOnly SameSite session cookie",
  async () => {
    const r = await request("auth/login", "POST", {
      email: "coordinator@example.com",
      password,
    });
    assert.equal(r.status, 200);
    const cookie = r.headers.get("set-cookie");
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=strict/i);
    coordinatorCookie = cookie.split(";")[0];
  },
);
await check(
  "Authenticated dashboard is served without credential data",
  async () => {
    const r = await request("dashboard", "GET", undefined, coordinatorCookie);
    assert.equal(r.status, 200);
    assert.ok(r.data.incidents.length >= 3);
    assert.ok(!JSON.stringify(r.data).includes("password_hash"));
  },
);
await check("Cross-origin write is rejected", async () =>
  assert.equal(
    (
      await request(
        "incidents",
        "POST",
        {},
        coordinatorCookie,
        "https://untrusted.example",
      )
    ).status,
    403,
  ),
);
await check("Invalid incident body is rejected", async () =>
  assert.equal(
    (
      await request(
        "incidents",
        "POST",
        { description: "x" },
        coordinatorCookie,
      )
    ).status,
    400,
  ),
);
await check("Responder login and API write denial", async () => {
  const r = await request("auth/login", "POST", {
    email: "fire@example.com",
    password,
  });
  assert.equal(r.status, 200);
  responderCookie = r.headers.get("set-cookie").split(";")[0];
  assert.equal(
    (await request("incidents", "POST", {}, responderCookie)).status,
    403,
  );
});
await check("Technician login and field-note write denial", async () => {
  const r = await request("auth/login", "POST", {
    email: "tech@example.com",
    password,
  });
  assert.equal(r.status, 200);
  technicianCookie = r.headers.get("set-cookie").split(";")[0];
  assert.equal(
    (
      await request(
        "notes",
        "POST",
        { emergency_id: 101, text: "Technician cannot write", tags: [] },
        technicianCookie,
      )
    ).status,
    403,
  );
});
let note;
await check("HTTP MongoDB create read search update delete", async () => {
  const r = await request(
    "notes",
    "POST",
    {
      emergency_id: 101,
      text: "HTTP smoke evacuation training note",
      tags: ["http-test"],
    },
    coordinatorCookie,
  );
  assert.equal(r.status, 201);
  note = r.data.id;
  let list = await request(
    "notes?incident=101&search=evacuation",
    "GET",
    undefined,
    coordinatorCookie,
  );
  assert.equal(list.status, 200);
  assert.ok(list.data.notes.some((n) => n._id === note));
  assert.equal(
    (
      await request(
        "notes/" + note,
        "PATCH",
        {
          text: "HTTP smoke revised training note",
          tags: ["http-test"],
          assessment: {},
        },
        coordinatorCookie,
      )
    ).status,
    200,
  );
  assert.equal(
    (await request("notes/" + note, "DELETE", undefined, coordinatorCookie))
      .status,
    200,
  );
});
await check(
  "SQL resource tag create read rename delete through HTTP",
  async () => {
    const tag = "http-check-" + Date.now();
    assert.equal(
      (
        await request(
          "resource-tags",
          "POST",
          { resource_id: 201, tag },
          technicianCookie,
        )
      ).status,
      201,
    );
    let d = await request("dashboard", "GET", undefined, technicianCookie);
    assert.ok(d.data.resourceTags.some((t) => t.tag === tag));
    assert.equal(
      (
        await request(
          "resource-tags",
          "PATCH",
          { resource_id: 201, tag, new_tag: tag + "-renamed" },
          technicianCookie,
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await request(
          "resource-tags",
          "DELETE",
          { resource_id: 201, tag: tag + "-renamed" },
          technicianCookie,
        )
      ).status,
      200,
    );
    d = await request("dashboard", "GET", undefined, technicianCookie);
    assert.ok(
      !d.data.resourceTags.some(
        (t) => t.tag === tag || t.tag === tag + "-renamed",
      ),
    );
    assert.equal(
      (
        await request(
          "resource-tags",
          "POST",
          { resource_id: 201, tag: "forbidden" },
          responderCookie,
        )
      ).status,
      403,
    );
  },
);
await check("Live SQL CTE query returns records", async () => {
  const r = await request(
    "queries?key=cte",
    "GET",
    undefined,
    coordinatorCookie,
  );
  assert.equal(r.status, 200);
  assert.ok(r.data.rows.length >= 3);
});
await check(
  "HTTP incident dispatch and responder completion persist together",
  async () => {
    const medic = await request("auth/login", "POST", {
      email: "medic@example.com",
      password,
    });
    assert.equal(medic.status, 200);
    const medicCookie = medic.headers.get("set-cookie").split(";")[0];
    const snapshot = await request(
      "dashboard",
      "GET",
      undefined,
      coordinatorCookie,
    );
    const previous = snapshot.data.assignments.find(
      (a) =>
        a.responder_id === 2 && ["active", "dispatched"].includes(a.status),
    );
    if (previous)
      assert.equal(
        (
          await request(
            "complete",
            "POST",
            {
              assignment_id: previous.assignment_id,
              outcome: "Medical response completed during API verification",
            },
            medicCookie,
          )
        ).status,
        200,
      );
    const created = await request(
      "incidents",
      "POST",
      {
        type_id: 2,
        location_id: 2,
        description: "HTTP integration medical response",
        severity_level: "medium",
        people_affected: 1,
        capability_id: 2,
      },
      coordinatorCookie,
    );
    assert.equal(created.status, 201);
    const dispatched = await request(
      "dispatch",
      "POST",
      {
        emergency_id: created.data.emergency_id,
        resource_id: 202,
        responder_id: 2,
      },
      coordinatorCookie,
    );
    assert.equal(dispatched.status, 201);
    const payload = {
      assignment_id: dispatched.data.assignment_id,
      outcome: "Patient transferred safely by the assigned medical team",
    };
    assert.equal(
      (await request("complete", "POST", payload, responderCookie)).status,
      403,
    );
    assert.equal(
      (await request("complete", "POST", payload, medicCookie)).status,
      200,
    );
    const final = await request(
      "dashboard",
      "GET",
      undefined,
      coordinatorCookie,
    );
    assert.equal(
      final.data.incidents.find(
        (i) => i.emergency_id === created.data.emergency_id,
      ).status,
      "resolved",
    );
    assert.equal(
      final.data.resources.find((r) => r.resource_id === 202).status,
      "available",
    );
  },
);
await check("Logout invalidates an existing session", async () => {
  assert.equal(
    (await request("auth/logout", "POST", {}, coordinatorCookie)).status,
    200,
  );
  assert.equal(
    (await request("dashboard", "GET", undefined, coordinatorCookie)).status,
    401,
  );
});
await mkdir("test-results", { recursive: true });
await writeFile(
  "test-results/http.json",
  JSON.stringify(
    { checkedAt: new Date().toISOString(), passed: checks.length, checks },
    null,
    2,
  ),
);
