import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import assert from "node:assert/strict";
const root = await mkdtemp(join(tmpdir(), "crisislink-vector-http-"));
const password = randomBytes(24).toString("base64url");
const base = "http://127.0.0.1:3103";
const checks = [];
let server;
async function start(cache) {
  server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3103"], {
    env: { ...process.env, PGLITE_DATA_DIR: join(root, "postgres"), DEMO_PASSWORD: password,
      EMBEDDING_OFFLINE: "1", EMBEDDING_CACHE_DIR: cache, NEXT_TELEMETRY_DISABLED: "1" },
    windowsHide: true, stdio: "ignore",
  });
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(base)).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Isolated server did not start");
}
async function stop() {
  if (!server || server.exitCode !== null) return;
  await new Promise((resolve) => { server.once("exit", resolve); server.kill(); });
}
async function login() {
  const r = await fetch(base + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "coordinator@example.com", password }) });
  assert.equal(r.status, 200);
  return r.headers.get("set-cookie").split(";")[0];
}
try {
  await start(join(process.cwd(), "data/models"));
  const request = (path, cookie) => fetch(base + "/api/" + path, { headers: cookie ? { Cookie: cookie } : {} });
  assert.equal((await request("incidents/search?q=medical")).status, 401);
  checks.push("Unauthenticated vector search is rejected");
  let cookie = await login();
  const res = await request("incidents/search?q=" + encodeURIComponent("A warehouse is burning"), cookie);
  assert.equal(res.status, 200);
  const result = await res.json();
  assert.equal(result.rows[0].emergency_id, 101);
  assert.equal(result.dimensions, 384);
  checks.push("Authenticated production endpoint performs real offline semantic search");
  assert.equal((await request("incidents/search?q=x", cookie)).status, 400);
  assert.equal((await request("incidents/search?q=medical&limit=1000", cookie)).status, 400);
  checks.push("API validates query and top-k bounds");
  const http = spawn(process.execPath, ["scripts/http-smoke.mjs"], { env: { ...process.env, APP_URL: base, TEST_PASSWORD: password }, stdio: "inherit", windowsHide: true });
  assert.equal(await new Promise((resolve) => http.once("exit", resolve)), 0);
  checks.push("Existing 12 HTTP authentication/SQL/MongoDB checks pass on the revised build");
  await stop();
  await start(join(root, "missing-model-cache"));
  cookie = await login();
  assert.equal((await request("incidents/search?q=medical", cookie)).status, 503);
  checks.push("Missing offline model returns 503 without keyword fallback");
  assert.equal((await request("dashboard", cookie)).status, 200);
  const incident = await fetch(base + "/api/incidents", { method: "POST", headers: { Cookie: cookie, "Content-Type": "application/json" },
    body: JSON.stringify({ type_id: 2, location_id: 2, description: "Incident creation still works without the model", severity_level: "low", people_affected: 0 }) });
  assert.equal(incident.status, 201);
  checks.push("Dashboard and incident creation work while embedding model is unavailable");
  await mkdir("test-results", { recursive: true });
  await writeFile("test-results/vector-http.json", JSON.stringify({ checkedAt: new Date().toISOString(), passed: checks.length, checks, example: result }, null, 2));
  console.log(JSON.stringify({ vectorHTTPChecks: checks.length, passed: true }));
} finally { await stop(); }
