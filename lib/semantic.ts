import { getDb } from "./db";
import { embedText, EMBEDDING_ID, vectorLiteral } from "./embeddings";

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
