import { readSecret } from "./secret-input.mjs";
const query = process.argv[2];
if (!query) {
  console.log('Usage: pnpm vector:search "A storage building is burning behind the shops" <location_id> <type_id>');
  process.exit(1);
}
const base = process.env.APP_URL || "http://127.0.0.1:3100";
const password = await readSecret("Current coordinator password (hidden): ");
const login = await fetch(base + "/api/auth/login", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "coordinator@example.com", password }),
});
if (!login.ok) throw Error((await login.json()).error);
const cookie = login.headers.get("set-cookie").split(";")[0];
try {
  const res = await fetch(base + "/api/incidents/review", { method:"POST",headers: { Cookie: cookie,"Content-Type":"application/json" },
    body:JSON.stringify({description:query,location_id:Number(process.argv[3]||1),type_id:Number(process.argv[4]||1),severity_level:"high",people_affected:0}) });
  const result = await res.json();
  if (!res.ok) throw Error(result.error);
  console.log("Read-only duplicate review: same location, active status, last",result.windowHours,"hours. No report was saved.");
  console.table(result.candidates.map(({ emergency_id, description, cosine_distance,reported_at }) => ({ emergency_id, description, cosine_distance,reported_at })));
  console.log("Confirm attach/create in the application. A match is not proof of a duplicate.");
} finally {
  await fetch(base + "/api/auth/logout", { method: "POST", headers: { Cookie: cookie } });
}
