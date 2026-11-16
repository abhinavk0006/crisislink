import { PGlite } from "@electric-sql/pglite";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomBytes } from "node:crypto";
import { hashPassword } from "./password";
export type Actor = {
  user_id: number;
  full_name: string;
  email: string;
  role_name: "Coordinator" | "Responder" | "Technician";
};
const roleNames = {
  Coordinator: "crisis_coordinator",
  Responder: "crisis_responder",
  Technician: "crisis_technician",
};
const globalDb = globalThis as unknown as { crisisDb?: Promise<PGlite> };
export async function getDb() {
  if (!globalDb.crisisDb)
    globalDb.crisisDb = (async () => {
      const dir = resolve(process.env.PGLITE_DATA_DIR || "data/postgres");
      await mkdir(dir, { recursive: true });
      const db = new PGlite(dir);
      await db.waitReady;
      await db.exec("SET TIME ZONE 'Asia/Kolkata'");
      const exists = await db.query<{ present: boolean }>(
        "SELECT to_regclass('public.roles') IS NOT NULL AS present",
      );
      if (!exists.rows[0].present) {
        await db.transaction(async (tx) => {
          for (const file of ["00_schema.sql", "01_seed.sql"]) {
            const sql = (
              await readFile(join(process.cwd(), "database", file), "utf8")
            ).replace(/^BEGIN;\s*|^COMMIT;\s*/gm, "");
            await tx.exec(sql);
          }
          const ids = await tx.query<{
            table_name: string;
            column_name: string;
          }>(
            "SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND is_identity='YES'",
          );
          for (const c of ids.rows)
            await tx.exec(
              `SELECT setval(pg_get_serial_sequence('${c.table_name}','${c.column_name}'),GREATEST(COALESCE((SELECT MAX(${c.column_name}) FROM ${c.table_name}),0),1),true)`,
            );
          await tx.exec(
            await readFile(
              join(process.cwd(), "database/02_advanced.sql"),
              "utf8",
            ),
          );
          const password =
            process.env.DEMO_PASSWORD || randomBytes(18).toString("base64url");
          if (password.length < 12)
            throw Error("DEMO_PASSWORD must contain at least 12 characters");
          const accounts = await tx.query<{ user_id: number }>(
            "SELECT user_id FROM users",
          );
          for (const account of accounts.rows)
            await tx.query(
              "UPDATE users SET password_hash=$1 WHERE user_id=$2",
              [hashPassword(password), account.user_id],
            );
          await mkdir("data", { recursive: true });
          await writeFile(
            process.env.DEMO_ACCOUNTS_FILE || "data/demo-accounts.json",
            JSON.stringify(
              {
                notice:
                  "Local fictional demonstration accounts. Keep this file private.",
                password,
                accounts: [
                  "coordinator@example.com",
                  "fire@example.com",
                  "medic@example.com",
                  "rescue@example.com",
                  "tech@example.com",
                ],
              },
              null,
              2,
            ),
            { mode: 0o600 },
          );
        });
      }
      await db.exec(await readFile(join(process.cwd(), "database/05_resource_tag_permissions.sql"), "utf8"));
      return db;
    })();
  return globalDb.crisisDb;
}
export async function asActor<T>(
  actor: Actor,
  fn: (tx: Parameters<Parameters<PGlite["transaction"]>[0]>[0]) => Promise<T>,
) {
  const db = await getDb();
  return db.transaction(async (tx) => {
    await tx.query("SELECT set_config('app.user_id',$1,true)", [
      String(actor.user_id),
    ]);
    await tx.exec(`SET LOCAL ROLE ${roleNames[actor.role_name]}`);
    return fn(tx);
  });
}
