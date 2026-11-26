import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { asActor, getDb, type Actor } from "../lib/db";
import {
  addResourceTag,
  updateResourceTag,
  removeResourceTag,
  dashboard,
} from "../lib/service";
process.env.PGLITE_DATA_DIR = await mkdtemp(join(tmpdir(), "crisislink-tags-"));
process.env.DEMO_PASSWORD = randomBytes(24).toString("base64url");
const tech: Actor = {
  user_id: 5,
  full_name: "Maintenance Officer",
  email: "tech@example.com",
  role_name: "Technician",
};
const responder: Actor = {
  user_id: 2,
  full_name: "Fire Response Lead",
  email: "fire@example.com",
  role_name: "Responder",
};
test("Authorized SQL tag create read update and delete leave other tags intact", async () => {
  await addResourceTag(tech, { resource_id: 201, tag: "inspection_due" });
  assert.ok(
    (await dashboard(tech)).resourceTags.some(
      (r: any) => r.resource_id === 201 && r.tag === "inspection_due",
    ),
  );
  await updateResourceTag(tech, {
    resource_id: 201,
    tag: "inspection_due",
    new_tag: "inspection_done",
  });
  await removeResourceTag(tech, { resource_id: 201, tag: "inspection_done" });
  const tags = (await dashboard(tech)).resourceTags;
  assert.ok(
    !tags.some(
      (r: any) => r.tag === "inspection_due" || r.tag === "inspection_done",
    ),
  );
  assert.ok(tags.some((r: any) => r.resource_id === 201 && r.tag === "fire"));
});
test("Responder tag writes are rejected by service and database separately", async () => {
  await assert.rejects(
    () => addResourceTag(responder, { resource_id: 201, tag: "forbidden" }),
    (e: any) => e.status === 403,
  );
  await assert.rejects(
    () =>
      asActor(responder, (tx) =>
        tx.query(
          "DELETE FROM resource_tags WHERE resource_id=201 AND tag='fire'",
        ),
      ),
    (e: any) => e.code === "42501",
  );
});
test("Duplicate missing invalid and unknown resource tags fail explicitly", async () => {
  await assert.rejects(() =>
    addResourceTag(tech, { resource_id: 201, tag: "fire" }),
  );
  await assert.rejects(() =>
    addResourceTag(tech, { resource_id: 99999, tag: "missing-resource" }),
  );
  await assert.rejects(() =>
    addResourceTag(tech, { resource_id: 201, tag: "   " }),
  );
  await assert.rejects(
    () => removeResourceTag(tech, { resource_id: 201, tag: "missing-tag" }),
    (e: any) => e.status === 404,
  );
});
after(async () => {
  const state = globalThis as any;
  if (state.crisisDb) await (await state.crisisDb).close();
});
