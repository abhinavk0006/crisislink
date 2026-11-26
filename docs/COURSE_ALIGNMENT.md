# CrisisLink: duplicate-report review and course alignment

Revision: 26 November 2026. This describes implemented behaviour. The standalone similar-incidents search panel and its GET endpoint have been removed.

## The operational problem

Several callers may report one emergency using different wording. Creating another incident for every report fragments information and can lead to repeated coordination work. While reporting a new incident, CrisisLink now checks whether it could describe an existing active incident at the same location. The coordinator must decide; vector similarity never automatically merges reports, suppresses incident creation or dispatches a team.

Example: existing report “Flames and heavy smoke are coming from a warehouse near the market.” Incoming report “A storage building is burning behind the shops.” The operator sees both descriptions, reporting time, type, status and already-deployed teams. Choosing **Same incident — attach this report** preserves the incoming description and reported details as an additional MongoDB field note. Choosing **Different incident — create separately** creates a new SQL incident even when a candidate exists.

## Architecture and storage

The architecture remains React -> Next.js authenticated API -> PostgreSQL/PGlite + MongoDB. No extra server or database is introduced.

- PostgreSQL owns the canonical incident, current status, location, resource assignments and vector index.
- A pinned local MiniLM model encodes descriptions into normalized 384-dimensional vectors. There is no hosted embedding API, keyword substitution or JavaScript production distance scan.
- PostgreSQL pgvector computes cosine distance and has an HNSW cosine index. An operational CTE first retrieves up to five filtered nearest candidates, then joins their incident type and deployed-team details.
- MongoDB preserves the original incoming report as a note tagged `additional-report`, with authenticated author/timestamps and the submitted severity, affected-person count, type, location and capability in assessment fields. These are reported observations; canonical counts/severity are not overwritten automatically.
- `app_incident_report_receipts` is one internal decision/idempotency table, added to the previous two internal authentication tables. The domain remains 17 tables and 26 domain foreign keys. The three vector columns extend emergencies. The base ER/schema diagrams do not depict these implementation extensions; DATA_DICTIONARY.md does.

## Candidate eligibility and honest limits

The candidate must have the same location ID, be reported/responding, and have a reporting timestamp in the preceding 24 hours. Future timestamps and resolved/older incidents are excluded. We do not filter by the incoming type because callers can describe/classify the same event differently; both types are shown for human review.

Only the nearest five eligible candidates with cosine distance <= 0.65 are shown. This is a documented screening heuristic, not a calibrated confidence or duplicate probability. Lower distance means closer meaning; even a close match can be a separate event. A broad location ID may cover multiple events; other locations, older events and weak matches can be missed. No claim of perfect duplicate detection or measured production accuracy is made. The coordinator can always choose separate creation.

For a small dataset PostgreSQL may choose an exact scan and sort. At larger scale HNSW offers approximate retrieval, so it can miss neighbours. Iterative strict-order scans are enabled for filtered ANN queries. Tests verify the HNSW index and native vector-query eligibility without claiming that every filtered query uses that index or that it is faster on tiny data.

## API and confirmation lifecycle

1. **Report incident** form -> `POST /api/incidents/review`, with the complete validated draft.
2. Coordinator authorization and Zod validation run. Missing/outdated embeddings are refreshed; inference is outside transactions, and conditional writes prevent vectors for changed source text.
3. The API returns candidate details and a signed ten-minute review token bound to the exact draft, coordinator and candidate fingerprints. Review writes no incident, assignment or note.
4. Changing the form invalidates the displayed review; late responses for an old draft are ignored. Tampered/expired tokens or changed drafts are rejected server-side.
5. `POST /api/incidents/report` carries the human choice. Attachment rechecks that the selected incident is still eligible and unchanged. A coordinator can explicitly create separately despite a suggested match.
6. A SQL decision receipt prevents switching one review from attach to create (or vice versa). Separate creation and its receipt commit in one SQL transaction. Attachment uses a MongoDB unique partial index on `report_review_id` plus `$setOnInsert`; retrying the same signed decision creates only one observation.

Review signatures use a process-local random key: a server restart invalidates outstanding reviews. Run the check again after a restart. Idempotency covers retries of the same decision, not a new review deliberately submitted again.

SQL and MongoDB do not share a distributed transaction. An attachment receipt records the chosen action; it is not proof that MongoDB saved the note. An unavailable MongoDB returns an explicit error without creating another incident or reporting success. Retry the same decision while its token remains valid. The original report is not auto-merged into the SQL description.

If the embedding model is unavailable, review returns 503. The UI offers an explicit **Create new incident without duplicate check** action. This uses a request ID for idempotency and does not claim that duplicate screening succeeded. Core reporting and dispatch are not silently blocked by a model failure. Existing low-level `POST /api/incidents` remains compatible for programmatic incident creation; duplicate review is advisory, not a database uniqueness constraint.

## Real SQL lab

Every result is a fresh authenticated SQL query, not a stored result array. The tab executes immediately when opened or when the query changes, polls every five seconds while visible in the application, and offers **Refresh results now** plus the server execution timestamp. Failed requests clear old results instead of presenting them as current.

The recursive calendar now generates `CURRENT_DATE-6` through `CURRENT_DATE` using the database's Asia/Kolkata timezone. Newly created incidents appear in the JOIN and latest-history CTE, in the unassigned query before dispatch, and in today's calendar count. Assignment views and grouping results change after dispatch. The nested query still applies its above-average condition; not every new incident belongs in every filtered result. A separate browser can use manual refresh for immediate verification; polling is not WebSocket push.

## Course PDF to code

Page numbers below are 1-based PDF pages in the supplied UE24CS351A_Merged_Slides.pdf.

| Pages | Concept | Implemented location |
|---|---|---|
| 659-660 | Keyword versus semantic search | MongoDB note `$text` remains keyword search; duplicate review compares incident embeddings. |
| 675-681 | Generate, store and query sentence embeddings | `lib/embeddings.ts`, `lib/semantic.ts`, `lib/incident-review.ts` |
| 681, 697-698 | pgvector column and HNSW cosine index | `database/07_vector_search.sql` |
| 685-687, 709 | Cosine similarity/distance | Native `<=>` operator in `DUPLICATE_SQL`; smaller distance means closer meaning. |
| 688-689 | Exact versus approximate nearest neighbours | Native vector query, HNSW index, explicit planner/recall limits above |
| 703, 708 | MiniLM sentence embeddings | Full 384 dimensions, mean pooling, normalization and pinned model revision; JS/ONNX stays inside our existing Node backend. |
| 717-729 | NoSQL/Redis vector examples | Course context; our implemented vector backend is the taught PostgreSQL path. No native MongoDB `$vectorSearch` claim. |

Existing M:N bridge tables, keys/constraints, SQL CRUD, JOINs/subqueries, stored functions, audit/invalidation triggers, roles/grants, RLS and transactions remain. The duplicate-review query now also puts a CTE into a real operational workflow. MongoDB still provides flexible documents, validation, CRUD, keyword search, compound/text indexes and aggregation; the new unique partial index supports retry-safe attachments.

## Setup and demonstration

```powershell
pnpm install --frozen-lockfile
# Stop the app before standalone setup uses its PGlite folder:
pnpm vector:setup
pnpm mongo
# In a second terminal:
pnpm dev
```

The pinned public model downloads once to ignored `data/models`. Inference then runs locally. `EMBEDDING_OFFLINE=1` requires the cached model. The source ZIP excludes private runtime databases and model cache; a new machine must run setup.

Demo:

1. Create a current incident at Demo Market using the warehouse-fire sentence above. Check, then choose new incident if no close candidate exists.
2. Start another report at the same location using the paraphrased storage-building sentence.
3. Check candidates and show the existing incident/time/deployed teams. Choose same incident.
4. Show the original report as an `additional-report` note; show that incident/assignment counts did not increase.
5. Repeat with a genuinely different event and choose create separately. Open SQL lab: JOIN/CTE and today's recursive count include the new incident; dispatch it to demonstrate view/group changes.

For read-only custom terminal checks against the running app: `pnpm vector:search "A storage building is burning behind the shops" 1 1`. The final arguments are location ID and reported type ID; defaults are both 1. It asks for the coordinator password with hidden input, displays candidate records, then revokes its temporary session. It saves no report.

## Verification

Tests cover real offline embeddings, metadata filtering, read-only review, signed/expired/changed reviews, human choice, idempotent SQL creation and MongoDB attachment, conflicting decisions, stale candidate checks, vector invalidation, permissions, native vector-query eligibility, MongoDB/model outages and new-data SQL-lab queries. Full evidence is under docs/verification.

References: https://pglite.dev/extensions/ ; https://github.com/pgvector/pgvector ; https://huggingface.co/docs/transformers.js/en/pipelines
