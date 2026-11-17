import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { verifyPassword } from "../lib/password";
test("Secure setup initializes hash-only accounts and resets passwords while revoking sessions", async () => {
  const dir = await mkdtemp(join(tmpdir(), "crisislink-setup-"));
  const first = randomBytes(24).toString("base64url"),
    second = randomBytes(24).toString("base64url");
  function setup(password: string) {
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/setup.ts"],
      {
        env: { ...process.env, PGLITE_DATA_DIR: dir, DEMO_PASSWORD: password },
        encoding: "utf8",
        windowsHide: true,
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.ok(!result.stdout.includes(password));
    assert.ok(!result.stderr.includes(password));
  }
  setup(first);
  let db = new PGlite(dir);
  await db.waitReady;
  assert.ok(
    verifyPassword(
      first,
      (
        await db.query<{ password_hash: string }>(
          "SELECT password_hash FROM users WHERE user_id=1",
        )
      ).rows[0].password_hash,
    ),
  );
  await db.query(
    "INSERT INTO app_sessions VALUES($1,1,CURRENT_TIMESTAMP+INTERVAL '1 hour')",
    ["0".repeat(64)],
  );
  await db.close();
  setup(second);
  db = new PGlite(dir);
  await db.waitReady;
  try {
    const stored = (
      await db.query<{ password_hash: string }>(
        "SELECT password_hash FROM users WHERE user_id=1",
      )
    ).rows[0].password_hash;
    assert.ok(verifyPassword(second, stored));
    assert.ok(!verifyPassword(first, stored));
    assert.equal((await db.query("SELECT * FROM app_sessions")).rows.length, 0);
    assert.ok(
      !(await readdir(dir, { recursive: true })).some((p) =>
        /credentials\.json|demo-accounts\.json/.test(p),
      ),
    );
  } finally {
    await db.close();
  }
});
