import { getDb } from "../lib/db";
import { indexIncidents } from "../lib/semantic";
import { embedText, EMBEDDING_ID } from "../lib/embeddings";
console.log("Preparing local MiniLM model and PostgreSQL vector index...");
const db = await getDb();
try {
  await embedText("Prepare the emergency incident search model");
  console.log(JSON.stringify({ model: EMBEDDING_ID, indexed: await indexIncidents() }));
  console.log("Ready. Cached model works offline. Start the app and use Find similar incidents.");
} finally { await db.close(); }
