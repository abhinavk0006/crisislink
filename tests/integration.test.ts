import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getDb, asActor, type Actor } from "../lib/db";
import { login, authenticate, logout } from "../lib/auth";
import {
  dashboard,
  createIncident,
  dispatch,
  complete,
  maintenance,
  runQuery,
  labQueries,
} from "../lib/service";
import {
  mongo,
  createNote,
  listNotes,
  updateNote,
  deleteNote,
} from "../lib/mongo";
const coordinator: Actor = {
  user_id: 1,
  full_name: "Operations Coordinator",
  email: "coordinator@example.com",
  role_name: "Coordinator",
};
const fire: Actor = {
  user_id: 2,
  full_name: "Fire Response Lead",
  email: "fire@example.com",
  role_name: "Responder",
};
const medic: Actor = {
  user_id: 3,
  full_name: "Medical Response Lead",
  email: "medic@example.com",
  role_name: "Responder",
};
const technician: Actor = {
  user_id: 5,
  full_name: "Maintenance Officer",
  email: "tech@example.com",
  role_name: "Technician",
};
process.env.PGLITE_DATA_DIR = await mkdtemp(join(tmpdir(), "crisislink-test-"));
process.env.MONGODB_DATABASE =
  "crisislink_test_" + randomUUID().replaceAll("-", "");
process.env.DEMO_PASSWORD = randomBytes(24).toString("base64url");
const passed: string[] = [];
test("CrisisLink integration evidence", async (t) => {
  const db = await getDb();
  async function check(name: string, fn: () => Promise<void>) {
    await t.test(name, async () => {
      await fn();
      passed.push(name);
    });
  }
  await check("Operational catalog has 17 domain tables and expected rows", async () => {
    const tables = (
      await db.query<{ table_name: string }>(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name NOT LIKE 'app_%' ORDER BY table_name",
      )
    ).rows;
    assert.equal(tables.length, 17);
    let count = 0;
    for (const r of tables)
      count += Number(
        (
          await db.query<{ n: number }>(
            `SELECT COUNT(*) AS n FROM ${r.table_name}`,
          )
        ).rows[0].n,
      );
    const expected=JSON.parse(await readFile("database/catalog-summary.json","utf8"));
    assert.equal(count, expected.freshDomainRows);
  });
  await check(
    "Passwords are hashed and valid sign in creates a revocable session",
    async () => {
      const row = (
        await db.query<{ password_hash: string }>(
          "SELECT password_hash FROM users WHERE user_id=1",
        )
      ).rows[0];
      assert.match(row.password_hash, /^scrypt\$/);
      const { token, actor } = await login(
        coordinator.email,
        process.env.DEMO_PASSWORD!,
      );
      assert.equal(actor.role_name, "Coordinator");
      assert.equal((await authenticate(token)).user_id, 1);
      await logout(token);
      await assert.rejects(() => authenticate(token));
    },
  );
  await check("Invalid login and absent session are rejected", async () => {
    await assert.rejects(() => login(coordinator.email, "wrong"));
    await assert.rejects(() => authenticate());
  });
  await check(
    "All three roles can retrieve dashboard without credential data",
    async () => {
      for (const actor of [coordinator, fire, technician]) {
        const d = await dashboard(actor);
        assert.equal(d.incidents.length, 3);
        assert.ok(!JSON.stringify(d).includes("password_hash"));
      }
    },
  );
  await check(
    "Database denies responder incident INSERT independently of the API",
    async () => {
      await assert.rejects(
        () =>
          asActor(fire, (tx) =>
            tx.exec(
              "INSERT INTO emergencies(emergency_id,type_id,location_id,reported_by,description) VALUES(999,1,1,2,'Forbidden')",
            ),
          ),
        (e: any) => e.code === "42501",
      );
    },
  );
  await check(
    "Database denies responder access to password hashes and session tokens",
    async () => {
      await assert.rejects(() =>
        asActor(fire, (tx) => tx.query("SELECT password_hash FROM users")),
      );
      await assert.rejects(() =>
        asActor(fire, (tx) => tx.query("SELECT * FROM app_sessions")),
      );
    },
  );
  await check(
    "Primary key foreign key and numerical CHECK reject invalid data",
    async () => {
      await assert.rejects(() =>
        db.query("INSERT INTO roles VALUES(1,'Duplicate','x')"),
      );
      await assert.rejects(() =>
        db.query("INSERT INTO resource_tags VALUES(99999,'invalid')"),
      );
      await assert.rejects(() =>
        db.query("UPDATE resources SET capacity=-1 WHERE resource_id=201"),
      );
    },
  );
  await check("DML demonstration rolls back INSERT UPDATE DELETE", async () => {
    await assert.rejects(() =>
      db.transaction(async (tx) => {
        await tx.exec(
          "INSERT INTO resource_tags VALUES(201,'test_tag');UPDATE resource_tags SET tag='changed_tag' WHERE tag='test_tag';DELETE FROM resource_tags WHERE resource_id=201 AND tag='fire';",
        );
        throw Error("Deliberate rollback");
      }),
    );
    assert.equal(
      (
        await db.query(
          "SELECT * FROM resource_tags WHERE tag IN ('test_tag','changed_tag')",
        )
      ).rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "SELECT * FROM resource_tags WHERE resource_id=201 AND tag='fire'",
        )
      ).rows.length,
      1,
    );
  });
  let incident = 0,
    assignment = 0;
  await check(
    "Creating an incident generates exactly one audit event with an accurate timestamp",
    async () => {
      const r = await createIncident(coordinator, {
        type_id: 2,
        location_id: 2,
        description: "Integration medical incident",
        severity_level: "high",
        people_affected: 2,
        capability_id: 2,
      });
      incident = r.emergency_id;
      const h = await db.query<{ changed_at: string }>(
        "SELECT * FROM emergency_status_history WHERE emergency_id=$1",
        [incident],
      );
      assert.equal(h.rows.length, 1);
      assert.ok(
        Math.abs(Date.now() - new Date(h.rows[0].changed_at).getTime()) < 60000,
      );
    },
  );
  await check(
    "Failed requirement insert rolls back incident and audit together",
    async () => {
      const before = Number(
        (await db.query<{ n: number }>("SELECT COUNT(*) AS n FROM emergencies"))
          .rows[0].n,
      );
      await assert.rejects(() =>
        createIncident(coordinator, {
          type_id: 2,
          location_id: 2,
          description: "Invalid capability",
          severity_level: "high",
          people_affected: 2,
          capability_id: 999,
        }),
      );
      assert.equal(
        Number(
          (
            await db.query<{ n: number }>(
              "SELECT COUNT(*) AS n FROM emergencies",
            )
          ).rows[0].n,
        ),
        before,
      );
    },
  );
  await check(
    "API service rejects technician and responder incident writes",
    async () => {
      await assert.rejects(() => createIncident(technician, {}));
      await assert.rejects(() => dispatch(fire, {}));
    },
  );
  await check(
    "Stored dispatch function reserves one resource and one responder atomically",
    async () => {
      const a = (await dispatch(coordinator, {
        emergency_id: incident,
        resource_id: 202,
        responder_id: 2,
      })) as any;
      assignment = a.assignment_id;
      assert.equal(
        (
          await db.query<{ status: string }>(
            "SELECT status FROM resources WHERE resource_id=202",
          )
        ).rows[0].status,
        "assigned",
      );
      assert.equal(
        (
          await db.query(
            "SELECT * FROM emergency_status_history WHERE emergency_id=$1",
            [incident],
          )
        ).rows.length,
        2,
      );
    },
  );
  await check(
    "Conflicting dispatch is rejected with no partial assignment",
    async () => {
      await assert.rejects(() =>
        dispatch(coordinator, {
          emergency_id: incident,
          resource_id: 202,
          responder_id: 2,
        }),
      );
      assert.equal(
        (
          await db.query("SELECT * FROM assignments WHERE emergency_id=$1", [
            incident,
          ])
        ).rows.length,
        1,
      );
    },
  );
  await check(
    "Unchanged status does not generate duplicate audit records",
    async () => {
      await asActor(coordinator, (tx) =>
        tx.query("UPDATE emergencies SET status=status WHERE emergency_id=$1", [
          incident,
        ]),
      );
      assert.equal(
        (
          await db.query(
            "SELECT * FROM emergency_status_history WHERE emergency_id=$1",
            [incident],
          )
        ).rows.length,
        2,
      );
    },
  );
  await check(
    "Responder cannot complete another responder assignment",
    async () => {
      await assert.rejects(() =>
        complete(fire, {
          assignment_id: assignment,
          outcome: "Not my assignment",
        }),
      );
    },
  );
  await check(
    "MongoDB supports create read full-text search aggregation update delete",
    async () => {
      const n = await createNote(medic, {
        emergency_id: incident,
        text: "Medical triage completed safely",
        tags: ["medical", "safety"],
        assessment: { safety: "Scene secured" },
      });
      let rows = await listNotes(coordinator, incident, "triage");
      assert.equal(rows.notes.length, 1);
      assert.equal(rows.summary.length, 2);
      await updateNote(medic, n.id, {
        text: "Medical transfer completed safely",
        tags: ["medical"],
        assessment: {},
      });
      rows = await listNotes(coordinator, incident, "transfer");
      assert.equal(rows.notes.length, 1);
      await deleteNote(medic, n.id);
      assert.equal((await listNotes(coordinator, incident)).notes.length, 0);
    },
  );
  await check(
    "NoSQL validates SQL references assignment scope and ownership",
    async () => {
      await assert.rejects(() =>
        createNote(coordinator, {
          emergency_id: 99999,
          text: "Missing SQL incident",
          tags: [],
        }),
      );
      await assert.rejects(() =>
        createNote(fire, {
          emergency_id: incident,
          text: "Unassigned responder",
          tags: [],
        }),
      );
      await assert.rejects(() =>
        createNote(technician, {
          emergency_id: incident,
          text: "Read only technician",
          tags: [],
        }),
      );
      const n = await createNote(coordinator, {
        emergency_id: 101,
        text: "Coordinator safety update",
        tags: [],
      });
      await assert.rejects(() =>
        updateNote(fire, n.id, { text: "Unauthorized change", tags: [] }),
      );
      await deleteNote(coordinator, n.id);
    },
  );
  await check(
    "MongoDB collection validator rejects malformed direct inserts",
    async () => {
      const col = await mongo();
      await assert.rejects(() =>
        col.insertOne({ text: "Missing required keys" } as any),
      );
    },
  );
  await check(
    "Completing response releases resources creates report and resolves incident",
    async () => {
      await complete(medic, {
        assignment_id: assignment,
        outcome: "Patients transferred safely",
      });
      assert.equal(
        (
          await db.query<{ status: string }>(
            "SELECT status FROM resources WHERE resource_id=202",
          )
        ).rows[0].status,
        "available",
      );
      assert.equal(
        (
          await db.query<{ status: string }>(
            "SELECT status FROM emergencies WHERE emergency_id=$1",
            [incident],
          )
        ).rows[0].status,
        "resolved",
      );
      assert.equal(
        (
          await db.query(
            "SELECT * FROM emergency_status_history WHERE emergency_id=$1",
            [incident],
          )
        ).rows.length,
        3,
      );
    },
  );
  await check(
    "Database role grants and RLS enforce maintenance author identity",
    async () => {
      await maintenance(technician, {
        resource_id: 201,
        description: "Verified equipment inspection",
        cost: 100,
      });
      await assert.rejects(() =>
        asActor(technician, (tx) =>
          tx.exec(
            "INSERT INTO maintenance_records(resource_id,performed_by) VALUES(201,1)",
          ),
        ),
      );
      await assert.rejects(() =>
        maintenance(fire, {
          resource_id: 201,
          description: "Forbidden inspection",
          cost: 100,
        }),
      );
    },
  );
  await check(
    "JOIN nested correlated CTE recursive view and aggregate queries execute",
    async () => {
      for (const key of Object.keys(labQueries))
        assert.ok((await runQuery(coordinator, key)).rows.length);
      assert.equal((await runQuery(coordinator, "recursive")).rows.length, 7);
      await assert.rejects(() => runQuery(coordinator, "DROP TABLE users"));
    },
  );
  await check(
    "Password comparison rejects database-style injection input",
    async () => {
      await assert.rejects(() =>
        login("' OR 1=1 --", process.env.DEMO_PASSWORD!),
      );
    },
  );
  await check("Login throttling blocks repeated failures", async () => {
    for (let i = 0; i < 5; i++)
      await assert.rejects(() => login("missing@example.com", "wrong"));
    await assert.rejects(
      () => login("missing@example.com", "wrong"),
      (e: any) => e.status === 429,
    );
  });
  await mkdir("test-results", { recursive: true });
  await writeFile(
    "test-results/integration.json",
    JSON.stringify(
      {
        checkedAt: new Date().toISOString(),
        passed: passed.length,
        checks: passed,
        database: "PostgreSQL through PGlite and real MongoDB",
        isolation:
          "Temporary SQL directory and uniquely named MongoDB database",
      },
      null,
      2,
    ),
  );
});
after(async () => {
  const state = globalThis as any;
  if (state.crisisMongo) {
    const client = await state.crisisMongo;
    await client.db(process.env.MONGODB_DATABASE).dropDatabase();
    await client.close();
  }
  if (state.crisisDb) await (await state.crisisDb).close();
});
