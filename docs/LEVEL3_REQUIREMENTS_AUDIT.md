# DBMS Level 3 requirements audit

Source: user-provided DBMS Level 3 Project Requirements.pdf, four pages, inspected 17 November 2026. This checklist records evidence coverage, not awarded marks or instructor approval.

| Requirement | Implementation or evidence | Status |
|---|---|---|
| 1 Project title and meaningful problem | CrisisLink models coordinated emergency dispatch with exclusive reservations, audit history and field updates. Section-wide title uniqueness requires instructor/section confirmation. | Technical scope covered; title uniqueness external |
| 2 Two-member team and both kinds of contribution | Two named students; proposed shared database/application responsibilities in PROJECT_SPECIFICATION.md. Approval and actual individual work must be established by the students. | Administrative/contribution evidence pending |
| 3 SQL plus NoSQL or vector | PostgreSQL through PGlite plus real MongoDB. MongoDB is explicitly listed in Option 1. | Implemented |
| 4 SQL and document data models | Complete supplied ER/relational diagrams; executable 17-table schema; generated data dictionary; MongoDB validation/index/retrieval design. | Documented and implemented |
| 5 DDL | CREATE/ALTER, keys, constraints, indexes and a view; safe temporary-object CREATE/ALTER/DROP script with execution test. | Implemented and tested |
| 6 Meaningful DML and queries | Incident/dispatch/report/maintenance operations; SQL resource-tag create/read/rename/remove through the app; MongoDB note CRUD; JOIN, grouping, aggregates, sorting, subqueries and CTEs. | Implemented |
| 7 At least four advanced concepts | Transactions, views, stored functions, triggers, indexing, MongoDB full-text search and aggregation. | Seven relevant concepts |
| 8 Vector/semantic search | Optional and recommended in the brief; this implementation chooses SQL plus NoSQL. Keyword text search is not described as semantic similarity. | Optional feature not selected |
| 9 Next.js interface | Login, dashboard, incident forms/detail, dispatch/completion, resources/tags/maintenance, field notes and live SQL explorer. | Implemented |
| 10 Backend/API and environment configuration | Authenticated Next.js handlers, bound SQL parameters, server-side MongoDB, configurable database paths/URI. | Implemented |
| 11 Authentication and minimum two roles | Coordinator, Responder and Technician; expiring hashed-token sessions and SQL role grants/function permissions. | Three roles implemented |
| 12 Database validation and consistency | PK/FK/NOT NULL/UNIQUE/CHECK, active-allocation indexes, SQL transactions, trigger audit and maintenance RLS; MongoDB collection validator. | Implemented and tested |
| 13 Basic security and no plaintext passwords | Scrypt password hashes, hidden setup input, no plaintext credential artifact, HttpOnly cookies, hashed session tokens, bounded validation and role checks. | Corrected and tested for local scope |
| 14 Documentation | Problem, objectives, scope, functional requirements, models, choices, dictionary, implementations, queries, architecture, screenshots, tests, conclusion and future enhancements. | Report and supporting documents |
| 15 Git/GitHub and actual student commits | Real-time implementation commits attributed to Codex, source README and the intended public crisislink repository. Student-specific commits must reflect real subsequent student work. | Published public repository; student authorship pending |
| 16 Demonstration | README demo sequence, execution evidence, screenshot captures and test cases. Both students must rehearse and present their own actual contributions. | Technical demo prepared; student demonstration pending |
| 17 Originality | New application reconstructed from the user-supplied model, with transparent coding-assistance provenance; not a cloned tutorial repository. Originality approval and differences from other teams remain instructor/student responsibilities. | Provenance documented; no originality certification claimed |
| 18 Beyond CRUD and justified database choices | Atomic dispatch, conflict prevention, automatic history, role enforcement, linked SQL/document data, meaningful search and query demonstrations. | Implemented |

## Interpretation notes

- MongoDB is allowed explicitly; a vector database is not mandatory.
- PGlite executes PostgreSQL locally. The brief does not expressly require a separately installed network server; explain the embedded deployment honestly and follow any additional instructor direction.
- Stored functions and procedures are alternatives in the examples; the implemented SQL functions satisfy that concept.
- No artificial backdated commits, student impersonation, fabricated faculty approval or guarantees of marks are used.
- Administrative approval, section uniqueness, genuine individual contribution and viva performance cannot be completed by changing source code.

Public source repository verified: https://github.com/abhinavk0006/crisislink

