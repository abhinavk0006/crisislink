# CrisisLink project specification

Course: Database Management Systems, UE24CS351A. Team: Sachin R (PES1UG24CS688) and Abhinav Krishna Kandukuri (PES1UG24CS701).

## Problem statement

An emergency response team must keep incidents, responders, vehicles, equipment and field updates consistent while several people coordinate a response. Separate incident lists and informal messages can obscure which resource is already assigned, who is responsible for an incident and how its status changed. CrisisLink models these relationships and implements an auditable dispatch workflow using fictional training data.

## Objectives

1. Represent incidents, locations, capabilities, responders, resources and assignments with explicit relational keys and constraints.
2. Prevent conflicting active assignments and change related operational records atomically.
3. Preserve incident status changes automatically in a database audit history.
4. Store variable field assessments and searchable tags in a separate document database.
5. Enforce Coordinator, Responder and Technician permissions in the interface, API and SQL database.
6. Demonstrate database concepts through a working Next.js application, repeatable queries and successful/failing test cases.

## Scope

The application supports a single local classroom deployment, three roles, incident creation, exclusive resource/responder dispatch, response completion, report creation, maintenance records, resource tag management, field-note CRUD and search, and a live SQL query explorer. The initial dataset contains 63 fictional rows in 17 domain tables. Two internal tables manage sessions and login throttling.

The system does not communicate with emergency services, send public alerts, process real patient records, compute travel routes or perform multi-resource quantity optimization. It does not provide a distributed SQL/MongoDB transaction. The local PostgreSQL engine uses PGlite and is intended for a single application process, not multiple server replicas.

## Functional requirements and acceptance conditions

| ID | Functional requirement | Observable acceptance condition |
|---|---|---|
| FR01 | Authenticate active accounts | Valid passwords create expiring sessions; invalid passwords fail; logout revokes the session. |
| FR02 | Enforce three roles | Responder/Technician incident writes and credential-table reads fail independently of hidden UI controls. |
| FR03 | Record incidents | A coordinator saves validated type, location, description, severity, affected-person count and capability requirement. |
| FR04 | Preserve status history | INSERT and actual status changes create one automatic audit event; unchanged status creates none. |
| FR05 | Dispatch a response | A coordinator selects an available resource and responder; capability checks, assignment creation and reservations commit together. |
| FR06 | Reject conflicts | An occupied resource/responder or invalid reference fails without partial operational changes. |
| FR07 | Complete an assignment | The assigned responder or coordinator creates a report, completes the assignment, releases the team and resolves an incident when no active assignments remain. |
| FR08 | Record maintenance | A technician or coordinator saves nonnegative cost and their own author identity. SQL RLS rejects another author. |
| FR09 | Manage resource tags in SQL | Authorized users add, read, rename and remove tags through the Resources screen; responders are read-only. |
| FR10 | Manage field notes in MongoDB | Authorized users create/read/update/delete notes; SQL incident references, assignment scope and ownership are validated. |
| FR11 | Search and summarize notes | An incident-specific text query searches indexed text/tags; aggregation counts notes by tag. |
| FR12 | Execute relational query examples | Allowlisted JOIN, aggregate, scalar/correlated subquery, CTE/window, recursive and view queries execute against current SQL data. |
| FR13 | Report failures truthfully | Validation, permission, conflict and database outage failures return explicit errors without claiming an unconfirmed save. |
| FR14 | Maintain password confidentiality | Setup accepts hidden input, persists only independently salted scrypt hashes, and creates no plaintext password file. |
| FR15 | Demonstrate DDL safely | CREATE, ALTER and DROP run against a disposable temporary table without dropping operational tables. |

## Database choice

PostgreSQL is responsible for structured relationships, referential integrity, transactions, SQL functions, triggers, views and permissions. PGlite runs the real PostgreSQL engine locally with filesystem persistence. MongoDB stores variable field assessments as documents and supports field-note text search and tag aggregation. This implements the requirements' SQL plus NoSQL option; a vector database is optional and is not needed for this design.

## Conclusion and future enhancements

CrisisLink connects database design to an operational web workflow: an incident moves from reporting to dispatch and completion while SQL controls integrity and MongoDB retains searchable field updates. The application goes beyond independent CRUD screens through transaction boundaries, automatic audit history, role checks, conflict rejection and linked SQL/document operations.

Future enhancements include a separately hosted PostgreSQL service for multi-process deployments, authenticated MongoDB/TLS deployment, multi-resource allocation using requirement quantities, explicit cross-database retry/outbox processing, map-based location selection and optional semantic retrieval of field notes. These are future work, not present features.

## Administrative and contribution evidence

The two-member team and title must be approved by the instructor, and the title must be unique within the section. These are external facts the implementation cannot establish. Individual contributions and viva readiness must be evidenced by the students' actual work and explanations. The generated implementation commits are attributed to Codex; they do not claim student authorship.

Suggested responsibilities for future student work: Sachin leads relational-model review, incident/API validation and SQL query demonstrations; Abhinav leads document-model review, resource/maintenance UI and role/security tests. Each should modify and test both a database component and an application component, review the other's work and record only the work actually performed. This allocation is a plan, not a record of completed contributions.
