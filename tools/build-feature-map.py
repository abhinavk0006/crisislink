"""Build a verified teacher/viva map and offline line-numbered source viewers."""
from pathlib import Path
from html import escape
from html.parser import HTMLParser
from urllib.parse import quote, unquote
import hashlib, json, subprocess

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs'
VIEWERS = DOCS / 'code-map'
VIEWERS.mkdir(exist_ok=True)
GIT = r'C:\Program Files\WindowsApps\OpenAI.CodexPrimaryRuntime.v26-1112-737-0_26.1112.737.0_x64__3k8sg7r9htsxt\dependencies\native\git\cmd\git.exe'
if not Path(GIT).exists(): GIT='git'
REV = subprocess.check_output([GIT,'rev-parse','HEAD'],cwd=ROOT,text=True).strip()
REPO = 'https://github.com/abhinavk0006/crisislink'
files = {}

def ref(path, needle, label=None):
    lines=(ROOT/path).read_text(encoding='utf-8-sig').splitlines()
    matches=[i+1 for i,line in enumerate(lines) if needle in line]
    if len(matches)!=1: raise ValueError(f'Expected one marker in {path}: {needle!r}; found {matches}')
    files[path]=lines
    return dict(path=path,line=matches[0],needle=needle,label=label or needle)

def f(id,title,category,usage,purpose,refs,demo,say,owner='Both'):
    return dict(id=id,title=title,category=category,usage=usage,purpose=purpose,refs=refs,demo=demo,say=say,presenter=owner)

ADV='database/02_advanced.sql';S='lib/service.ts';M='lib/mongo.ts';DB='lib/db.ts';API='app/api/[...path]/route.ts';UI='app/page.tsx';Q='database/03_queries.sql';T='tests/integration.test.ts'
features=[
f('SQL01','DDL tables primary keys foreign keys and CHECK constraints','SQL','Setup + enforced during operations',
 'Define the 17 operational relations and reject invalid IDs, references, coordinates, counts and costs.',
 [ref('database/00_schema.sql','CREATE TABLE emergencies ('),ref('database/00_schema.sql','CONSTRAINT ck_people_affected'),ref(ADV,'ALTER TABLE users ADD CONSTRAINT uq_users_email'),ref(DB,'export async function getDb()')],
 'Open the table DDL and its named constraints. Show the failing-key/FK/CHECK test in tests/integration.test.ts. SQL enforces these rules even if the UI is bypassed.',
 'DDL defines structure. Primary keys identify rows; foreign keys require referenced rows; CHECK and uniqueness rules reject inconsistent values.','Sachin'),
f('SQL02','Composite keys and multivalued attribute mapping','SQL','Operational',
 'Store responder skills and resource tags as separate rows and prevent duplicate values per owner.',
 [ref('database/00_schema.sql','CREATE TABLE responder_skills ('),ref('database/00_schema.sql','CREATE TABLE resource_tags ('),ref('tests/resource-tags.test.ts','Duplicate missing invalid and unknown resource tags fail explicitly')],
 'Show PRIMARY KEY(responder_id,skill) and PRIMARY KEY(resource_id,tag). Try adding an existing tag through Resources; the database rejects the duplicate.',
 'A composite key is the combination of its columns. The same tag can belong to different resources, but it cannot be duplicated for one resource.','Sachin'),
f('SQL03','CREATE ALTER and DROP lifecycle','SQL','Isolated demonstration',
 'Demonstrate changing and removing structure without dropping operational tables.',
 [ref('database/06_ddl_demo.sql','CREATE TEMPORARY TABLE'),ref('database/06_ddl_demo.sql','ALTER TABLE crisislink_ddl_example'),ref('database/06_ddl_demo.sql','DROP TABLE crisislink_ddl_example'),ref('tests/ddl.test.ts','CREATE ALTER and DROP operate only')],
 'Open database/06_ddl_demo.sql and run pnpm test. The temporary object receives a column, returns its example row and is dropped. This script is a classroom/test demonstration, not an app startup migration.',
 'CREATE makes an object, ALTER changes its definition, and DROP removes the object itself.','Sachin'),
f('SQL04','Seed INSERT commands','SQL','First setup',
 'Populate the relational model with 63 fictional domain records in parent-before-child order.',
 [ref('database/01_seed.sql','INSERT INTO roles VALUES'),ref(DB,'for (const file of ["00_schema.sql", "01_seed.sql"])')],
 'Show the seed SQL and startup loader. The seed is applied only when the roles table is absent; it is not reinserted for every request. Demo password placeholders are replaced with real hashes during setup.',
 'INSERT adds rows. Seed data makes the database and its relationships demonstrable without using real emergency data.','Sachin'),
f('SQL05','SQL CRUD used by the Resources screen','SQL','Operational',
 'Add, list, rename and remove resource tags in PostgreSQL through the interface.',
 [ref(S,'export async function addResourceTag'),ref(S,'export async function updateResourceTag'),ref(S,'export async function removeResourceTag'),ref(API,'if (path === "resource-tags")'),ref(UI,'className="resource-tags"'),ref('database/05_resource_tag_permissions.sql','GRANT INSERT, UPDATE, DELETE')],
 'Sign in as coordinator or technician. In Resources add a temporary tag, rename it, then remove it. Refresh and confirm persistence. A responder has no write controls and direct API/SQL writes are denied.',
 'The form reaches the API and service, which execute bound INSERT, SELECT, UPDATE and DELETE statements on resource_tags.','Sachin'),
f('SQL06','JOIN queries','SQL','Operational + SQL lab',
 'Combine incidents with type/location and assignments with resource/responder information.',
 [ref(S,'`SELECT e.emergency_id,e.type_id'),ref(ADV,'CREATE VIEW v_assignment_summary'),ref(S,'  join: "SELECT e.emergency_id'),ref(Q,'-- JOIN:')],
 'Use SQL lab > Multiple JOINs for a live result. Then show dashboard() and the assignment view: JOINs also supply the operational interface.',
 'A JOIN combines related rows by matching their keys; it does not store a second copy of each related entity.','Sachin'),
f('SQL07','GROUP BY HAVING COUNT and ORDER BY','SQL','Live SQL lab example',
 'Summarize assignments per incident and retain groups having at least one assignment.',
 [ref(S,'  aggregate:'),ref(Q,'-- Grouping and HAVING.'),ref(S,'export async function runQuery')],
 'Choose SQL lab > GROUP BY and HAVING. Open the aggregate query to show grouping and filtering after aggregation. ORDER BY is also visible in JOIN/history queries.',
 'WHERE filters rows before grouping; HAVING filters grouped results; COUNT computes the size of a group.','Sachin'),
f('SQL08','Nested scalar subquery','SQL','Live SQL lab example',
 'Find incidents whose affected-person count exceeds the current overall average.',
 [ref(S,'  nested:'),ref(Q,'-- Nested scalar query:')],
 'Choose SQL lab > Nested query. On the untouched seed, 20 and 12 exceed 34/3, so incidents 101 and 103 qualify. Additional app-created data changes that average.',
 'The inner AVG query returns one value; the outer query compares each incident against it.','Sachin'),
f('SQL09','Correlated NOT EXISTS query','SQL','Live SQL lab example + dispatch validation',
 'Find incidents without active assignments; correlated capability checks also validate a dispatch.',
 [ref(S,'  correlated:'),ref(Q,'-- Correlated query:'),ref(ADV,'  IF EXISTS(SELECT 1 FROM emergency_required_capabilities c')],
 'Choose SQL lab > Correlated NOT EXISTS. Point to a.emergency_id=e.emergency_id. Separately show the nested capability check inside dispatch_response.',
 'A correlated subquery refers to the current outer row. NOT EXISTS keeps it when no matching inner row exists.','Sachin'),
f('SQL10','CTE with ROW_NUMBER window function','SQL','Live SQL lab example',
 'Return the latest recorded status event for each incident.',
 [ref(S,'  cte: "WITH ranked AS'),ref(Q,'WITH ranked AS ('),ref(API,'if (path === "queries" && method === "GET")'),ref(UI,'SQL example')],
 'Choose SQL lab > CTE and window function. Explain PARTITION BY emergency_id, descending changed_at/history_id, and rn=1. This CTE is a query-explorer example; dashboard() reads history separately.',
 'WITH names an intermediate result. ROW_NUMBER ranks each incident’s history, and rn=1 selects the newest event.','Sachin'),
f('SQL11','Recursive CTE','SQL','Live SQL lab example',
 'Generate a seven-day reporting calendar and retain dates with zero incidents.',
 [ref(S,'  recursive:'),ref(Q,'WITH RECURSIVE days(day) AS (')],
 'Choose SQL lab > Recursive CTE. The result has seven dates from 30 October to 5 November 2026. Show the anchor date, UNION ALL step, stopping condition and LEFT JOIN.',
 'The recursive term repeatedly derives the next day until the termination condition is reached. This is a fixed demonstration interval, not a live seven-day dashboard filter.','Sachin'),
f('SQL12','SQL view v_assignment_summary','SQL','Operational + SQL lab',
 'Provide reusable joined assignment/resource/responder data for the dashboard.',
 [ref(ADV,'CREATE VIEW v_assignment_summary AS'),ref(S,'"SELECT * FROM v_assignment_summary ORDER BY assignment_id DESC"'),ref(S,'  view: "SELECT * FROM v_assignment_summary')],
 'Open the CREATE VIEW definition, then dashboard() to show its real consumer. SQL lab > Assignment summary view displays the same view directly.',
 'A normal view stores a query definition, not a separately materialized result. Our dashboard reads it as a relation.','Abhinav'),
f('SQL13','Supporting SQL indexes','SQL','Defined in application schema',
 'Support incident/status, per-incident history and assignment lookup patterns.',
 [ref(ADV,'CREATE INDEX idx_emergency_status_time'),ref(ADV,'CREATE INDEX idx_history_time'),ref(ADV,'CREATE INDEX idx_assignment_emergency'),ref('docs/DATA_DICTIONARY.md','## Index definitions')],
 'Show the three CREATE INDEX statements and the generated dictionary. Explain indexed columns/order. The optimizer chooses a plan; small seed data may still use a sequential scan. No speed-up benchmark is claimed.',
 'Indexes can help suitable lookups and sorting, but consume storage and add write maintenance.','Abhinav'),
f('SQL14','Partial unique indexes','SQL','Operational integrity enforcement',
 'Prevent the same resource or responder from having two active/dispatched assignments while retaining historical completed assignments.',
 [ref(ADV,'CREATE UNIQUE INDEX uq_active_resource'),ref(ADV,'CREATE UNIQUE INDEX uq_active_responder'),ref(T,'Conflicting dispatch is rejected with no partial assignment')],
 'Show the WHERE status IN (active,dispatched) predicates. The conflicting-dispatch test demonstrates rejection; the index also independently enforces uniqueness for direct SQL writes.',
 'Uniqueness applies only to rows matching the partial-index predicate, so past completed responses do not block future allocation.','Abhinav'),
f('SQL15','Stored SQL function dispatch_response','SQL','Operational',
 'Validate and reserve an incident response atomically, including capability coverage.',
 [ref(ADV,'CREATE FUNCTION dispatch_response('),ref(S,'export async function dispatch('),ref(API,'if (path === "dispatch" && method === "POST")'),ref(UI,'Dispatch team →')],
 'As coordinator create a Medical incident requiring Medical support; dispatch Demo Ambulance and EMP-M01 if available. Show the SELECT dispatch_response call and resulting assignment/resource/responder/history changes.',
 'This PostgreSQL function locks and validates the selected records, creates the assignment and updates related states together. It is invoked using SELECT, not CALL.','Abhinav'),
f('SQL16','Stored SQL function finish_response','SQL','Operational',
 'Create an assignment-linked report, release the resource/responder, and resolve the incident when no active response remains.',
 [ref(ADV,'CREATE FUNCTION finish_response('),ref(S,'export async function complete('),ref(API,'if (path === "complete" && method === "POST")'),ref(UI,'Complete response')],
 'Sign in as the assigned responder (medic for EMP-M01) or coordinator, select the incident and complete the response. Show ownership validation, report INSERT and release UPDATEs. Another responder is rejected.',
 'The stored function validates ownership and commits related completion changes as one transaction.','Abhinav'),
f('SQL17','Automatic incident-history trigger','SQL','Operational',
 'Write status history automatically when an incident is created or its status actually changes.',
 [ref(ADV,'CREATE FUNCTION record_emergency_status()'),ref(ADV,'CREATE TRIGGER trg_emergency_status'),ref(S,'export async function createIncident('),ref(T,'Creating an incident generates exactly one audit event'),ref(T,'Unchanged status does not generate duplicate audit records')],
 'Create an incident, then dispatch and complete it. The timeline gains reported/responding/resolved entries. Show the trigger definition and its NEW/OLD status comparison. TypeScript does not call the trigger function explicitly.',
 'The database fires the AFTER INSERT/UPDATE trigger automatically. Its history row belongs to the same transaction and disappears if that transaction rolls back.','Sachin'),
f('SQL18','Transactions COMMIT and ROLLBACK','SQL','Operational + isolated demonstration',
 'Keep incident/requirements, dispatch reservations, reports/releases and their audit entries consistent.',
 [ref(DB,'export async function asActor<T>('),ref(S,'export async function createIncident('),ref(Q,'-- Rollback-safe DML example'),ref(T,'Failed requirement insert rolls back incident and audit together')],
 'Show asActor() wrapping the service callback in db.transaction(). Show the invalid-capability test: both incident and trigger audit row roll back. The tag demo ends with explicit ROLLBACK. The transaction wrapper commits successful callbacks and rolls back thrown errors.',
 'A transaction groups related SQL changes so a failure leaves no partial operation. It does not make MongoDB and SQL one distributed transaction.','Both'),
f('SQL19','Row locks with FOR UPDATE','SQL','Operational',
 'Lock the rows examined by dispatch/completion during their transaction.',
 [ref(ADV,'SELECT * INTO e FROM emergencies'),ref(ADV,'SELECT * INTO r FROM resources'),ref(ADV,'SELECT * INTO p FROM responders'),ref(ADV,'SELECT * INTO a FROM assignments')],
 'Open the SELECT ... FOR UPDATE statements in both stored functions. Explain their relationship to the surrounding transaction and unique active-allocation indexes. This local deployment uses one PGlite app process; it is not a multi-server load test.',
 'FOR UPDATE holds row locks until transaction end, helping keep availability checks and state changes consistent.','Abhinav'),
f('SQL20','Database roles GRANT REVOKE and function permissions','Security','Operational',
 'Restrict SQL actions separately from the front-end controls and service role checks.',
 [ref(ADV,'CREATE ROLE crisis_coordinator'),ref(ADV,'REVOKE EXECUTE ON ALL FUNCTIONS'),ref(ADV,'GRANT EXECUTE ON FUNCTION dispatch_response'),ref(DB,'await tx.exec(`SET LOCAL ROLE'),ref('database/05_resource_tag_permissions.sql','GRANT INSERT, UPDATE, DELETE')],
 'Show the three NOLOGIN roles and their grants. Then show asActor() selecting only a server-defined role after authentication. The integration/tag tests directly attempt forbidden SQL writes, independently of the UI.',
 'These are group roles chosen by a trusted backend transaction, not individual database login accounts. Restricted function execution and table grants enforce database permissions.','Abhinav'),
f('SQL21','Row level security policy','Security','Operational',
 'Reject a maintenance insert attributed to someone other than the current authenticated actor.',
 [ref(ADV,'ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY'),ref(ADV,'CREATE POLICY maintenance_author'),ref(ADV,'CREATE FUNCTION app_actor()'),ref(T,'Database role grants and RLS enforce maintenance author identity')],
 'Show WITH CHECK(performed_by=app_actor()). The test inserts as a technician with another author ID and expects failure. The API also supplies the author from the session.',
 'GRANT controls which operations a role may attempt; RLS adds a row-level condition to those operations.','Sachin'),
f('APP01','Bound SQL parameters and query allowlist','Security','Operational',
 'Keep submitted values separate from SQL syntax and restrict the query explorer to predefined SQL.',
 [ref(S,'"INSERT INTO resource_tags(resource_id,tag) VALUES($1,$2)'),ref(S,'export async function runQuery('),ref(API,'const actor = await authenticate(token);')],
 'Show a $1/$2 parameterized query and its values array, then the labQueries key check. There is no endpoint that executes arbitrary user-entered SQL.',
 'The service passes values separately from the SQL statement. An allowlist chooses the statement itself.','Both'),
f('APP02','Authentication password hashes and session storage','Security','Operational',
 'Authenticate role accounts without persisting a plaintext password or raw session token.',
 [ref('lib/password.ts','export function hashPassword('),ref('lib/auth.ts','export async function login('),ref('lib/auth.ts','export async function authenticate('),ref('scripts/setup.ts','const db = await getDb();'),ref(API,'res.cookies.set("crisis_session"')],
 'Show scrypt plus random salts, SHA-256 token hashing, the session expiry query and HttpOnly/SameSite cookie. Secure setup uses hidden terminal input. These TypeScript helpers are application functions, not stored SQL routines.',
 'Passwords are verified against salted hashes; the browser has a random cookie token while SQL stores only its hash.','Abhinav'),
f('NO01','MongoDB database and collection creation','NoSQL','Operational lazy initialization',
 'Use a real document database for variable incident field updates.',
 [ref(M,'export async function mongo()'),ref(M,'await db.createCollection("field_notes"'),ref('database/04_mongo_commands.js',"db.createCollection('field_notes'")],
 'Open mongo() to show the real MongoClient connection and collection creation. The application initializes the collection on first note access; the mongosh file is a separate fresh-database demonstration.',
 'MongoDB holds incident-linked field-note documents; PostgreSQL holds structured operational relationships.','Abhinav'),
f('NO02','MongoDB collection validation','NoSQL','Operational integrity enforcement',
 'Require valid incident/author IDs, bounded note text, tags, assessment objects and date fields even for direct document inserts.',
 [ref(M,'export const noteValidator'),ref(M,'validationAction: "error"'),ref(T,'MongoDB collection validator rejects malformed direct inserts')],
 'Show $jsonSchema required/properties and validationAction:error. The integration test writes an incomplete document directly and confirms MongoDB rejects it, independently of Zod.',
 'API validation checks requests, while collection validation protects the stored document shape at the database level.','Abhinav'),
f('NO03','MongoDB compound and text indexes','NoSQL','Operational',
 'Support per-incident chronological retrieval and keyword search across note text and tags.',
 [ref(M,'.createIndex({ emergency_id: 1, created_at: -1 })'),ref(M,'.createIndex({ text: "text", tags: "text" })')],
 'Show both createIndex calls and their matching find/sort/$text queries. Explain column order and the separate text index. Do not claim a measured speed-up from the small demo dataset.',
 'The compound index organizes incident/time access; the text index enables $text keyword retrieval.','Abhinav'),
f('NO04','MongoDB CREATE insertOne','NoSQL','Operational',
 'Save a field note with server-derived author and creation/update timestamps.',
 [ref(M,'export async function createNote('),ref(API,'if (path === "notes" && method === "POST")'),ref(UI,'Save field note')],
 'In Field notes select an incident and save a text update with two tags and an optional assessment. The API returns the inserted ObjectId and the saved note appears after refresh.',
 'insertOne creates a document. The server obtains author_id from the authenticated session rather than trusting an author supplied by the browser.','Abhinav'),
f('NO05','MongoDB READ find sort and limit','NoSQL','Operational',
 'Read up to 100 notes for the selected SQL incident in newest-first order.',
 [ref(M,'export async function listNotes('),ref(M,'.find(filter)'),ref(API,'if (path === "notes" && method === "GET")')],
 'Select another incident in Field notes. Show the emergency_id filter, created_at sort and limit(100). Results are incident-specific, not a dump of the whole collection.',
 'find selects matching documents, sort orders them and limit bounds the response.','Abhinav'),
f('NO06','MongoDB UPDATE updateOne and $set','NoSQL','Operational',
 'Edit note text/tags/assessment while retaining its author, creation date and incident link.',
 [ref(M,'export async function updateNote('),ref(M,'const d = noteInput.omit({ emergency_id: true })'),ref(M,'{ $set: { ...d, updated_at: new Date() } }')],
 'Use Edit note as its author or coordinator, save changes and refresh. Show ownedNote() and the editable-field schema before updateOne. The incident ID is not an editable field.',
 '$set changes selected fields instead of replacing the entire document. Ownership is checked before the update.','Abhinav'),
f('NO07','MongoDB DELETE deleteOne','NoSQL','Operational',
 'Delete only an authorized field note selected by ObjectId.',
 [ref(M,'export async function deleteNote('),ref(M,'await col.deleteOne({ _id: note._id })'),ref(UI,'Delete note')],
 'Create a disposable note and delete it using Delete note. Confirm it disappears after reload. A different responder cannot delete a note they do not own.',
 'deleteOne removes the matching document after the shared ownership/reference checks.','Abhinav'),
f('NO08','Full text search with $text','NoSQL','Operational',
 'Search selected-incident note text and tags using MongoDB’s text index.',
 [ref(M,'filter.$text = { $search: search.slice(0, 100) }'),ref(UI,'aria-label="Search notes"')],
 'Save a note containing a distinctive word such as evacuation, then search it in Field notes. Show the incident filter plus $text query and the text-index definition.',
 'This is indexed keyword search, not vector similarity or semantic embeddings.','Abhinav'),
f('NO09','MongoDB aggregation pipeline','NoSQL','Operational',
 'Count field-note tag occurrences for the selected incident.',
 [ref(M,'const summary = await col'),ref(M,'{ $unwind: "$tags" }'),ref(M,'{ $group: { _id: "$tags", count: { $sum: 1 } } }'),ref(UI,'className="tag-summary"')],
 'Add a note tagged medical and safety. Each tag’s count increases by one. Show $match, $unwind, $group, $sort and $limit, then the tag-summary display.',
 'The pipeline selects one incident, turns each array tag into a row-like item and groups those items to count occurrences.','Abhinav'),
f('NO10','Cross database references and note ownership','NoSQL','Operational service validation',
 'Validate SQL incident existence/assignment scope before MongoDB writes and enforce author/coordinator edit rights.',
 [ref(S,'export async function ensureIncident('),ref(M,'async function ownedNote('),ref(T,'NoSQL validates SQL references assignment scope and ownership')],
 'Show ensureIncident() and ownedNote(). Tests reject an unknown SQL incident, an unassigned responder and another author’s edit. SQL foreign keys do not reach into MongoDB.',
 'The API maintains these cross-database references. There is no distributed foreign key or shared SQL/MongoDB transaction.','Both'),
f('OPS01','Database outage failure handling','Integration','Operational + isolated outage test',
 'Return an explicit failed/unconfirmed note operation while keeping independent SQL functionality available.',
 [ref(M,'"MongoDB is unavailable. The note was not saved;'),ref(API,'/Mongo(Network|ServerSelection|TopologyClosed|NotConnected)/'),ref('scripts/offline-smoke.mjs','const child = spawn(')],
 'Open the isolated offline test and docs/verification/offline.json. It starts a separate app with an unavailable MongoDB URI and expects HTTP 503 for a note write and HTTP 200 for the SQL dashboard. No need to stop the live demo database.',
 'A MongoDB failure is shown as a failure, not a successful save. SQL and MongoDB remain independent services.','Abhinav'),
]

features.extend([
f('VEC01','Learned sentence embeddings','SQL','Operational duplicate-report review',
 'Encode incident descriptions and incoming reports as normalized 384-dimensional vectors using the same pinned local MiniLM model.',
 [ref('lib/embeddings.ts','export async function embedText('),ref('lib/embeddings.ts','export const EMBEDDING_REVISION'),ref('lib/semantic.ts','export async function indexIncidents(')],
 'Run pnpm vector:setup once. Create a current warehouse-fire incident, then check a differently worded report at the same location. Show the pinned local model and 384 dimensions in code. No incident is written during review.',
 'The model turns sentences into numeric representations. Identical model and preprocessing are required for document and query vectors.','Abhinav'),
f('VEC02','pgvector cosine distance and HNSW index','SQL','Operational duplicate-report review',
 'Suggest possible duplicate active incidents using same-location/recent-time filters and native vector nearest neighbours.',
 [ref('database/07_vector_search.sql','CREATE EXTENSION IF NOT EXISTS vector'),ref('database/07_vector_search.sql','ON emergencies USING hnsw'),ref('lib/incident-review.ts','export const DUPLICATE_SQL'),ref(API,'if (path === "incidents/review"'),ref(UI,'Check for existing incidents')],
 'In Report incident, check a paraphrased current same-location report. Show the CTE filters, cosine distance, candidate time and deployed teams. The coordinator must choose attach or create separately; similarity never proves identity.',
 'This implements the course PostgreSQL vector lesson within our existing architecture. MongoDB notes still use keyword search.','Abhinav'),
f('VEC03','Embedding invalidation and incremental indexing','SQL','Operational derived-index maintenance',
 'Prevent a description edit from leaving a searchable embedding for old text, while keeping incident reporting independent of the model.',
 [ref('database/07_vector_search.sql','CREATE OR REPLACE FUNCTION invalidate_incident_embedding()'),ref('database/07_vector_search.sql','CREATE TRIGGER trg_invalidate_incident_embedding'),ref('lib/semantic.ts','WHERE emergency_id=$3 AND description=$4'),ref('tests/semantic.test.ts','description edits invalidate vectors')],
 'Show the BEFORE description-update trigger. It clears vectors only for changed descriptions; the next search recomputes them. Inference happens outside transactions and updates compare source text to avoid stale writes.',
 'Embeddings are a derived search representation. Invalidating and regenerating them keeps search consistent with the source incident.','Sachin'),
])

features.extend([
f('VEC04','Human-confirmed duplicate decisions and idempotent reports','Integration','Operational reporting',
 'Attach an additional report once without another incident or dispatch, or deliberately create a separate event.',
 [ref('lib/incident-review.ts','export async function confirmIncidentReport('),ref('database/08_report_receipts.sql','CREATE TABLE IF NOT EXISTS app_incident_report_receipts'),ref(M,'export async function saveAdditionalReport('),ref(M,'unique: true, partialFilterExpression'),ref(UI,'Same incident — attach this report')],
 'Show the same-incident versus create-separately choices. Attach a report; show the original text and reported details in Field notes and unchanged incident/assignment counts. Retry the same decision: it returns the same saved observation.',
 'SQL records the decision; MongoDB preserves the original observation. A signed review binds user, draft and candidates. Receipts and a unique partial index make retries safe; there is no distributed transaction.','Both'),
f('SQL22','Live SQL results and rolling calendar','SQL','Operational SQL lab',
 'Show new incidents and assignments using real queries with five-second polling, manual refresh and a server execution timestamp.',
 [ref(S,'executedAt: new Date().toISOString()'),ref(UI,'Refresh results now'),ref(UI,'window.setInterval(() => void load(), 5000)'),ref('tests/live-lab.test.ts','SQL lab reads new incidents')],
 'Create a new incident and open SQL lab: JOIN and latest-history CTE show its ID, and the current-day calendar count rises. Dispatch it and inspect view/group results. Not every record meets every filtered query.',
 'These are current database results. The lab polls every five seconds while open and can refresh immediately; the calendar uses CURRENT_DATE rather than old sample dates.','Sachin'),
])

features.extend([
f('VEC05','Campus locations, aliases and semantic location matching','Integration','Operational reporting',
 'Resolve a typed landmark to a human-confirmed saved location before duplicate review, preserving building identity and original directions.',
 [ref('lib/locations.ts','export async function indexLocations('),ref('lib/locations.ts','export async function resolveLocations('),ref('lib/locations.ts','export async function createLocation('),ref('database/10_location_search.sql','ON locations USING hnsw'),ref(API,'if (path === "locations/resolve"'),ref(UI,'Saved place / building'),ref('tests/locations.test.ts','Alias-confirmed building shares duplicate review')],
 'Choose Banashankari, then PES RR Campus — GJB Block. Search gjb or golden jubilee block and confirm the saved place. Show semantic suggestions separately from aliases, custom landmarks and original floor/room details.',
 'Location vectors use native cosine retrieval within an area. A human confirms the location; duplicate review then uses that canonical ID. A nearest place is not automatically the same address.','Both'),
f('SQL23','Additive operational catalog and campus data','SQL','Operational catalog',
 'Expand types, capabilities, resources, teams and saved places while preserving availability and passwords.',
 [ref('database/09_operational_catalog.sql','-- Generated by tools/build-catalog.py.'),ref('tests/locations.test.ts','Migration preserves changed resource status')],
 'Show 12 types,16 capabilities,20 resources,15 responders and102 saved places. Dispatch a hazmat unit to a hazardous-material report. Additional teams have no login; coordinator manages them.',
 'INSERT ON CONFLICT and guarded renames extend existing tables. No replacement architecture is required.','Sachin'),
])

inventory=[]
def inv(name,kind,purpose,path,needle):
    inventory.append(dict(name=name,kind=kind,purpose=purpose,ref=ref(path,needle)))
inv('invalidate_incident_embedding','Stored trigger function','Invalidate a stale incident vector when its description changes.','database/07_vector_search.sql','CREATE OR REPLACE FUNCTION invalidate_incident_embedding()')
for name,purpose,path,needle in [
 ('embedText','Generate real locally cached MiniLM sentence embeddings.','lib/embeddings.ts','export async function embedText('),
 ('vectorLiteral','Validate dimensions/finiteness and serialize a bound vector value.','lib/embeddings.ts','export function vectorLiteral('),
 ('indexIncidents','Incrementally maintain incident embeddings with conditional writes.','lib/semantic.ts','export async function indexIncidents('),
 ('reviewIncident','Filter and rank possible duplicates and sign a draft-bound review.','lib/incident-review.ts','export async function reviewIncident('),
 ('confirmIncidentReport','Apply the coordinator decision with retry and stale-review protection.','lib/incident-review.ts','export async function confirmIncidentReport('),
 ('saveAdditionalReport','Idempotently preserve an additional report as a MongoDB observation.','lib/mongo.ts','export async function saveAdditionalReport('),
]:inv(name,'Application vector-search helper',purpose,path,needle)
for name in ['indexLocations','resolveLocations','createLocation']:
    inv(name,'Application location helper','Maintain/search/persist confirmed locations.','lib/locations.ts','export async function '+name+'(')
inv('app_actor','Stored SQL function','Read the transaction actor ID used by audit and row policies.',ADV,'CREATE FUNCTION app_actor()')
inv('record_emergency_status','Stored trigger function','Insert a history event after incident INSERT or an actual status change.',ADV,'CREATE FUNCTION record_emergency_status()')
inv('dispatch_response','Stored SQL function','Validate lock reserve and dispatch a response.',ADV,'CREATE FUNCTION dispatch_response(')
inv('finish_response','Stored SQL function','Validate ownership create report release team and resolve when appropriate.',ADV,'CREATE FUNCTION finish_response(')
for name,purpose in [('getDb','Initialize/open persisted PostgreSQL and load the schema/seed/extensions.'),('asActor','Run an authenticated actor callback with a transaction-local SQL role.')]:
    inv(name,'Application function using SQL',purpose,DB,f'export async function {name}')
for name,purpose in [('dashboard','Read incident/resource/assignment/history/reference records and SQL tags.'),('addResourceTag','Insert one SQL resource tag.'),('updateResourceTag','Rename one SQL resource tag.'),('removeResourceTag','Delete one SQL resource tag.'),('createIncident','Insert incident and required capability together.'),('dispatch','Invoke stored dispatch_response.'),('complete','Invoke stored finish_response.'),('maintenance','Insert an authored maintenance record.'),('ensureIncident','Check SQL incident existence and assignment scope for notes.'),('runQuery','Execute an allowlisted live SQL example.')]:
    inv(name,'Application function using SQL',purpose,S,f'export async function {name}(')
for name,purpose in [('mongo','Connect to real MongoDB and initialize validated/indexed field_notes.'),('listNotes','Read/search notes and aggregate tag counts.'),('createNote','Validate SQL scope and insert a note document.'),('ownedNote','Read the target note and validate modification rights.'),('updateNote','Update allowed document fields and timestamp.'),('deleteNote','Delete an authorized note document.')]:
    inv(name,'Application function using MongoDB',purpose,M,f'async function {name}(')
for name,purpose in [('login','Verify password throttle failures and create a hashed-token SQL session.'),('authenticate','Resolve a valid SQL session into an actor.'),('logout','Delete the SQL session token hash.'),('requireRole','Reject an action when the actor has an unsuitable application role.')]:
    inv(name,'Application security function',purpose,'lib/auth.ts',f'function {name}(')
for name,purpose,needle in [('hashPassword','Create an independently salted scrypt hash.','export function hashPassword('),('verifyPassword','Check a submitted password with timing-safe hash comparison.','export function verifyPassword('),('tokenHash','SHA-256 hash a random session token before storing it.','export const tokenHash =')]:
    inv(name,'Application crypto helper',purpose,'lib/password.ts',needle)

def slug(path):return path.replace('/','__').replace('[','').replace(']','')+'.html'
def github(r):return f'{REPO}/blob/{REV}/{quote(r["path"],safe="/")}#L{r["line"]}'
def offline(r):return f'code-map/{quote(slug(r["path"]))}#L{r["line"]}'
def mdref(r):return f'[{r["path"]}:{r["line"]}]({github(r)})'

intro=[
'# Database concept to feature to code map',
'',
'**Crisis Link Emergency Resource Coordination & Response Management System**',
'',
f'Source-code snapshot: `{REV}`. Line numbers and marker strings were checked directly against the supplied source files. If code is edited, rerun `python tools/build-feature-map.py` to regenerate this guide.',
'',
'## Start here when the teacher asks',
'',
'1. Find the concept in the quick table or search the offline HTML guide.',
'2. Explain the feature and purpose in one sentence.',
'3. Open the definition, then its service/API caller, and finally the relevant screen.',
'4. Demonstrate the normal result and one tested rejection/rollback case.',
'',
'Open **DATABASE_FEATURE_MAP.html** for a searchable offline guide. Its Open code links jump to highlighted line numbers in bundled source viewers; no server or internet is needed for the guide. GitHub links pin the inspected source revision.',
'',
'## Important distinctions',
'',
'- PostgreSQL through PGlite stores operational relations, including resource_tags. MongoDB stores field_notes and their tag arrays/assessments.',
'- SQL stored functions are dispatch_response, finish_response, app_actor, record_emergency_status and invalidate_incident_embedding. TypeScript helpers are application functions. No CREATE PROCEDURE/CALL routine is implemented.',
'- The trigger, stored dispatch/completion functions and assignment view serve the operational workflow. CTE/recursive/nested/aggregate examples also execute live, but through SQL lab; they are not all dashboard implementation queries.',
'- database/03_queries.sql and database/04_mongo_commands.js are supplementary standalone examples. Runtime query definitions live in lib/service.ts and lib/mongo.ts. database/06_ddl_demo.sql is an isolated demonstration, not an operational migration.',
'- PostgreSQL duplicate-report review uses real MiniLM embeddings, pgvector cosine distance and an HNSW index. MongoDB note search remains keyword search. Supporting indexes do not establish measured speed improvement; small data may use sequential scans.',
'- Presenter suggestions follow CONTRIBUTIONS.md and are responsibility assignments, not claims of historical authorship.',
'',
'## Fast lookup',
'',
'| Concept | What it implements | Where it runs | First file to open |',
'|---|---|---|---|',
]
for item in features:intro.append(f'| [{item["id"]} {item["title"]}](#{item["id"].lower()}) | {item["purpose"]} | {item["usage"]} | {mdref(item["refs"][0])} |')
md=intro+['','## Detailed code paths and demonstrations','']
for item in features:
    md.extend([f'<a id="{item["id"].lower()}"></a>',f'### {item["id"]} {item["title"]}','',f'**Purpose:** {item["purpose"]}',f'**Used in:** {item["usage"]}',f'**Suggested presenter:** {item["presenter"]}','', '**Open the code in this order:**',''])
    for r in item['refs']:md.append(f'- {mdref(r)} — search `{r["needle"]}`')
    md.extend(['',f'**Demonstrate:** {item["demo"]}','',f'**Say:** “{item["say"]}”',''])
md.extend(['## Function inventory','',
'Only the five entries labelled stored SQL/trigger function reside in PostgreSQL. The other named functions are TypeScript helpers that call SQL, MongoDB, model or crypto APIs.','',
'| Function | Kind | What it implements | Code |','|---|---|---|---|'])
for item in inventory:md.append(f'| `{item["name"]}` | {item["kind"]} | {item["purpose"]} | {mdref(item["ref"])} |')
md.extend(['','## A practical 8 minute demonstration','',
'1. Coordinator: create a Medical incident at Demo Campus requiring Medical support. Show the trigger-created reported event.',
'2. Dispatch the available Demo Ambulance and EMP-M01. Show assignment creation and resource/responder status changes. Availability must match the current database state.',
'3. Show the assignment view definition and dashboard caller. Explain the transaction, FOR UPDATE locks and partial unique indexes.',
'4. Assigned medic: complete the response. Show the stored function, report, released resource and final history.',
'5. Coordinator/technician: add, rename and remove a disposable resource tag to demonstrate SQL CRUD.',
'6. Field notes: create a disposable update, search its distinctive word, show tag counts, edit and delete it. Point to MongoDB insertOne/find/updateOne/deleteOne and aggregate.',
'7. SQL lab: run CTE/window, recursive, JOIN and correlated examples. State which features are explorer demonstrations.',
'8. Show recorded tests for invalid references, unauthorized roles, rollback, duplicate audit prevention and MongoDB outage. Both teammates explain their assigned module and one reviewed module.',
'',
'## Useful test and setup files','',
'- README.md — installation, pnpm setup, MongoDB launcher and app startup.',
'- tests/integration.test.ts — SQL/MongoDB integrity, trigger, stored function, transaction and role checks.',
'- tests/resource-tags.test.ts — resource-tag SQL CRUD, duplicates and direct permission denial.',
'- tests/ddl.test.ts — isolated CREATE/ALTER/DROP lifecycle.',
'- tests/security-bootstrap.test.ts and tests/setup.test.ts — password persistence and secure setup/reset.',
'- scripts/http-smoke.mjs — running API checks; requests the current password with hidden input.',
'- scripts/offline-smoke.mjs — isolated MongoDB outage check.',
'- docs/verification/ — saved execution evidence. Prior results are evidence of those runs, not a guarantee that future modified code has been tested.',
'',
'The ZIP contains the complete source, SQL/NoSQL examples, seed, report, diagrams, screenshots, this guide and Git history bundle. Dependencies, runtime database directories and real secrets are intentionally excluded; install/run using README.md.',
])
(DOCS/'DATABASE_FEATURE_MAP.md').write_text('\n'.join(md)+'\n',encoding='utf-8')

CSS='''body{font:15px/1.6 Arial,sans-serif;margin:0;background:#f3f6f1;color:#20372b}main{max-width:1080px;margin:auto;padding:36px 24px}h1{font-size:30px;line-height:1.2}h2{margin:0 0 12px;font-size:22px}h3{font-size:17px}.muted{color:#65786b;font-size:13px}a{color:#176443}code{font:13px Consolas,monospace;background:#edf1e9;padding:2px 4px;overflow-wrap:anywhere}.panel,.feature{background:white;border:1px solid #dce4d9;border-radius:9px;padding:22px;margin:20px 0}.toolbar{display:flex;gap:12px;flex-wrap:wrap;position:sticky;top:0;background:#f3f6f1;padding:14px 0;z-index:2}input,select{font:inherit;padding:12px;border:1px solid #c8d5c8;border-radius:5px;background:#fff}input{flex:1;min-width:220px}.badge{display:inline-block;padding:4px 9px;border-radius:4px;background:#e8f0e4;margin:0 6px 10px 0;font-size:12px}.code-link{display:inline-block;margin:4px 8px 4px 0;padding:7px 10px;background:#edf5e9;border:1px solid #d2dfca;border-radius:5px;text-decoration:none;font:12px Consolas,monospace}.code-links li{margin-bottom:10px}.feature:target{outline:3px solid #c0ad67;scroll-margin-top:90px}.quick{display:flex;gap:8px;flex-wrap:wrap}.quick a{padding:6px 10px;border:1px solid #cedcc8;background:#fff;border-radius:5px;text-decoration:none;font-size:12px}.label{font-weight:bold}blockquote{margin:12px 0 0;border-left:3px solid #648f62;padding:8px 15px;background:#f5f8f2}button{border:1px solid #cad7c4;background:white;border-radius:5px;padding:8px 12px;cursor:pointer}details{margin-top:12px}summary{cursor:pointer;font-weight:bold}li{margin:5px 0}@media print{.toolbar{position:static}.feature{break-inside:avoid}.quick{display:none}}'''
cards=[]
for item in features:
    links=[]
    for r in item['refs']:
        links.append(f'<li><a class="code-link" href="{offline(r)}">Open code {escape(r["path"])}:{r["line"]}</a><a href="{github(r)}">GitHub</a><br><code>{escape(r["needle"])}</code></li>')
    cards.append(f'''<article class="feature" id="{item['id'].lower()}" data-category="{item['category']}"><span class="badge">{item['category']}</span><span class="badge">{escape(item['usage'])}</span><h2>{item['id']} {escape(item['title'])}</h2><p><span class="label">We used it to:</span> {escape(item['purpose'])}</p><p class="muted">Suggested presenter: {escape(item['presenter'])}</p><ol class="code-links">{''.join(links)}</ol><details><summary>How to demonstrate and explain it</summary><p>{escape(item['demo'])}</p><blockquote>{escape(item['say'])}</blockquote></details></article>''')
quick=''.join(f'<a href="#{item["id"].lower()}">{escape(item["title"])}</a>' for item in features if item['id'] in ['SQL05','SQL10','SQL11','SQL12','SQL15','SQL17','SQL18','SQL21','NO08','NO09'])
inventory_rows=''.join(f'<tr><td><code>{escape(item["name"])}</code><br>{escape(item["kind"])}</td><td>{escape(item["purpose"])}</td><td><a href="{offline(item["ref"])}">{escape(item["ref"]["path"])}:{item["ref"]["line"]}</a></td></tr>' for item in inventory)
inventory_html=f'<section class="panel" id="function-inventory"><h2>Function inventory</h2><p>The five stored SQL/trigger functions run inside PostgreSQL. All other entries are application helpers; their names do not make them stored database routines.</p><table><thead><tr><th>Function and kind</th><th>Purpose</th><th>Open code</th></tr></thead><tbody>{inventory_rows}</tbody></table></section>'
CSS+='table{width:100%;border-collapse:collapse;font-size:12px}td,th{text-align:left;vertical-align:top;padding:10px;border:1px solid #d9e3d5}th{background:#e9f0e5}td{overflow-wrap:anywhere}'
html=f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Crisis Link database feature and code map</title><style>{CSS}</style></head><body><main><p class="muted">TEACHER AND VIVA REFERENCE</p><h1>What we used and where it is in the code</h1><p>Crisis Link Emergency Resource Coordination &amp; Response Management System</p><p class="muted">Source snapshot {REV[:12]} · {len(features)} verified concept mappings · Offline source viewers included</p><section class="panel"><h2>Use this during your demo</h2><p>Find the concept → explain its purpose → open its definition → show its caller → demonstrate the result.</p><p><b>Important:</b> triggers/functions/view support operations; CTE/recursive/nested examples run through SQL lab. PostgreSQL resource tags and MongoDB field-note tags are separate data. Keyword search is not vector search. Presenter assignments are a plan, not historical authorship evidence.</p><div class="quick">{quick}</div><p><a href="DATABASE_FEATURE_MAP.md">Full Markdown guide and demonstration script</a> · <a href="../README.md">Setup instructions</a> · <a href="../CONTRIBUTIONS.md">Assigned team responsibilities</a></p></section><div class="toolbar"><input id="search" type="search" aria-label="Search concepts and code" placeholder="Search trigger, CTE, view, insertOne, role…"><select id="category" aria-label="Concept category"><option value="">All categories</option><option>SQL</option><option>NoSQL</option><option>Security</option><option>Integration</option></select></div><p class="muted" id="count">{len(features)} mappings</p>{''.join(cards)}</main><script>const input=document.getElementById('search'),category=document.getElementById('category'),cards=[...document.querySelectorAll('.feature')];function filter(){{let count=0;for(const card of cards){{const visible=card.textContent.toLowerCase().includes(input.value.toLowerCase())&&(!category.value||card.dataset.category===category.value);card.hidden=!visible;if(visible)count++;}}document.getElementById('count').textContent=count+' mappings';}}input.addEventListener('input',filter);category.addEventListener('change',filter);</script></body></html>'''
html=html.replace('</main><script>',inventory_html+'</main><script>')
(DOCS/'DATABASE_FEATURE_MAP.html').write_text(html,encoding='utf-8')
for path,lines in files.items():
    body=''.join(f'<div class="line" id="L{i}"><a href="#L{i}">{i}</a><code>{escape(line)}</code></div>' for i,line in enumerate(lines,1))
    viewer=f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{escape(path)}</title><style>body{{margin:0;background:#fff;color:#183328;font:13px/1.65 Consolas,monospace}}header{{position:sticky;top:0;padding:15px 22px;background:#173e30;color:#fff;z-index:1}}header a{{color:#d8efcd}}h1{{font:18px Arial;margin:5px 0}}main{{padding:18px}}.line{{display:flex;scroll-margin-top:100px;border-bottom:1px solid #f4f6f1}}.line>a{{width:48px;flex-shrink:0;text-align:right;padding-right:16px;color:#768c77;text-decoration:none;user-select:none}}.line code{{white-space:pre-wrap;overflow-wrap:anywhere}}.line:target{{background:#fff0b5;outline:2px solid #ccac53}}.line:hover{{background:#f3f7ee}}</style><header><a href="../DATABASE_FEATURE_MAP.html">← Back to concept map</a><h1>{escape(path)}</h1><small>Exact bundled source · {REV[:12]} · Highlighted line is the mapping entry point</small></header><main>{body}</main></html>'''
    (VIEWERS/slug(path)).write_text(viewer,encoding='utf-8')

manifest={'sourceRevision':REV,'featureCount':len(features),'functionCount':len(inventory),'sourceFileCount':len(files),'referenceCount':sum(len(i['refs']) for i in features)+len(inventory),'features':features,'functionInventory':inventory,'sourceHashes':{path:hashlib.sha256((ROOT/path).read_bytes()).hexdigest() for path in files}}
(DOCS/'feature-map-manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')

class LinkParser(HTMLParser):
    def __init__(self):super().__init__();self.links=[];self.ids=set()
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        if 'href' in attrs:self.links.append(attrs['href'])
        if 'id' in attrs:self.ids.add(attrs['id'])
checked=0
parsed_cache={}
def parsed(file):
    file=file.resolve()
    if file not in parsed_cache:
        item=LinkParser();item.feed(file.read_text(encoding='utf-8'));parsed_cache[file]=item
    return parsed_cache[file]
for file in [DOCS/'DATABASE_FEATURE_MAP.html',*VIEWERS.glob('*.html')]:
    parser=parsed(file)
    for href in parser.links:
        if href.startswith('https://'):continue
        target,_,anchor=href.partition('#');resolved=(file.parent/unquote(target)).resolve() if target else file
        assert resolved.is_file(),f'Missing local link {href} from {file}'
        if anchor and resolved.suffix=='.html':
            assert anchor in parsed(resolved).ids,f'Missing anchor {href}'
        checked+=1
print(json.dumps({'features':len(features),'functions':len(inventory),'sourceFiles':len(files),'references':manifest['referenceCount'],'validatedLocalLinks':checked,'sourceRevision':REV}))
