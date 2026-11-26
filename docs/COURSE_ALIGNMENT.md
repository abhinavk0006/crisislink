# CrisisLink: course alignment and vector-search viva guide

Revision: 26 November 2026. This document describes implemented behaviour, not planned features.

## What changed and why

The existing Next.js -> authenticated API -> PostgreSQL/PGlite + MongoDB architecture remains intact. The 17 domain tables, SQL dispatch/completion workflow, roles, MongoDB note CRUD and keyword search remain. We extended the existing emergencies relation with a real pgvector column and added **Find similar incidents** to the Incidents screen. A coordinator can describe a new situation and review related historical incidents before deciding how to respond. Search is advisory; it never dispatches a team automatically.

This directly implements the PostgreSQL vector-search lesson in the supplied UE24CS351A_Merged_Slides.pdf, rather than presenting keyword search as vector search. We did not replace MongoDB or introduce Redis solely to match an example.

## Slide-to-implementation mapping

Page references are 1-based PDF pages, not the internal slide number printed on a slide.

| PDF pages | Course concept | CrisisLink implementation |
|---|---|---|
| 659-660 | Full-text search versus semantic search | MongoDB `$text` searches field-note words/tags; PostgreSQL incident search compares learned embeddings. They are separate features with separate labels. |
| 675-681 | Embedding model; extract text, generate vectors, store and query | `lib/embeddings.ts` runs pinned MiniLM locally; `lib/semantic.ts` indexes incident descriptions and embeds the query. |
| 681, 697-698 | `CREATE EXTENSION vector`, vector column, HNSW cosine index | `database/07_vector_search.sql`: `vector(384)` and `USING hnsw (embedding vector_cosine_ops)`. |
| 685-687, 709 | Cosine similarity and distance | `embedding <=> $1::vector` is distance; lower is closer. `1 - distance` is similarity, not confidence/probability. |
| 688-689 | Exact versus approximate nearest neighbours | The SQL query can use HNSW approximate search. Our small dataset may instead use an exact sequential scan; tests demonstrate index eligibility without claiming benchmark gains. |
| 703, 708 | MiniLM model-generated sentence embeddings | We use the full 384 dimensions, mean pooling and normalization. The slides permit dimensions beyond their simplified 8-dimensional demo. JS/ONNX runs the same model family in our existing Node backend, avoiding a new Python service. |
| 717-729 | NoSQL vector search and Redis examples | Retained as course context. We implemented the taught PostgreSQL path, not a Redis simulation or a claim of MongoDB native vector search. |

## Exact runtime path

1. Incidents screen: enter a situation in **Find similar incidents** and press **Search by meaning**.
2. Browser sends `GET /api/incidents/search?q=...&limit=5`.
3. Existing route handler authenticates the session. Zod validates query length (3-500) and result limit (1-10).
4. `indexIncidents()` finds missing/outdated incident embeddings. Inference runs outside SQL transactions. A conditional update saves each vector only if its description is unchanged.
5. `embedText()` generates the query vector using the identical pinned model, pooling, normalization and dimensions.
6. `asActor()` executes the parameterized nearest-neighbour query under the authenticated SQL role.
7. The browser displays ranked descriptions and cosine distances; selecting a result opens its incident details.

```sql
SELECT emergency_id, description,
       embedding <=> $1::vector AS cosine_distance,
       1 - (embedding <=> $1::vector) AS cosine_similarity
FROM emergencies
WHERE embedding IS NOT NULL AND embedding_model = $2
ORDER BY embedding <=> $1::vector
LIMIT $3;
```

`$1`, `$2` and `$3` are bound values. No arbitrary SQL or user-supplied embedding is accepted by the search API.

## Schema and indexing lifecycle

The additive migration adds `embedding vector(384)`, `embedding_model varchar(160)` and `embedded_at timestamptz`. No new domain entity or relationship is needed. The original ER/schema images show the base domain model; these three implementation columns extend emergencies and are listed in the regenerated data dictionary.

`trg_invalidate_incident_embedding` is a BEFORE UPDATE OF description trigger. It clears the old vector/model/time only when the description actually changes. Updating status alone leaves the vector valid. The next semantic search reindexes pending rows. Existing seed/demo incidents are backfilled by `pnpm vector:setup` or the next search; new incident creation stays independent of model availability. Cached up-to-date vectors are reused.

Derived-index writes are performed by the trusted backend database connection. Result reads use the actor's SQL role. Operational API endpoints never accept vector fields. The existing coordinator role can update incidents at the SQL level; no claim is made that the database owner or coordinator is prevented from changing all incident columns directly.

## Setup and offline operation

Stop the app before running standalone setup against its PGlite directory:

```powershell
pnpm install --frozen-lockfile
pnpm vector:setup
pnpm mongo
# In another terminal:
pnpm dev
```

On first setup, model files download from the public Hugging Face repository into ignored `data/models`. No API key is required. Text inference runs locally; descriptions are not sent to a hosted embedding API. The model weights/tokenizer revision is pinned in code. Set `EMBEDDING_OFFLINE=1` to require the cached model without network access. Set `EMBEDDING_CACHE_DIR` to use another cache location.

If the model is missing/offline or inference fails, semantic search returns HTTP 503. It does not silently fall back to word matching, and incident reporting/dispatch and MongoDB operations retain their existing behaviour. On a larger dataset, incremental indexing should move to a background job; synchronizing pending vectors during a search is appropriate only for this bounded classroom demonstration. Concurrent searches may repeat inference but conditional updates prevent storing vectors for an edited description.

## Demo and intricate questions

For a custom query in a terminal while the app is running, use `pnpm vector:search "People trapped by rising water"`. Enter the current coordinator password in the hidden prompt. This signs in through the existing API, prints the model/dimensions/SQL and ranked results, then revokes its temporary session. It does not open a second PGlite connection. Change the quoted question to demonstrate an unseen query.

- Try `People trapped by rising water` and compare the flood incident with unrelated fire/medical descriptions.
- Try `A warehouse is burning` and inspect the warehouse-fire match.
- Add a new incident using different wording; its first search indexes it automatically.
- Scores are distances, not a percentage confidence. Search returns the nearest available records even if every record is weakly related; the operator must assess relevance.
- HNSW is approximate. A defined index does not prove that the planner selected it or that a tiny dataset is faster. A test uses `SET LOCAL enable_seqscan=off` only to verify index eligibility; production search does not force it.
- Same dimensions alone are insufficient: document and query vectors must use the same model and preprocessing. `embedding_model` stores that identity.
- The 384 numbers are learned features, not labelled coordinates such as “fire score” or “flood score”. Cosine distance compares vector directions.
- Existing MongoDB field-note search is still keyword search. Do not say it now uses `$vectorSearch`, embeddings or an Atlas index.
- Existing SQL dispatch checks capability types and availability. Vector matches are never used to bypass these hard constraints.

## Other course concepts already implemented

ER-to-relational mapping, M:N bridge tables, keys and constraints, SQL CRUD, joins, subqueries, CTE/window/recursive queries, view/indexes, stored functions, audit trigger, transactions/rollback, locks, roles/grants and maintenance RLS remain valid. MongoDB still provides collection validation, document CRUD, a compound index, text index, filtering and aggregation. The detailed DATABASE_FEATURE_MAP guide links these features to code.

## References

- User-supplied course PDF: UE24CS351A_Merged_Slides.pdf, pages above.
- https://pglite.dev/extensions/
- https://github.com/pgvector/pgvector
- https://huggingface.co/docs/transformers.js/en/pipelines
- https://huggingface.co/Xenova/all-MiniLM-L6-v2
