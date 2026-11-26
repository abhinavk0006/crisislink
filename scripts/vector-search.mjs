import { readSecret } from "./secret-input.mjs";
const query = process.argv[2];
if (!query) {
  console.log('Usage: pnpm vector:search "People trapped by rising water"');
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
  const res = await fetch(base + "/api/incidents/search?q=" + encodeURIComponent(query), { headers: { Cookie: cookie } });
  const result = await res.json();
  if (!res.ok) throw Error(result.error);
  console.log("Model:", result.model, "\nDimensions:", result.dimensions);
  console.log("Executed SQL:\n" + result.sql);
  console.table(result.rows.map(({ emergency_id, description, cosine_distance }) => ({ emergency_id, description, cosine_distance })));
} finally {
  await fetch(base + "/api/auth/logout", { method: "POST", headers: { Cookie: cookie } });
}
