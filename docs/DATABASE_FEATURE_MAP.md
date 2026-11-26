# Database concept to feature to code map

**Crisis Link Emergency Resource Coordination & Response Management System**

Source-code snapshot: `1419edf1007672c14bb47e19d277d32378210768`. Line numbers and marker strings were checked directly against the supplied source files. If code is edited, rerun `python tools/build-feature-map.py` to regenerate this guide.

## Start here when the teacher asks

1. Find the concept in the quick table or search the offline HTML guide.
2. Explain the feature and purpose in one sentence.
3. Open the definition, then its service/API caller, and finally the relevant screen.
4. Demonstrate the normal result and one tested rejection/rollback case.

Open **DATABASE_FEATURE_MAP.html** for a searchable offline guide. Its Open code links jump to highlighted line numbers in bundled source viewers; no server or internet is needed for the guide. GitHub links pin the inspected source revision.

## Important distinctions

- PostgreSQL through PGlite stores operational relations, including resource_tags. MongoDB stores field_notes and their tag arrays/assessments.
- SQL stored functions are dispatch_response, finish_response, app_actor, record_emergency_status and invalidate_incident_embedding. TypeScript helpers are application functions. No CREATE PROCEDURE/CALL routine is implemented.
- The trigger, stored dispatch/completion functions and assignment view serve the operational workflow. CTE/recursive/nested/aggregate examples also execute live, but through SQL lab; they are not all dashboard implementation queries.
- database/03_queries.sql and database/04_mongo_commands.js are supplementary standalone examples. Runtime query definitions live in lib/service.ts and lib/mongo.ts. database/06_ddl_demo.sql is an isolated demonstration, not an operational migration.
- PostgreSQL incident semantic search uses real MiniLM embeddings, pgvector cosine distance and an HNSW index. MongoDB note search remains keyword search. Supporting indexes do not establish measured speed improvement; small data may use sequential scans.
- Presenter suggestions follow CONTRIBUTIONS.md and are responsibility assignments, not claims of historical authorship.

## Fast lookup

| Concept | What it implements | Where it runs | First file to open |
|---|---|---|---|
| [SQL01 DDL tables primary keys foreign keys and CHECK constraints](#sql01) | Define the 17 operational relations and reject invalid IDs, references, coordinates, counts and costs. | Setup + enforced during operations | [database/00_schema.sql:45](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/00_schema.sql#L45) |
| [SQL02 Composite keys and multivalued attribute mapping](#sql02) | Store responder skills and resource tags as separate rows and prevent duplicate values per owner. | Operational | [database/00_schema.sql:235](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/00_schema.sql#L235) |
| [SQL03 CREATE ALTER and DROP lifecycle](#sql03) | Demonstrate changing and removing structure without dropping operational tables. | Isolated demonstration | [database/06_ddl_demo.sql:3](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/06_ddl_demo.sql#L3) |
| [SQL04 Seed INSERT commands](#sql04) | Populate the relational model with 63 fictional domain records in parent-before-child order. | First setup | [database/01_seed.sql:3](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/01_seed.sql#L3) |
| [SQL05 SQL CRUD used by the Resources screen](#sql05) | Add, list, rename and remove resource tags in PostgreSQL through the interface. | Operational | [lib/service.ts:74](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L74) |
| [SQL06 JOIN queries](#sql06) | Combine incidents with type/location and assignments with resource/responder information. | Operational + SQL lab | [lib/service.ts:16](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L16) |
| [SQL07 GROUP BY HAVING COUNT and ORDER BY](#sql07) | Summarize assignments per incident and retain groups having at least one assignment. | Live SQL lab example | [lib/service.ts:238](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L238) |
| [SQL08 Nested scalar subquery](#sql08) | Find incidents whose affected-person count exceeds the current overall average. | Live SQL lab example | [lib/service.ts:230](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L230) |
| [SQL09 Correlated NOT EXISTS query](#sql09) | Find incidents without active assignments; correlated capability checks also validate a dispatch. | Live SQL lab example + dispatch validation | [lib/service.ts:232](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L232) |
| [SQL10 CTE with ROW_NUMBER window function](#sql10) | Return the latest recorded status event for each incident. | Live SQL lab example | [lib/service.ts:234](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L234) |
| [SQL11 Recursive CTE](#sql11) | Generate a seven-day reporting calendar and retain dates with zero incidents. | Live SQL lab example | [lib/service.ts:235](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L235) |
| [SQL12 SQL view v_assignment_summary](#sql12) | Provide reusable joined assignment/resource/responder data for the dashboard. | Operational + SQL lab | [database/02_advanced.sql:45](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L45) |
| [SQL13 Supporting SQL indexes](#sql13) | Support incident/status, per-incident history and assignment lookup patterns. | Defined in application schema | [database/02_advanced.sql:30](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L30) |
| [SQL14 Partial unique indexes](#sql14) | Prevent the same resource or responder from having two active/dispatched assignments while retaining historical completed assignments. | Operational integrity enforcement | [database/02_advanced.sql:26](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L26) |
| [SQL15 Stored SQL function dispatch_response](#sql15) | Validate and reserve an incident response atomically, including capability coverage. | Operational | [database/02_advanced.sql:68](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L68) |
| [SQL16 Stored SQL function finish_response](#sql16) | Create an assignment-linked report, release the resource/responder, and resolve the incident when no active response remains. | Operational | [database/02_advanced.sql:94](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L94) |
| [SQL17 Automatic incident-history trigger](#sql17) | Write status history automatically when an incident is created or its status actually changes. | Operational | [database/02_advanced.sql:55](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L55) |
| [SQL18 Transactions COMMIT and ROLLBACK](#sql18) | Keep incident/requirements, dispatch reservations, reports/releases and their audit entries consistent. | Operational + isolated demonstration | [lib/db.ts:81](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/db.ts#L81) |
| [SQL19 Row locks with FOR UPDATE](#sql19) | Lock the rows examined by dispatch/completion during their transaction. | Operational | [database/02_advanced.sql:72](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L72) |
| [SQL20 Database roles GRANT REVOKE and function permissions](#sql20) | Restrict SQL actions separately from the front-end controls and service role checks. | Operational | [database/02_advanced.sql:4](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L4) |
| [SQL21 Row level security policy](#sql21) | Reject a maintenance insert attributed to someone other than the current authenticated actor. | Operational | [database/02_advanced.sql:135](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L135) |
| [APP01 Bound SQL parameters and query allowlist](#app01) | Keep submitted values separate from SQL syntax and restrict the query explorer to predefined SQL. | Operational | [lib/service.ts:82](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L82) |
| [APP02 Authentication password hashes and session storage](#app02) | Authenticate role accounts without persisting a plaintext password or raw session token. | Operational | [lib/password.ts:7](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/password.ts#L7) |
| [NO01 MongoDB database and collection creation](#no01) | Use a real document database for variable incident field updates. | Operational lazy initialization | [lib/mongo.ts:42](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L42) |
| [NO02 MongoDB collection validation](#no02) | Require valid incident/author IDs, bounded note text, tags, assessment objects and date fields even for direct document inserts. | Operational integrity enforcement | [lib/mongo.ts:6](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L6) |
| [NO03 MongoDB compound and text indexes](#no03) | Support per-incident chronological retrieval and keyword search across note text and tags. | Operational | [lib/mongo.ts:61](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L61) |
| [NO04 MongoDB CREATE insertOne](#no04) | Save a field note with server-derived author and creation/update timestamps. | Operational | [lib/mongo.ts:112](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L112) |
| [NO05 MongoDB READ find sort and limit](#no05) | Read up to 100 notes for the selected SQL incident in newest-first order. | Operational | [lib/mongo.ts:91](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L91) |
| [NO06 MongoDB UPDATE updateOne and $set](#no06) | Edit note text/tags/assessment while retaining its author, creation date and incident link. | Operational | [lib/mongo.ts:139](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L139) |
| [NO07 MongoDB DELETE deleteOne](#no07) | Delete only an authorized field note selected by ObjectId. | Operational | [lib/mongo.ts:148](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L148) |
| [NO08 Full text search with $text](#no08) | Search selected-incident note text and tags using MongoDB’s text index. | Operational | [lib/mongo.ts:95](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L95) |
| [NO09 MongoDB aggregation pipeline](#no09) | Count field-note tag occurrences for the selected incident. | Operational | [lib/mongo.ts:101](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L101) |
| [NO10 Cross database references and note ownership](#no10) | Validate SQL incident existence/assignment scope before MongoDB writes and enforce author/coordinator edit rights. | Operational service validation | [lib/service.ts:203](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L203) |
| [OPS01 Database outage failure handling](#ops01) | Return an explicit failed/unconfirmed note operation while keeping independent SQL functionality available. | Operational + isolated outage test | [lib/mongo.ts:78](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L78) |
| [VEC01 Learned sentence embeddings](#vec01) | Encode incident descriptions and questions as normalized 384-dimensional vectors using the same pinned local MiniLM model. | Operational incident search | [lib/embeddings.ts:14](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/embeddings.ts#L14) |
| [VEC02 pgvector cosine distance and HNSW index](#vec02) | Retrieve semantically related past incidents using a database-native nearest-neighbour query. | Operational incident search | [database/07_vector_search.sql:2](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/07_vector_search.sql#L2) |
| [VEC03 Embedding invalidation and incremental indexing](#vec03) | Prevent a description edit from leaving a searchable embedding for old text, while keeping incident reporting independent of the model. | Operational derived-index maintenance | [database/07_vector_search.sql:12](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/07_vector_search.sql#L12) |

## Detailed code paths and demonstrations

<a id="sql01"></a>
### SQL01 DDL tables primary keys foreign keys and CHECK constraints

**Purpose:** Define the 17 operational relations and reject invalid IDs, references, coordinates, counts and costs.
**Used in:** Setup + enforced during operations
**Suggested presenter:** Sachin

**Open the code in this order:**

- [database/00_schema.sql:45](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/00_schema.sql#L45) — search `CREATE TABLE emergencies (`
- [database/00_schema.sql:66](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/00_schema.sql#L66) — search `CONSTRAINT ck_people_affected`
- [database/02_advanced.sql:10](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L10) — search `ALTER TABLE users ADD CONSTRAINT uq_users_email`
- [lib/db.ts:18](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/db.ts#L18) — search `export async function getDb()`

**Demonstrate:** Open the table DDL and its named constraints. Show the failing-key/FK/CHECK test in tests/integration.test.ts. SQL enforces these rules even if the UI is bypassed.

**Say:** “DDL defines structure. Primary keys identify rows; foreign keys require referenced rows; CHECK and uniqueness rules reject inconsistent values.”

<a id="sql02"></a>
### SQL02 Composite keys and multivalued attribute mapping

**Purpose:** Store responder skills and resource tags as separate rows and prevent duplicate values per owner.
**Used in:** Operational
**Suggested presenter:** Sachin

**Open the code in this order:**

- [database/00_schema.sql:235](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/00_schema.sql#L235) — search `CREATE TABLE responder_skills (`
- [database/00_schema.sql:244](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/00_schema.sql#L244) — search `CREATE TABLE resource_tags (`
- [tests/resource-tags.test.ts:64](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/tests/resource-tags.test.ts#L64) — search `Duplicate missing invalid and unknown resource tags fail explicitly`

**Demonstrate:** Show PRIMARY KEY(responder_id,skill) and PRIMARY KEY(resource_id,tag). Try adding an existing tag through Resources; the database rejects the duplicate.

**Say:** “A composite key is the combination of its columns. The same tag can belong to different resources, but it cannot be duplicated for one resource.”

<a id="sql03"></a>
### SQL03 CREATE ALTER and DROP lifecycle

**Purpose:** Demonstrate changing and removing structure without dropping operational tables.
**Used in:** Isolated demonstration
**Suggested presenter:** Sachin

**Open the code in this order:**

- [database/06_ddl_demo.sql:3](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/06_ddl_demo.sql#L3) — search `CREATE TEMPORARY TABLE`
- [database/06_ddl_demo.sql:7](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/06_ddl_demo.sql#L7) — search `ALTER TABLE crisislink_ddl_example`
- [database/06_ddl_demo.sql:11](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/06_ddl_demo.sql#L11) — search `DROP TABLE crisislink_ddl_example`
- [tests/ddl.test.ts:5](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/tests/ddl.test.ts#L5) — search `CREATE ALTER and DROP operate only`

**Demonstrate:** Open database/06_ddl_demo.sql and run pnpm test. The temporary object receives a column, returns its example row and is dropped. This script is a classroom/test demonstration, not an app startup migration.

**Say:** “CREATE makes an object, ALTER changes its definition, and DROP removes the object itself.”

<a id="sql04"></a>
### SQL04 Seed INSERT commands

**Purpose:** Populate the relational model with 63 fictional domain records in parent-before-child order.
**Used in:** First setup
**Suggested presenter:** Sachin

**Open the code in this order:**

- [database/01_seed.sql:3](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/01_seed.sql#L3) — search `INSERT INTO roles VALUES`
- [lib/db.ts:31](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/db.ts#L31) — search `for (const file of ["00_schema.sql", "01_seed.sql"])`

**Demonstrate:** Show the seed SQL and startup loader. The seed is applied only when the roles table is absent; it is not reinserted for every request. Demo password placeholders are replaced with real hashes during setup.

**Say:** “INSERT adds rows. Seed data makes the database and its relationships demonstrable without using real emergency data.”

<a id="sql05"></a>
### SQL05 SQL CRUD used by the Resources screen

**Purpose:** Add, list, rename and remove resource tags in PostgreSQL through the interface.
**Used in:** Operational
**Suggested presenter:** Sachin

**Open the code in this order:**

- [lib/service.ts:74](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L74) — search `export async function addResourceTag`
- [lib/service.ts:88](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L88) — search `export async function updateResourceTag`
- [lib/service.ts:104](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L104) — search `export async function removeResourceTag`
- [app/api/[...path]/route.ts:80](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/app/api/%5B...path%5D/route.ts#L80) — search `if (path === "resource-tags")`
- [app/page.tsx:589](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/app/page.tsx#L589) — search `className="resource-tags"`
- [database/05_resource_tag_permissions.sql:3](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/05_resource_tag_permissions.sql#L3) — search `GRANT INSERT, UPDATE, DELETE`

**Demonstrate:** Sign in as coordinator or technician. In Resources add a temporary tag, rename it, then remove it. Refresh and confirm persistence. A responder has no write controls and direct API/SQL writes are denied.

**Say:** “The form reaches the API and service, which execute bound INSERT, SELECT, UPDATE and DELETE statements on resource_tags.”

<a id="sql06"></a>
### SQL06 JOIN queries

**Purpose:** Combine incidents with type/location and assignments with resource/responder information.
**Used in:** Operational + SQL lab
**Suggested presenter:** Sachin

**Open the code in this order:**

- [lib/service.ts:16](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L16) — search ``SELECT e.emergency_id,e.type_id`
- [database/02_advanced.sql:45](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L45) — search `CREATE VIEW v_assignment_summary`
- [lib/service.ts:229](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L229) — search `  join: "SELECT e.emergency_id`
- [database/03_queries.sql:1](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/03_queries.sql#L1) — search `-- JOIN:`

**Demonstrate:** Use SQL lab > Multiple JOINs for a live result. Then show dashboard() and the assignment view: JOINs also supply the operational interface.

**Say:** “A JOIN combines related rows by matching their keys; it does not store a second copy of each related entity.”

<a id="sql07"></a>
### SQL07 GROUP BY HAVING COUNT and ORDER BY

**Purpose:** Summarize assignments per incident and retain groups having at least one assignment.
**Used in:** Live SQL lab example
**Suggested presenter:** Sachin

**Open the code in this order:**

- [lib/service.ts:238](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L238) — search `  aggregate:`
- [database/03_queries.sql:30](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/03_queries.sql#L30) — search `-- Grouping and HAVING.`
- [lib/service.ts:241](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L241) — search `export async function runQuery`

**Demonstrate:** Choose SQL lab > GROUP BY and HAVING. Open the aggregate query to show grouping and filtering after aggregation. ORDER BY is also visible in JOIN/history queries.

**Say:** “WHERE filters rows before grouping; HAVING filters grouped results; COUNT computes the size of a group.”

<a id="sql08"></a>
### SQL08 Nested scalar subquery

**Purpose:** Find incidents whose affected-person count exceeds the current overall average.
**Used in:** Live SQL lab example
**Suggested presenter:** Sachin

**Open the code in this order:**

- [lib/service.ts:230](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L230) — search `  nested:`
- [database/03_queries.sql:6](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/03_queries.sql#L6) — search `-- Nested scalar query:`

**Demonstrate:** Choose SQL lab > Nested query. On the untouched seed, 20 and 12 exceed 34/3, so incidents 101 and 103 qualify. Additional app-created data changes that average.

**Say:** “The inner AVG query returns one value; the outer query compares each incident against it.”

<a id="sql09"></a>
### SQL09 Correlated NOT EXISTS query

**Purpose:** Find incidents without active assignments; correlated capability checks also validate a dispatch.
**Used in:** Live SQL lab example + dispatch validation
**Suggested presenter:** Sachin

**Open the code in this order:**

- [lib/service.ts:232](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L232) — search `  correlated:`
- [database/03_queries.sql:10](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/03_queries.sql#L10) — search `-- Correlated query:`
- [database/02_advanced.sql:78](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L78) — search `  IF EXISTS(SELECT 1 FROM emergency_required_capabilities c`

**Demonstrate:** Choose SQL lab > Correlated NOT EXISTS. Point to a.emergency_id=e.emergency_id. Separately show the nested capability check inside dispatch_response.

**Say:** “A correlated subquery refers to the current outer row. NOT EXISTS keeps it when no matching inner row exists.”

<a id="sql10"></a>
### SQL10 CTE with ROW_NUMBER window function

**Purpose:** Return the latest recorded status event for each incident.
**Used in:** Live SQL lab example
**Suggested presenter:** Sachin

**Open the code in this order:**

- [lib/service.ts:234](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L234) — search `  cte: "WITH ranked AS`
- [database/03_queries.sql:16](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/03_queries.sql#L16) — search `WITH ranked AS (`
- [app/api/[...path]/route.ts:88](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/app/api/%5B...path%5D/route.ts#L88) — search `if (path === "queries" && method === "GET")`
- [app/page.tsx:966](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/app/page.tsx#L966) — search `SQL example`

**Demonstrate:** Choose SQL lab > CTE and window function. Explain PARTITION BY emergency_id, descending changed_at/history_id, and rn=1. This CTE is a query-explorer example; dashboard() reads history separately.

**Say:** “WITH names an intermediate result. ROW_NUMBER ranks each incident’s history, and rn=1 selects the newest event.”

<a id="sql11"></a>
### SQL11 Recursive CTE

**Purpose:** Generate a seven-day reporting calendar and retain dates with zero incidents.
**Used in:** Live SQL lab example
**Suggested presenter:** Sachin

**Open the code in this order:**

- [lib/service.ts:235](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L235) — search `  recursive:`
- [database/03_queries.sql:23](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/03_queries.sql#L23) — search `WITH RECURSIVE days(day) AS (`

**Demonstrate:** Choose SQL lab > Recursive CTE. The result has seven dates from 30 October to 5 November 2026. Show the anchor date, UNION ALL step, stopping condition and LEFT JOIN.

**Say:** “The recursive term repeatedly derives the next day until the termination condition is reached. This is a fixed demonstration interval, not a live seven-day dashboard filter.”

<a id="sql12"></a>
### SQL12 SQL view v_assignment_summary

**Purpose:** Provide reusable joined assignment/resource/responder data for the dashboard.
**Used in:** Operational + SQL lab
**Suggested presenter:** Abhinav

**Open the code in this order:**

- [database/02_advanced.sql:45](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L45) — search `CREATE VIEW v_assignment_summary AS`
- [lib/service.ts:29](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L29) — search `"SELECT * FROM v_assignment_summary ORDER BY assignment_id DESC"`
- [lib/service.ts:237](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L237) — search `  view: "SELECT * FROM v_assignment_summary`

**Demonstrate:** Open the CREATE VIEW definition, then dashboard() to show its real consumer. SQL lab > Assignment summary view displays the same view directly.

**Say:** “A normal view stores a query definition, not a separately materialized result. Our dashboard reads it as a relation.”

<a id="sql13"></a>
### SQL13 Supporting SQL indexes

**Purpose:** Support incident/status, per-incident history and assignment lookup patterns.
**Used in:** Defined in application schema
**Suggested presenter:** Abhinav

**Open the code in this order:**

- [database/02_advanced.sql:30](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L30) — search `CREATE INDEX idx_emergency_status_time`
- [database/02_advanced.sql:31](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L31) — search `CREATE INDEX idx_history_time`
- [database/02_advanced.sql:32](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L32) — search `CREATE INDEX idx_assignment_emergency`
- [docs/DATA_DICTIONARY.md:357](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/docs/DATA_DICTIONARY.md#L357) — search `## Index definitions`

**Demonstrate:** Show the three CREATE INDEX statements and the generated dictionary. Explain indexed columns/order. The optimizer chooses a plan; small seed data may still use a sequential scan. No speed-up benchmark is claimed.

**Say:** “Indexes can help suitable lookups and sorting, but consume storage and add write maintenance.”

<a id="sql14"></a>
### SQL14 Partial unique indexes

**Purpose:** Prevent the same resource or responder from having two active/dispatched assignments while retaining historical completed assignments.
**Used in:** Operational integrity enforcement
**Suggested presenter:** Abhinav

**Open the code in this order:**

- [database/02_advanced.sql:26](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L26) — search `CREATE UNIQUE INDEX uq_active_resource`
- [database/02_advanced.sql:28](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L28) — search `CREATE UNIQUE INDEX uq_active_responder`
- [tests/integration.test.ts:267](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/tests/integration.test.ts#L267) — search `Conflicting dispatch is rejected with no partial assignment`

**Demonstrate:** Show the WHERE status IN (active,dispatched) predicates. The conflicting-dispatch test demonstrates rejection; the index also independently enforces uniqueness for direct SQL writes.

**Say:** “Uniqueness applies only to rows matching the partial-index predicate, so past completed responses do not block future allocation.”

<a id="sql15"></a>
### SQL15 Stored SQL function dispatch_response

**Purpose:** Validate and reserve an incident response atomically, including capability coverage.
**Used in:** Operational
**Suggested presenter:** Abhinav

**Open the code in this order:**

- [database/02_advanced.sql:68](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L68) — search `CREATE FUNCTION dispatch_response(`
- [lib/service.ts:143](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L143) — search `export async function dispatch(`
- [app/api/[...path]/route.ts:74](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/app/api/%5B...path%5D/route.ts#L74) — search `if (path === "dispatch" && method === "POST")`
- [app/page.tsx:548](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/app/page.tsx#L548) — search `Dispatch team →`

**Demonstrate:** As coordinator create a Medical incident requiring Medical support; dispatch Demo Ambulance and EMP-M01 if available. Show the SELECT dispatch_response call and resulting assignment/resource/responder/history changes.

**Say:** “This PostgreSQL function locks and validates the selected records, creates the assignment and updates related states together. It is invoked using SELECT, not CALL.”

<a id="sql16"></a>
### SQL16 Stored SQL function finish_response

**Purpose:** Create an assignment-linked report, release the resource/responder, and resolve the incident when no active response remains.
**Used in:** Operational
**Suggested presenter:** Abhinav

**Open the code in this order:**

- [database/02_advanced.sql:94](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L94) — search `CREATE FUNCTION finish_response(`
- [lib/service.ts:164](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L164) — search `export async function complete(`
- [app/api/[...path]/route.ts:76](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/app/api/%5B...path%5D/route.ts#L76) — search `if (path === "complete" && method === "POST")`
- [app/page.tsx:488](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/app/page.tsx#L488) — search `Complete response`

**Demonstrate:** Sign in as the assigned responder (medic for EMP-M01) or coordinator, select the incident and complete the response. Show ownership validation, report INSERT and release UPDATEs. Another responder is rejected.

**Say:** “The stored function validates ownership and commits related completion changes as one transaction.”

<a id="sql17"></a>
### SQL17 Automatic incident-history trigger

**Purpose:** Write status history automatically when an incident is created or its status actually changes.
**Used in:** Operational
**Suggested presenter:** Sachin

**Open the code in this order:**

- [database/02_advanced.sql:55](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L55) — search `CREATE FUNCTION record_emergency_status()`
- [database/02_advanced.sql:65](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L65) — search `CREATE TRIGGER trg_emergency_status`
- [lib/service.ts:118](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L118) — search `export async function createIncident(`
- [tests/integration.test.ts:181](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/tests/integration.test.ts#L181) — search `Creating an incident generates exactly one audit event`
- [tests/integration.test.ts:287](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/tests/integration.test.ts#L287) — search `Unchanged status does not generate duplicate audit records`

**Demonstrate:** Create an incident, then dispatch and complete it. The timeline gains reported/responding/resolved entries. Show the trigger definition and its NEW/OLD status comparison. TypeScript does not call the trigger function explicitly.

**Say:** “The database fires the AFTER INSERT/UPDATE trigger automatically. Its history row belongs to the same transaction and disappears if that transaction rolls back.”

<a id="sql18"></a>
### SQL18 Transactions COMMIT and ROLLBACK

**Purpose:** Keep incident/requirements, dispatch reservations, reports/releases and their audit entries consistent.
**Used in:** Operational + isolated demonstration
**Suggested presenter:** Both

**Open the code in this order:**

- [lib/db.ts:81](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/db.ts#L81) — search `export async function asActor<T>(`
- [lib/service.ts:118](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L118) — search `export async function createIncident(`
- [database/03_queries.sql:35](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/03_queries.sql#L35) — search `-- Rollback-safe DML example`
- [tests/integration.test.ts:203](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/tests/integration.test.ts#L203) — search `Failed requirement insert rolls back incident and audit together`

**Demonstrate:** Show asActor() wrapping the service callback in db.transaction(). Show the invalid-capability test: both incident and trigger audit row roll back. The tag demo ends with explicit ROLLBACK. The transaction wrapper commits successful callbacks and rolls back thrown errors.

**Say:** “A transaction groups related SQL changes so a failure leaves no partial operation. It does not make MongoDB and SQL one distributed transaction.”

<a id="sql19"></a>
### SQL19 Row locks with FOR UPDATE

**Purpose:** Lock the rows examined by dispatch/completion during their transaction.
**Used in:** Operational
**Suggested presenter:** Abhinav

**Open the code in this order:**

- [database/02_advanced.sql:72](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L72) — search `SELECT * INTO e FROM emergencies`
- [database/02_advanced.sql:74](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L74) — search `SELECT * INTO r FROM resources`
- [database/02_advanced.sql:76](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L76) — search `SELECT * INTO p FROM responders`
- [database/02_advanced.sql:98](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L98) — search `SELECT * INTO a FROM assignments`

**Demonstrate:** Open the SELECT ... FOR UPDATE statements in both stored functions. Explain their relationship to the surrounding transaction and unique active-allocation indexes. This local deployment uses one PGlite app process; it is not a multi-server load test.

**Say:** “FOR UPDATE holds row locks until transaction end, helping keep availability checks and state changes consistent.”

<a id="sql20"></a>
### SQL20 Database roles GRANT REVOKE and function permissions

**Purpose:** Restrict SQL actions separately from the front-end controls and service role checks.
**Used in:** Operational
**Suggested presenter:** Abhinav

**Open the code in this order:**

- [database/02_advanced.sql:4](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L4) — search `CREATE ROLE crisis_coordinator`
- [database/02_advanced.sql:129](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L129) — search `REVOKE EXECUTE ON ALL FUNCTIONS`
- [database/02_advanced.sql:131](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L131) — search `GRANT EXECUTE ON FUNCTION dispatch_response`
- [lib/db.ts:90](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/db.ts#L90) — search `await tx.exec(`SET LOCAL ROLE`
- [database/05_resource_tag_permissions.sql:3](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/05_resource_tag_permissions.sql#L3) — search `GRANT INSERT, UPDATE, DELETE`

**Demonstrate:** Show the three NOLOGIN roles and their grants. Then show asActor() selecting only a server-defined role after authentication. The integration/tag tests directly attempt forbidden SQL writes, independently of the UI.

**Say:** “These are group roles chosen by a trusted backend transaction, not individual database login accounts. Restricted function execution and table grants enforce database permissions.”

<a id="sql21"></a>
### SQL21 Row level security policy

**Purpose:** Reject a maintenance insert attributed to someone other than the current authenticated actor.
**Used in:** Operational
**Suggested presenter:** Sachin

**Open the code in this order:**

- [database/02_advanced.sql:135](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L135) — search `ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY`
- [database/02_advanced.sql:138](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L138) — search `CREATE POLICY maintenance_author`
- [database/02_advanced.sql:51](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L51) — search `CREATE FUNCTION app_actor()`
- [tests/integration.test.ts:419](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/tests/integration.test.ts#L419) — search `Database role grants and RLS enforce maintenance author identity`

**Demonstrate:** Show WITH CHECK(performed_by=app_actor()). The test inserts as a technician with another author ID and expects failure. The API also supplies the author from the session.

**Say:** “GRANT controls which operations a role may attempt; RLS adds a row-level condition to those operations.”

<a id="app01"></a>
### APP01 Bound SQL parameters and query allowlist

**Purpose:** Keep submitted values separate from SQL syntax and restrict the query explorer to predefined SQL.
**Used in:** Operational
**Suggested presenter:** Both

**Open the code in this order:**

- [lib/service.ts:82](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L82) — search `"INSERT INTO resource_tags(resource_id,tag) VALUES($1,$2)`
- [lib/service.ts:241](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L241) — search `export async function runQuery(`
- [app/api/[...path]/route.ts:57](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/app/api/%5B...path%5D/route.ts#L57) — search `const actor = await authenticate(token);`

**Demonstrate:** Show a $1/$2 parameterized query and its values array, then the labQueries key check. There is no endpoint that executes arbitrary user-entered SQL.

**Say:** “The service passes values separately from the SQL statement. An allowlist chooses the statement itself.”

<a id="app02"></a>
### APP02 Authentication password hashes and session storage

**Purpose:** Authenticate role accounts without persisting a plaintext password or raw session token.
**Used in:** Operational
**Suggested presenter:** Abhinav

**Open the code in this order:**

- [lib/password.ts:7](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/password.ts#L7) — search `export function hashPassword(`
- [lib/auth.ts:13](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/auth.ts#L13) — search `export async function login(`
- [lib/auth.ts:45](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/auth.ts#L45) — search `export async function authenticate(`
- [scripts/setup.ts:17](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/scripts/setup.ts#L17) — search `const db = await getDb();`
- [app/api/[...path]/route.ts:47](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/app/api/%5B...path%5D/route.ts#L47) — search `res.cookies.set("crisis_session"`

**Demonstrate:** Show scrypt plus random salts, SHA-256 token hashing, the session expiry query and HttpOnly/SameSite cookie. Secure setup uses hidden terminal input. These TypeScript helpers are application functions, not stored SQL routines.

**Say:** “Passwords are verified against salted hashes; the browser has a random cookie token while SQL stores only its hash.”

<a id="no01"></a>
### NO01 MongoDB database and collection creation

**Purpose:** Use a real document database for variable incident field updates.
**Used in:** Operational lazy initialization
**Suggested presenter:** Abhinav

**Open the code in this order:**

- [lib/mongo.ts:42](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L42) — search `export async function mongo()`
- [lib/mongo.ts:52](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L52) — search `await db.createCollection("field_notes"`
- [database/04_mongo_commands.js:4](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/04_mongo_commands.js#L4) — search `db.createCollection('field_notes'`

**Demonstrate:** Open mongo() to show the real MongoClient connection and collection creation. The application initializes the collection on first note access; the mongosh file is a separate fresh-database demonstration.

**Say:** “MongoDB holds incident-linked field-note documents; PostgreSQL holds structured operational relationships.”

<a id="no02"></a>
### NO02 MongoDB collection validation

**Purpose:** Require valid incident/author IDs, bounded note text, tags, assessment objects and date fields even for direct document inserts.
**Used in:** Operational integrity enforcement
**Suggested presenter:** Abhinav

**Open the code in this order:**

- [lib/mongo.ts:6](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L6) — search `export const noteValidator`
- [lib/mongo.ts:54](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L54) — search `validationAction: "error"`
- [tests/integration.test.ts:375](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/tests/integration.test.ts#L375) — search `MongoDB collection validator rejects malformed direct inserts`

**Demonstrate:** Show $jsonSchema required/properties and validationAction:error. The integration test writes an incomplete document directly and confirms MongoDB rejects it, independently of Zod.

**Say:** “API validation checks requests, while collection validation protects the stored document shape at the database level.”

<a id="no03"></a>
### NO03 MongoDB compound and text indexes

**Purpose:** Support per-incident chronological retrieval and keyword search across note text and tags.
**Used in:** Operational
**Suggested presenter:** Abhinav

**Open the code in this order:**

- [lib/mongo.ts:61](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L61) — search `.createIndex({ emergency_id: 1, created_at: -1 })`
- [lib/mongo.ts:64](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L64) — search `.createIndex({ text: "text", tags: "text" })`

**Demonstrate:** Show both createIndex calls and their matching find/sort/$text queries. Explain column order and the separate text index. Do not claim a measured speed-up from the small demo dataset.

**Say:** “The compound index organizes incident/time access; the text index enables $text keyword retrieval.”

<a id="no04"></a>
### NO04 MongoDB CREATE insertOne

**Purpose:** Save a field note with server-derived author and creation/update timestamps.
**Used in:** Operational
**Suggested presenter:** Abhinav

**Open the code in this order:**

- [lib/mongo.ts:112](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L112) — search `export async function createNote(`
- [app/api/[...path]/route.ts:106](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/app/api/%5B...path%5D/route.ts#L106) — search `if (path === "notes" && method === "POST")`
- [app/page.tsx:937](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/app/page.tsx#L937) — search `Save field note`

**Demonstrate:** In Field notes select an incident and save a text update with two tags and an optional assessment. The API returns the inserted ObjectId and the saved note appears after refresh.

**Say:** “insertOne creates a document. The server obtains author_id from the authenticated session rather than trusting an author supplied by the browser.”

<a id="no05"></a>
### NO05 MongoDB READ find sort and limit

**Purpose:** Read up to 100 notes for the selected SQL incident in newest-first order.
**Used in:** Operational
**Suggested presenter:** Abhinav

**Open the code in this order:**

- [lib/mongo.ts:91](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L91) — search `export async function listNotes(`
- [lib/mongo.ts:97](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L97) — search `.find(filter)`
- [app/api/[...path]/route.ts:92](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/app/api/%5B...path%5D/route.ts#L92) — search `if (path === "notes" && method === "GET")`

**Demonstrate:** Select another incident in Field notes. Show the emergency_id filter, created_at sort and limit(100). Results are incident-specific, not a dump of the whole collection.

**Say:** “find selects matching documents, sort orders them and limit bounds the response.”

<a id="no06"></a>
### NO06 MongoDB UPDATE updateOne and $set

**Purpose:** Edit note text/tags/assessment while retaining its author, creation date and incident link.
**Used in:** Operational
**Suggested presenter:** Abhinav

**Open the code in this order:**

- [lib/mongo.ts:139](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L139) — search `export async function updateNote(`
- [lib/mongo.ts:141](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L141) — search `const d = noteInput.omit({ emergency_id: true })`
- [lib/mongo.ts:144](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L144) — search `{ $set: { ...d, updated_at: new Date() } }`

**Demonstrate:** Use Edit note as its author or coordinator, save changes and refresh. Show ownedNote() and the editable-field schema before updateOne. The incident ID is not an editable field.

**Say:** “$set changes selected fields instead of replacing the entire document. Ownership is checked before the update.”

<a id="no07"></a>
### NO07 MongoDB DELETE deleteOne

**Purpose:** Delete only an authorized field note selected by ObjectId.
**Used in:** Operational
**Suggested presenter:** Abhinav

**Open the code in this order:**

- [lib/mongo.ts:148](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L148) — search `export async function deleteNote(`
- [lib/mongo.ts:150](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L150) — search `await col.deleteOne({ _id: note._id })`
- [app/page.tsx:863](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/app/page.tsx#L863) — search `Delete note`

**Demonstrate:** Create a disposable note and delete it using Delete note. Confirm it disappears after reload. A different responder cannot delete a note they do not own.

**Say:** “deleteOne removes the matching document after the shared ownership/reference checks.”

<a id="no08"></a>
### NO08 Full text search with $text

**Purpose:** Search selected-incident note text and tags using MongoDB’s text index.
**Used in:** Operational
**Suggested presenter:** Abhinav

**Open the code in this order:**

- [lib/mongo.ts:95](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L95) — search `filter.$text = { $search: search.slice(0, 100) }`
- [app/page.tsx:807](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/app/page.tsx#L807) — search `aria-label="Search notes"`

**Demonstrate:** Save a note containing a distinctive word such as evacuation, then search it in Field notes. Show the incident filter plus $text query and the text-index definition.

**Say:** “This is indexed keyword search, not vector similarity or semantic embeddings.”

<a id="no09"></a>
### NO09 MongoDB aggregation pipeline

**Purpose:** Count field-note tag occurrences for the selected incident.
**Used in:** Operational
**Suggested presenter:** Abhinav

**Open the code in this order:**

- [lib/mongo.ts:101](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L101) — search `const summary = await col`
- [lib/mongo.ts:104](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L104) — search `{ $unwind: "$tags" }`
- [lib/mongo.ts:105](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L105) — search `{ $group: { _id: "$tags", count: { $sum: 1 } } }`
- [app/page.tsx:814](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/app/page.tsx#L814) — search `className="tag-summary"`

**Demonstrate:** Add a note tagged medical and safety. Each tag’s count increases by one. Show $match, $unwind, $group, $sort and $limit, then the tag-summary display.

**Say:** “The pipeline selects one incident, turns each array tag into a row-like item and groups those items to count occurrences.”

<a id="no10"></a>
### NO10 Cross database references and note ownership

**Purpose:** Validate SQL incident existence/assignment scope before MongoDB writes and enforce author/coordinator edit rights.
**Used in:** Operational service validation
**Suggested presenter:** Both

**Open the code in this order:**

- [lib/service.ts:203](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L203) — search `export async function ensureIncident(`
- [lib/mongo.ts:126](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L126) — search `async function ownedNote(`
- [tests/integration.test.ts:340](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/tests/integration.test.ts#L340) — search `NoSQL validates SQL references assignment scope and ownership`

**Demonstrate:** Show ensureIncident() and ownedNote(). Tests reject an unknown SQL incident, an unassigned responder and another author’s edit. SQL foreign keys do not reach into MongoDB.

**Say:** “The API maintains these cross-database references. There is no distributed foreign key or shared SQL/MongoDB transaction.”

<a id="ops01"></a>
### OPS01 Database outage failure handling

**Purpose:** Return an explicit failed/unconfirmed note operation while keeping independent SQL functionality available.
**Used in:** Operational + isolated outage test
**Suggested presenter:** Abhinav

**Open the code in this order:**

- [lib/mongo.ts:78](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L78) — search `"MongoDB is unavailable. The note was not saved;`
- [app/api/[...path]/route.ts:131](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/app/api/%5B...path%5D/route.ts#L131) — search `/Mongo(Network|ServerSelection|TopologyClosed|NotConnected)/`
- [scripts/offline-smoke.mjs:9](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/scripts/offline-smoke.mjs#L9) — search `const child = spawn(`

**Demonstrate:** Open the isolated offline test and docs/verification/offline.json. It starts a separate app with an unavailable MongoDB URI and expects HTTP 503 for a note write and HTTP 200 for the SQL dashboard. No need to stop the live demo database.

**Say:** “A MongoDB failure is shown as a failure, not a successful save. SQL and MongoDB remain independent services.”

<a id="vec01"></a>
### VEC01 Learned sentence embeddings

**Purpose:** Encode incident descriptions and questions as normalized 384-dimensional vectors using the same pinned local MiniLM model.
**Used in:** Operational incident search
**Suggested presenter:** Abhinav

**Open the code in this order:**

- [lib/embeddings.ts:14](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/embeddings.ts#L14) — search `export async function embedText(`
- [lib/embeddings.ts:6](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/embeddings.ts#L6) — search `export const EMBEDDING_REVISION`
- [lib/semantic.ts:7](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/semantic.ts#L7) — search `export async function indexIncidents(`

**Demonstrate:** Run pnpm vector:setup once. In Incidents search A warehouse is burning. Show the model identity and 384 dimensions in the API result. We use real model inference, not manual vectors or keyword substitutions.

**Say:** “The model turns sentences into numeric representations. Identical model and preprocessing are required for document and query vectors.”

<a id="vec02"></a>
### VEC02 pgvector cosine distance and HNSW index

**Purpose:** Retrieve semantically related past incidents using a database-native nearest-neighbour query.
**Used in:** Operational incident search
**Suggested presenter:** Abhinav

**Open the code in this order:**

- [database/07_vector_search.sql:2](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/07_vector_search.sql#L2) — search `CREATE EXTENSION IF NOT EXISTS vector`
- [database/07_vector_search.sql:8](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/07_vector_search.sql#L8) — search `ON emergencies USING hnsw`
- [lib/semantic.ts:25](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/semantic.ts#L25) — search `export const SEMANTIC_SQL`
- [app/api/[...path]/route.ts:67](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/app/api/%5B...path%5D/route.ts#L67) — search `if (path === "incidents/search"`
- [app/page.tsx:294](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/app/page.tsx#L294) — search `Find similar incidents`

**Demonstrate:** Search People trapped by rising water and inspect ranked incidents. Show embedding <=> query, ORDER BY distance and LIMIT. Smaller distance is closer; the score is not probability. Small tables may use a sequential scan.

**Say:** “This implements the course PostgreSQL vector lesson within our existing architecture. MongoDB notes still use keyword search.”

<a id="vec03"></a>
### VEC03 Embedding invalidation and incremental indexing

**Purpose:** Prevent a description edit from leaving a searchable embedding for old text, while keeping incident reporting independent of the model.
**Used in:** Operational derived-index maintenance
**Suggested presenter:** Sachin

**Open the code in this order:**

- [database/07_vector_search.sql:12](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/07_vector_search.sql#L12) — search `CREATE OR REPLACE FUNCTION invalidate_incident_embedding()`
- [database/07_vector_search.sql:25](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/07_vector_search.sql#L25) — search `CREATE TRIGGER trg_invalidate_incident_embedding`
- [lib/semantic.ts:17](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/semantic.ts#L17) — search `WHERE emergency_id=$3 AND description=$4`
- [tests/semantic.test.ts:52](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/tests/semantic.test.ts#L52) — search `Description edits invalidate old vectors`

**Demonstrate:** Show the BEFORE description-update trigger. It clears vectors only for changed descriptions; the next search recomputes them. Inference happens outside transactions and updates compare source text to avoid stale writes.

**Say:** “Embeddings are a derived search representation. Invalidating and regenerating them keeps search consistent with the source incident.”

## Function inventory

Only the five entries labelled stored SQL/trigger function reside in PostgreSQL. The other named functions are TypeScript helpers that call SQL, MongoDB, model or crypto APIs.

| Function | Kind | What it implements | Code |
|---|---|---|---|
| `invalidate_incident_embedding` | Stored trigger function | Invalidate a stale incident vector when its description changes. | [database/07_vector_search.sql:12](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/07_vector_search.sql#L12) |
| `embedText` | Application vector-search helper | Generate real locally cached MiniLM sentence embeddings. | [lib/embeddings.ts:14](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/embeddings.ts#L14) |
| `vectorLiteral` | Application vector-search helper | Validate dimensions/finiteness and serialize a bound vector value. | [lib/embeddings.ts:38](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/embeddings.ts#L38) |
| `indexIncidents` | Application vector-search helper | Incrementally maintain incident embeddings with conditional writes. | [lib/semantic.ts:7](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/semantic.ts#L7) |
| `searchIncidents` | Application vector-search helper | Run authenticated PostgreSQL cosine nearest-neighbour search. | [lib/semantic.ts:33](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/semantic.ts#L33) |
| `app_actor` | Stored SQL function | Read the transaction actor ID used by audit and row policies. | [database/02_advanced.sql:51](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L51) |
| `record_emergency_status` | Stored trigger function | Insert a history event after incident INSERT or an actual status change. | [database/02_advanced.sql:55](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L55) |
| `dispatch_response` | Stored SQL function | Validate lock reserve and dispatch a response. | [database/02_advanced.sql:68](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L68) |
| `finish_response` | Stored SQL function | Validate ownership create report release team and resolve when appropriate. | [database/02_advanced.sql:94](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/database/02_advanced.sql#L94) |
| `getDb` | Application function using SQL | Initialize/open persisted PostgreSQL and load the schema/seed/extensions. | [lib/db.ts:18](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/db.ts#L18) |
| `asActor` | Application function using SQL | Run an authenticated actor callback with a transaction-local SQL role. | [lib/db.ts:81](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/db.ts#L81) |
| `dashboard` | Application function using SQL | Read incident/resource/assignment/history/reference records and SQL tags. | [lib/service.ts:12](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L12) |
| `addResourceTag` | Application function using SQL | Insert one SQL resource tag. | [lib/service.ts:74](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L74) |
| `updateResourceTag` | Application function using SQL | Rename one SQL resource tag. | [lib/service.ts:88](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L88) |
| `removeResourceTag` | Application function using SQL | Delete one SQL resource tag. | [lib/service.ts:104](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L104) |
| `createIncident` | Application function using SQL | Insert incident and required capability together. | [lib/service.ts:118](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L118) |
| `dispatch` | Application function using SQL | Invoke stored dispatch_response. | [lib/service.ts:143](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L143) |
| `complete` | Application function using SQL | Invoke stored finish_response. | [lib/service.ts:164](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L164) |
| `maintenance` | Application function using SQL | Insert an authored maintenance record. | [lib/service.ts:183](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L183) |
| `ensureIncident` | Application function using SQL | Check SQL incident existence and assignment scope for notes. | [lib/service.ts:203](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L203) |
| `runQuery` | Application function using SQL | Execute an allowlisted live SQL example. | [lib/service.ts:241](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/service.ts#L241) |
| `mongo` | Application function using MongoDB | Connect to real MongoDB and initialize validated/indexed field_notes. | [lib/mongo.ts:42](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L42) |
| `listNotes` | Application function using MongoDB | Read/search notes and aggregate tag counts. | [lib/mongo.ts:91](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L91) |
| `createNote` | Application function using MongoDB | Validate SQL scope and insert a note document. | [lib/mongo.ts:112](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L112) |
| `ownedNote` | Application function using MongoDB | Read the target note and validate modification rights. | [lib/mongo.ts:126](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L126) |
| `updateNote` | Application function using MongoDB | Update allowed document fields and timestamp. | [lib/mongo.ts:139](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L139) |
| `deleteNote` | Application function using MongoDB | Delete an authorized note document. | [lib/mongo.ts:148](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/mongo.ts#L148) |
| `login` | Application security function | Verify password throttle failures and create a hashed-token SQL session. | [lib/auth.ts:13](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/auth.ts#L13) |
| `authenticate` | Application security function | Resolve a valid SQL session into an actor. | [lib/auth.ts:45](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/auth.ts#L45) |
| `logout` | Application security function | Delete the SQL session token hash. | [lib/auth.ts:55](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/auth.ts#L55) |
| `requireRole` | Application security function | Reject an action when the actor has an unsuitable application role. | [lib/auth.ts:61](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/auth.ts#L61) |
| `hashPassword` | Application crypto helper | Create an independently salted scrypt hash. | [lib/password.ts:7](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/password.ts#L7) |
| `verifyPassword` | Application crypto helper | Check a submitted password with timing-safe hash comparison. | [lib/password.ts:11](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/password.ts#L11) |
| `tokenHash` | Application crypto helper | SHA-256 hash a random session token before storing it. | [lib/password.ts:24](https://github.com/abhinavk0006/crisislink/blob/1419edf1007672c14bb47e19d277d32378210768/lib/password.ts#L24) |

## A practical 8 minute demonstration

1. Coordinator: create a Medical incident at Demo Campus requiring Medical support. Show the trigger-created reported event.
2. Dispatch the available Demo Ambulance and EMP-M01. Show assignment creation and resource/responder status changes. Availability must match the current database state.
3. Show the assignment view definition and dashboard caller. Explain the transaction, FOR UPDATE locks and partial unique indexes.
4. Assigned medic: complete the response. Show the stored function, report, released resource and final history.
5. Coordinator/technician: add, rename and remove a disposable resource tag to demonstrate SQL CRUD.
6. Field notes: create a disposable update, search its distinctive word, show tag counts, edit and delete it. Point to MongoDB insertOne/find/updateOne/deleteOne and aggregate.
7. SQL lab: run CTE/window, recursive, JOIN and correlated examples. State which features are explorer demonstrations.
8. Show recorded tests for invalid references, unauthorized roles, rollback, duplicate audit prevention and MongoDB outage. Both teammates explain their assigned module and one reviewed module.

## Useful test and setup files

- README.md — installation, pnpm setup, MongoDB launcher and app startup.
- tests/integration.test.ts — SQL/MongoDB integrity, trigger, stored function, transaction and role checks.
- tests/resource-tags.test.ts — resource-tag SQL CRUD, duplicates and direct permission denial.
- tests/ddl.test.ts — isolated CREATE/ALTER/DROP lifecycle.
- tests/security-bootstrap.test.ts and tests/setup.test.ts — password persistence and secure setup/reset.
- scripts/http-smoke.mjs — running API checks; requests the current password with hidden input.
- scripts/offline-smoke.mjs — isolated MongoDB outage check.
- docs/verification/ — saved execution evidence. Prior results are evidence of those runs, not a guarantee that future modified code has been tested.

The ZIP contains the complete source, SQL/NoSQL examples, seed, report, diagrams, screenshots, this guide and Git history bundle. Dependencies, runtime database directories and real secrets are intentionally excluded; install/run using README.md.
