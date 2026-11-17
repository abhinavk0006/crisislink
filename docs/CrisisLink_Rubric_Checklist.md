# CrisisLink evaluation checklist

Checked 17 November 2026. This checklist is separate from the final report, as requested. Status means implementation/evidence coverage, not an awarded mark.

The friend's ZIP supplied a classroom MySQL model, seed, diagrams, slides and SQL output. It did **not** supply the Next.js app referenced by the website. The delivered application is a new local reconstruction using the same 17 domain tables and 63 seed rows, adapted to PostgreSQL/PGlite, with real MongoDB added. Do not describe it as the earlier 134-row application.

| Criterion | Marks | Status | Evidence and changes |
|---|---:|---|---|
| ER diagram | 2 | Covered | Complete supplied Chen diagram retained in the report; source diagram included. Derived fields remain conceptual. |
| Relational schema with keys, relationships and constraints | 3 | Covered | Complete supplied 17-relation diagram, 26 domain FKs, composite keys; application extensions explained in report and SQL. |
| SQL DDL with constraints | 4 | Implemented and tested | PostgreSQL adaptation, identity IDs, PK/FK/NOT NULL/UNIQUE/CHECK rules and partial unique indexes; tested temporary-object CREATE/ALTER/DROP example. |
| NoSQL/vector database creation | 4 | Implemented and tested | Real MongoDB Community Server; validated field_notes collection and compound/text indexes. MongoDB satisfies the NoSQL option; a separate vector database is not required by the wording. |
| Technology justification | 1 | Covered | Report explains Next.js, relational operations in PostgreSQL, flexible notes in MongoDB, and the local PGlite choice. |
| DML operations | 4 | Implemented and tested | Application incident/response/maintenance operations and resource-tag INSERT/SELECT/UPDATE/DELETE through the Resources screen; rollback-safe SQL demonstration. |
| Nested/correlated/recursive queries and JOINs | 4 | Implemented and tested | Scalar AVG subquery, correlated NOT EXISTS, multi-table JOINs, seven-day recursive calendar and live query explorer. |
| Advanced SQL concepts | 6 | Implemented and tested | Stored dispatch_response and finish_response functions; automatic status-history trigger; CTE/window query, view, indexes and transactions. SQL functions satisfy the Procedure/Function option. |
| NoSQL/vector feature and CRUD | 7 | Implemented and tested | Note create/read/update/delete through the API and interface, full-text search, tag aggregation, schema validation and ownership checks. |
| Next.js interface | 3 | Implemented and checked | Login, incident creation/detail, dispatch, response completion, resources/maintenance, field notes and live SQL lab. Responsive screenshots included. |
| Backend/API and database integration | 2 | Implemented and tested | Authenticated route handlers; SQL transactions; MongoDB service with SQL reference validation; real HTTP CRUD and dispatch/completion checks. |
| Frontend authentication, two roles and database RBAC | 4 | Implemented and tested | Three roles: Coordinator, Responder, Technician. Hidden setup input, hash-only persistence, no plaintext password file; scrypt passwords; hashed-token sessions; HttpOnly cookies; API role checks; PostgreSQL GRANT/REVOKE, function grants and maintenance RLS. Direct forbidden SQL actions tested independently of the interface. |
| Documentation and Git/GitHub | 2 | Documentation complete; public GitHub published | Report, setup README, example configuration, SQL/NoSQL commands, test evidence and a local Git repository. Published and verified: https://github.com/abhinavk0006/crisislink. Actual implementation commits are attributed to Codex; student authorship is not fabricated. |
| Originality, individual contribution, modification and viva | 4 | Student action required | Students must review and understand the generated implementation, make and document their real changes, disclose assistance as required by the course, and prepare to modify/explain it in the viva. These cannot be established by a code generator. |

## Verification record

- The combined suite passed 30 tests (29 named checks plus the parent test): the original 23 integration checks, DDL lifecycle, three SQL tag tests, hash-only bootstrap persistence, and secure setup/reset.
- 12 running HTTP checks passed, including incident/dispatch/completion, MongoDB CRUD and SQL tag CRUD. See docs/verification/http.json.
- Two outage checks passed against a separate running production instance: an unavailable MongoDB endpoint returned 503, while the SQL dashboard remained available.
- TypeScript checking and a production build passed. Final build/evidence files are included in the source package.
- Browser evidence covers coordinator login, incident creation, dispatch, a saved MongoDB field note and live CTE results.
- No claim is made that the entire application has been externally security-audited or assessed by the instructor.

## Before submission

- [ ] Both students independently install/run the project using README.md.
- [ ] Rehearse the three roles and explain database-level permission checks.
- [ ] Demonstrate one JOIN, nested query, correlated query, recursive CTE, stored function, audit trigger and MongoDB CRUD/search.
- [ ] Make genuine individual modifications and record their actual authorship and tests.
- [x] Public GitHub repository published and verified. Runtime data, secrets, dependencies and build outputs are excluded.
- [ ] Confirm that local embedded PostgreSQL/PGlite is acceptable to the evaluator; the SQL engine is PostgreSQL, but it is not a separately installed network server.
- [ ] Review the conceptual diagram assumptions and the stronger constraints added by the implementation.
- [ ] Follow the course's rules for coding assistance and originality disclosure.

## Practical limits

This is a local, single-process teaching application. It uses fictional data. MongoDB in the local launcher binds only to loopback and has no authentication; a hosted service requires authenticated connections, TLS/HTTPS and deployment hardening. SQL and MongoDB do not share a distributed transaction. Notes rely on server-side SQL reference/authorization checks. One dispatch resource must cover all required capability types; capability quantities beyond one are not allocated by this demonstration. The app is not connected to real emergency services.

## Full brief audit

See docs/LEVEL3_REQUIREMENTS_AUDIT.md for all 18 requirements, PROJECT_SPECIFICATION.md for the full specification, DATA_DICTIONARY.md for executed schema metadata, and ARCHITECTURE.md for the backend/database design. The revised report adds problem, objectives, scope, functional requirements, architecture, DDL lifecycle, SQL tag CRUD, secure setup, conclusion and future enhancements.



