import { z } from "zod";
import { getDb, asActor, type Actor } from "./db";
import { embedText, EMBEDDING_ID, EMBEDDING_DIMENSIONS, vectorLiteral } from "./embeddings";

// Incremental derived-index maintenance by the trusted backend, not a user write API.
// Inference is outside SQL transactions; the conditional update prevents stale writes.
export async function indexIncidents() {
  const db = await getDb();
  const pending = (await db.query<{ emergency_id: number; description: string }>(
    "SELECT emergency_id,description FROM emergencies WHERE embedding IS NULL OR embedding_model IS DISTINCT FROM $1 ORDER BY emergency_id",
    [EMBEDDING_ID],
  )).rows;
  let indexed = 0;
  for (const incident of pending) {
    const embedding = vectorLiteral(await embedText(incident.description));
    const changed = await db.query(
      "UPDATE emergencies SET embedding=$1::vector,embedding_model=$2,embedded_at=CURRENT_TIMESTAMP WHERE emergency_id=$3 AND description=$4 RETURNING emergency_id",
      [embedding, EMBEDDING_ID, incident.emergency_id, incident.description],
    );
    indexed += changed.rows.length;
  }
  return indexed;
}

export const SEMANTIC_SQL = `SELECT emergency_id,description,status,severity_level,
  embedding <=> $1::vector AS cosine_distance,
  1 - (embedding <=> $1::vector) AS cosine_similarity
FROM emergencies
WHERE embedding IS NOT NULL AND embedding_model=$2
ORDER BY embedding <=> $1::vector
LIMIT $3`;

export async function searchIncidents(actor: Actor, input: unknown) {
  const { query, limit } = z.object({
    query: z.string().trim().min(3).max(500),
    limit: z.coerce.number().int().min(1).max(10).default(5),
  }).parse(input);
  const newlyIndexed = await indexIncidents();
  const vector = vectorLiteral(await embedText(query));
  return asActor(actor, async (tx) => {
    const rows = (await tx.query(SEMANTIC_SQL, [vector, EMBEDDING_ID, limit])).rows;
    const coverage = (await tx.query<{ total: number; indexed: number }>(
      "SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE embedding IS NOT NULL AND embedding_model=$1)::int AS indexed FROM emergencies",
      [EMBEDDING_ID],
    )).rows[0];
    return { rows, coverage, newlyIndexed, model: EMBEDDING_ID,
      dimensions: EMBEDDING_DIMENSIONS, metric: "cosine distance", sql: SEMANTIC_SQL };
  });
}
