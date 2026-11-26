# CrisisLink

**Project title:** Crisis Link Emergency Resource Coordination & Response Management System

Public repository: https://github.com/abhinavk0006/crisislink

[Final report](docs/CrisisLink_DBMS_Final_Report.pdf) | [Level 3 requirements audit](docs/LEVEL3_REQUIREMENTS_AUDIT.md) | [Rubric checklist](docs/CrisisLink_Rubric_Checklist.md)

[Team responsibilities and evidence](CONTRIBUTIONS.md)

[Database concept-to-feature and code mapping](docs/DATABASE_FEATURE_MAP.md) | [Searchable offline viva guide](docs/DATABASE_FEATURE_MAP.html)

[Course alignment and vector-search viva guide](docs/COURSE_ALIGNMENT.md)

Database Management Systems mini project, UE24CS351A.

Students: Sachin R (PES1UG24CS688) and Abhinav Krishna Kandukuri (PES1UG24CS701).

This runnable reconstruction starts from the supplied 17-table model and 63 fictional seed rows, then applies an additive operational catalog (323 domain rows on fresh setup). The supplied ZIP contains no application source. The former website's description of a 134-row application is a different version and is not the implementation packaged here.

## Stack and scope

- Next.js App Router, React and TypeScript.
- Real PostgreSQL engine through PGlite, with files persisted under `data/postgres`.
- Real MongoDB Community Server, with a separate `field_notes` collection. No JSON-file emulation.
- Three application and PostgreSQL roles: Coordinator, Responder and Technician.
- Atomic SQL dispatch and completion functions, an automatic status-history trigger, CTE/window/recursive queries, a reporting view, indexes, GRANT/REVOKE and a row-level maintenance policy.
- MongoDB validation, compound/text indexes, note CRUD, full-text search and tag aggregation.
- PostgreSQL pgvector duplicate-report review using local MiniLM embeddings (384 dimensions), cosine distance and an HNSW index, as taught in the course slides.

This is a single-process local classroom demonstration, with fictional incidents. It does not contact real emergency services. PGlite is not a network PostgreSQL server. The source MySQL scripts remain in `database/mysql/` for provenance; the application runs only the PostgreSQL adaptation.

## Run locally

Install Node.js 24 or later and MongoDB Community Server. Install pnpm using your preferred normal Node setup, or use `npx pnpm@11.25.0` in place of `pnpm` below.

```powershell
pnpm install --frozen-lockfile
pnpm setup
pnpm vector:setup
pnpm mongo
```

Keep MongoDB running in this first terminal. The included helper starts a dedicated instance bound only to 127.0.0.1 on port 27028. Its default Windows binary path is MongoDB Server 8.2; set `MONGOD_BIN` for another installation. Existing database services are not stopped or reconfigured.

In a second terminal, in the project folder:

```powershell
pnpm dev
```

Before starting the app, run `pnpm setup` and choose a 12 to 200 character demonstration password using hidden input. Setup initializes the SQL database, gives each synthetic account an independently salted scrypt hash and creates no plaintext password file. Running setup again resets these local demonstration passwords and revokes sessions. Stop the app before running setup against its PGlite directory. Use the password you chose at http://127.0.0.1:3100. Automated setup may receive DEMO_PASSWORD through the process environment; never commit a real password or put it in source files.

| Account | Role |
|---|---|
| coordinator@example.com | Coordinator |
| fire@example.com | Responder, EMP-F01 |
| medic@example.com | Responder, EMP-M01 |
| rescue@example.com | Responder, EMP-R01 |
| tech@example.com | Technician |

All accounts are synthetic. Passwords receive independent scrypt salts; sessions store only SHA-256 token hashes. Cookies are HttpOnly and SameSite Strict, with Secure enabled for HTTPS. This local demo uses loopback HTTP. MongoDB is loopback-only and has no authentication in the included local helper; a remote deployment requires authenticated MongoDB/TLS, HTTPS, managed secrets and a suitable database/server architecture.

`pnpm vector:setup` downloads the pinned public MiniLM model once into `data/models` and backfills incident vectors. Stop the app before running this standalone command. The app also indexes new/changed descriptions on the next semantic search. No embedding API key is needed; inference runs locally and works offline after caching. The **Report incident** form checks for possible duplicates, then lets the coordinator attach an additional report or create separately. MongoDB field-note search remains keyword search. See `docs/COURSE_ALIGNMENT.md` for slide pages, exact SQL, limitations and viva examples.

Production-mode local check:

```powershell
pnpm build
pnpm start
```

Run one Next.js process at a time against a PGlite data directory. Stop `dev` before `start`. The build uses webpack and excludes runtime data from tracing so MongoDB's locked data files are never bundled.

Configuration defaults are documented in `.env.example`. Next.js loads `.env.local` automatically. The helper and test commands read process environment variables. Set environment variables in the terminal for those commands.

## Demonstration sequence

1. Coordinator: report a Medical incident at Demo Campus, require Medical support, and enter a description and affected-person count.
2. Observe the automatically generated `reported` history entry.
3. Dispatch Demo Ambulance and EMP-M01. The SQL function validates availability and capability coverage, locks rows, inserts the assignment and updates related statuses together.
4. Add and retrieve a field note. Search its text or tags, edit it and inspect the tag counts.
5. Sign in as medic@example.com. Complete that assigned response. Inspect the report, released resource, available responder and final incident history.
6. Sign in as tech@example.com. Save a maintenance record. Incident creation and note-writing controls are absent, and direct API/SQL attempts are rejected.
7. Open SQL lab and execute JOIN, nested, correlated, CTE, recursive CTE, view and grouped queries.

## Database structure and commands

`database/00_schema.sql` defines the 17 domain tables. `01_seed.sql` retains the 63-row base with cleaned display labels; initialization replaces nonfunctional sample hash values with real password hashes. `02_advanced.sql` adds stronger constraints, functions, trigger, roles, RLS and two internal authentication tables. There are 26 domain foreign keys. Internal tables add a session-to-user foreign key and two decision-receipt references. `07_vector_search.sql` adds vector metadata/indexing; `08_report_receipts.sql` adds the third internal table for retry-safe report decisions. `03_queries.sql` contains standalone SQL demonstrations, including rollback-safe DML. `04_mongo_commands.js` contains mongosh collection creation and CRUD/search/aggregation examples for a fresh MongoDB database.

The conceptual diagram shows derived priority and available capacity attributes. Neither is stored in this classroom-based application. Readiness is determined by resource status; dispatch is exclusive per active resource and responder. The application strengthens selected nullability and uniqueness rules; these extensions are documented in the SQL migration and report. One resource must cover all requested capability types for its dispatch; quantities greater than one are outside this demonstration's dispatch model.

SQL and MongoDB do not share a distributed transaction. Note endpoints first check SQL incident existence, role and assignment scope. MongoDB errors are reported as failed saves; the interface never reports success for an unpersisted note. Notes cannot change SQL incident IDs on edit. Incident deletion is not exposed, preventing dangling note references through the application.

## API

| Method | Path | Purpose |
|---|---|---|
| POST | /api/auth/login | Authenticate and create a session |
| GET | /api/auth/me | Current session identity |
| POST | /api/auth/logout | Revoke session |
| GET | /api/dashboard | Related operational records |
| POST | /api/incidents | Coordinator creates incident |
| POST | /api/dispatch | Coordinator invokes dispatch function |
| POST | /api/complete | Assigned responder or coordinator completes response |
| POST | /api/maintenance | Technician or coordinator records maintenance |
| GET | /api/queries?key=cte | Execute an allowlisted SQL example |
| GET/POST | /api/notes | Read/search or create field notes |
| PATCH/DELETE | /api/notes/:id | Author or coordinator edits/deletes a note |

All operational endpoints authenticate sessions. SQL values use bound parameters; arbitrary SQL input is not exposed. The server sets `app.user_id` and an allowlisted PostgreSQL role within a transaction. Direct responder SQL writes to incidents and credential-table reads fail even when the UI is bypassed. Security-definer functions use a fixed search path and narrowly granted execution permissions. Role-based SQL sessions trust the authenticated backend to set the correct actor ID; they are not separate end-user database logins.

## Verification

With MongoDB running:

```powershell
pnpm typecheck
pnpm test
node scripts/http-smoke.mjs
```

The integration tests use a fresh temporary SQL directory, no credential artifact and a uniquely named MongoDB database. They do not alter the demonstration database; the temporary MongoDB database is removed after testing. HTTP smoke checks use the running demonstration app and clean up their temporary note. Evidence files are written to `test-results/` and copies are included in the delivery package.

## Git and student contribution

The delivered implementation and documentation were generated with coding assistance from the supplied model. Students must inspect, understand, modify and test it, and record their actual contributions. No student-authored commit history, originality guarantee, GitHub publication or viva performance is fabricated. Follow the course's assistance/disclosure rules. Use your own repository and identities for genuine future contributions. See the separate rubric checklist for remaining human evidence.

## Source references

- Supplied `Final_DBMS_Presentation_Package.zip`: conceptual/relational diagrams and classroom MySQL model/seed.
- https://nextjs.org/docs/app/guides/authentication
- https://nextjs.org/docs/app/api-reference/file-conventions/route
- https://pglite.dev/docs/
- https://www.postgresql.org/docs/current/sql-createfunction.html
- https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- https://www.mongodb.com/docs/manual/core/schema-validation/
- https://www.mongodb.com/docs/manual/text-search/

## Requirements and design documentation

See docs/PROJECT_SPECIFICATION.md for the problem, objectives, scope, functional requirements, conclusion and future work; docs/DATA_DICTIONARY.md for generated SQL metadata; docs/ARCHITECTURE.md for system and failure boundaries; and docs/LEVEL3_REQUIREMENTS_AUDIT.md for the full brief comparison. Resource tag create/rename/remove actions demonstrate SQL DML through the Resources screen. Run database/06_ddl_demo.sql for isolated CREATE/ALTER/DROP practice.

HTTP checks request the current password using hidden input, or accept TEST_PASSWORD in the process environment. They do not read or create a password file.



See [Locations and catalog](docs/LOCATIONS_AND_CATALOG.md) for 102 saved places, RR Campus building selection, freeform addresses, location vectors and the expanded resource/capability catalog. Run `pnpm vector:setup` with the app stopped to warm both incident and location indexes.

Duplicate review considers active reports from the last hour. The area selector directly lists saved places/buildings (at least eight per area); there is no extra location-group dropdown. Typed addresses work without a separate landmark name. `database/11_area_landmarks.sql` adds 72 curated place labels using generated IDs and catalog keys, preserving custom data.

To explicitly add eight fictional incidents for exploring the app, stop the app and run `pnpm incidents:seed`, then restart it. The command preserves existing records and uses stable request IDs: reruns reuse the same incidents without renewing their timestamps or resetting their status. They use actual creation times and are eligible for one-hour review while recent. BE Block example: “There are sparks and smoke from an electrical cupboard on the second floor.” Select the same BE Block saved location to check it.
