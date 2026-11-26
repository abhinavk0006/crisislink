import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { getDb, asActor, type Actor } from "../lib/db";
import { createIncident, dispatch } from "../lib/service";
import { embedText, EMBEDDING_ID, vectorLiteral } from "../lib/embeddings";
import { indexIncidents, searchIncidents, SEMANTIC_SQL } from "../lib/semantic";
process.env.PGLITE_DATA_DIR = await mkdtemp(join(tmpdir(), "crisislink-vector-"));
process.env.DEMO_PASSWORD = randomBytes(24).toString("base64url");
process.env.EMBEDDING_OFFLINE = "1";
const coordinator: Actor = { user_id: 1, full_name: "Demo Coordinator", email: "coordinator@example.com", role_name: "Coordinator" };
const technician: Actor = { user_id: 5, full_name: "Demo Technician", email: "tech@example.com", role_name: "Technician" };
const evidence: Record<string, unknown> = { checkedAt: new Date().toISOString(), checks: [] };
const checks = evidence.checks as string[];

test("Real local embeddings and PostgreSQL vector workflow", async (t) => {
  const db = await getDb();
  async function check(name: string, fn: () => Promise<void>) {
    await t.test(name, async () => { await fn(); checks.push(name); });
  }
  await check("Real pgvector extension and HNSW cosine index exist", async () => {
    assert.equal((await db.query("SELECT extversion FROM pg_extension WHERE extname='vector'")).rows.length, 1);
    const index = (await db.query<{ indexdef: string }>("SELECT indexdef FROM pg_indexes WHERE indexname='idx_emergency_embedding_hnsw'")).rows[0];
    assert.match(index.indexdef, /hnsw.*vector_cosine_ops/);
  });
  await check("Pinned MiniLM generates normalized 384-dimensional embeddings offline", async () => {
    const a = await embedText("A physician is treating an injured person");
    assert.equal(a.length, 384);
    assert.ok(Math.abs(Math.hypot(...a) - 1) < 0.001);
    assert.deepEqual(a, await embedText("A physician is treating an injured person"));
  });
  let target = 0;
  await check("Meaning search ranks medical incident without requiring matching query words", async () => {
    const incident = await createIncident(coordinator, { type_id: 2, location_id: 2,
      description: "A physician is treating an injured person who needs urgent hospital transport.", severity_level: "high", people_affected: 1 });
    target = incident.emergency_id;
    const result = await searchIncidents(coordinator, { query: "An ambulance is needed for a patient", limit: 3 });
    assert.equal((result.rows[0] as any).emergency_id, target);
    assert.equal(result.coverage.indexed, result.coverage.total);
    evidence.semanticExample = result;
  });
  await check("Repeated search skips up-to-date embeddings and preserves distance ordering", async () => {
    assert.equal(await indexIncidents(), 0);
    const result = await searchIncidents(technician, { query: "A warehouse is burning", limit: 3 });
    assert.equal((result.rows[0] as any).emergency_id, 101);
    const distances = result.rows.map((r: any) => r.cosine_distance);
    assert.deepEqual(distances, [...distances].sort((a, b) => a - b));
  });
  await check("Description edits invalidate old vectors and the next search reindexes", async () => {
    await db.query("UPDATE emergencies SET description=$1 WHERE emergency_id=$2", ["Floodwaters surround a home and residents require a rescue boat.", target]);
    const row = (await db.query<any>("SELECT embedding,embedding_model,embedded_at FROM emergencies WHERE emergency_id=$1", [target])).rows[0];
    assert.deepEqual(row, { embedding: null, embedding_model: null, embedded_at: null });
    const result = await searchIncidents(coordinator, { query: "People stranded by rising water need evacuation", limit: 2 });
    assert.ok(result.rows.some((r: any) => r.emergency_id === target));
    assert.equal(result.newlyIndexed, 1);
  });
  await check("Bound parameters reject malformed input and cannot execute injected SQL", async () => {
    await assert.rejects(() => searchIncidents(coordinator, { query: "x", limit: 5 }));
    await assert.rejects(() => searchIncidents(coordinator, { query: "medical", limit: 1000 }));
    await searchIncidents(coordinator, { query: "'; DROP TABLE emergencies; --", limit: 1 });
    assert.ok((await db.query("SELECT 1 FROM emergencies LIMIT 1")).rows.length);
    assert.throws(() => vectorLiteral([1, 2]));
  });
  await check("Operational roles cannot overwrite vectors directly; trusted indexer preserves identity", async () => {
    await assert.rejects(() => asActor(technician, (tx) => tx.exec("UPDATE emergencies SET embedding=NULL")));
    const role = (await db.query<{ role: string }>("SELECT current_user AS role")).rows[0].role;
    assert.notEqual(role, "crisis_technician");
  });
  await check("HNSW can serve the parameterized cosine query; planner choice is not a benchmark", async () => {
    const vector = vectorLiteral(await embedText("hospital transport"));
    const plan = await db.transaction(async (tx) => {
      await tx.exec("SET LOCAL enable_seqscan=off");
      return (await tx.query("EXPLAIN " + SEMANTIC_SQL, [vector, EMBEDDING_ID, 3])).rows;
    });
    assert.match(JSON.stringify(plan), /idx_emergency_embedding_hnsw/);
    evidence.forcedIndexPlan = plan;
  });
  await check("Existing dispatch capability validation remains enforced", async () => {
    await assert.rejects(() => dispatch(coordinator, { emergency_id: 101, resource_id: 202, responder_id: 2 }), /capabilities/);
  });
  await mkdir("test-results", { recursive: true });
  await writeFile("test-results/semantic.json", JSON.stringify({ ...evidence, passed: checks.length }, null, 2));
});
after(async () => { const s = globalThis as any; if (s.crisisDb) await (await s.crisisDb).close(); });
