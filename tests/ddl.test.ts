import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
test("CREATE ALTER and DROP operate only on the disposable demonstration table", async () => {
  const db = new PGlite();
  try {
    const result = await db.exec(
      await readFile("database/06_ddl_demo.sql", "utf8"),
    );
    assert.ok(
      result.some((r) =>
        r.rows.some(
          (row: any) => row.label === "DDL practice" && row.quantity === 1,
        ),
      ),
    );
    const remaining = await db.query<{ name: string | null }>(
      "SELECT to_regclass('pg_temp.crisislink_ddl_example')::text AS name",
    );
    assert.equal(remaining.rows[0].name, null);
  } finally {
    await db.close();
  }
});
