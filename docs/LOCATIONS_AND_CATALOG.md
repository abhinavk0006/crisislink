# Bengaluru locations and operational catalog

The catalog now supplies 12 incident types, 16 capabilities, 20 resources, 15 responders and 30 saved places across 12 Bengaluru areas. The original 17 domain tables remain. A fresh initialization has 251 domain rows after the additive catalog migration; the original supplied package had 63. These are sample operational records, not a claim of actual emergency-service inventory.

## Location entry

Report incident offers area → location group → saved building/place. Under Banashankari, choose PES University — RR Campus. Buildings: MRD Block, GJB Block, BE Block, F Block, G Block and Tech Park. The campus as a whole and the cafeteria are also saved places. Optional floor/room/directions stay in reported_location_text and appear with the incident. Selecting BE Block never silently selects GJB Block.

Users can enter a street/address and landmark, search saved places, confirm a suggestion or explicitly save a new landmark. Custom locations persist in SQL, including addresses that are not in the initial catalog. Coordinates are not inferred. Area labels are catalog categories; this is not a geocoding or routing service.

## Two uses of genuine vector search

1. Location resolution: indexLocations embeds the saved place name, address, area, street, campus/building and aliases with the same pinned local 384-dimensional MiniLM model. resolveLocations first finds exact names/aliases, then performs native pgvector cosine retrieval within the chosen area. The UI labels exact and semantic results separately and requires a human selection. It does not equate a nearest neighbour with an exact address. A source-text comparison prevents stale vectors and concurrent source overwrites. On model failure, exact matches remain available and the UI states the limitation.
2. Duplicate report review: after the coordinator confirms the canonical location ID, the existing incident vectors search active reports at that specific saved place within 24 hours. The human still chooses attach or create separately. Reported floor/room details help that decision. Canonical building-level matching may suggest events on different floors; no floor-level identity guarantee is claimed.

The original typed location is retained in SQL for a new incident and in MongoDB assessment for an attached additional report. The existing SQL live lab, dispatch transactions, status triggers, MongoDB field-note CRUD and role checks are retained.

## Source mapping

- database/catalog.json → tools/build-catalog.py → database/09_operational_catalog.sql: repeatable additive catalog.
- database/10_location_search.sql: location vector(384), source/model metadata, cosine HNSW index, reported location text and coordinator INSERT permission.
- lib/locations.ts: indexLocations, resolveLocations, createLocation.
- app/api/[...path]/route.ts: authenticated POST /api/locations/resolve and POST /api/locations.
- app/page.tsx: cascading campus/building selectors, typed address, matching and explicit selection.
- lib/service.ts: canonical location + original entered details stored with incident.
- lib/mongo.ts: saveAdditionalReport retains submitted location details.
- tests/locations.test.ts: real offline vectors, area separation, alias identity, custom locations, migration preservation, roles and new hazardous-material dispatch.

Additional responders are operational team records with no login (user_id NULL); the five existing accounts remain. The coordinator can dispatch and complete these teams. Migrations do not reset passwords or availability and preserve custom records. No accounts or real-world qualifications are fabricated.

## Campus naming sources (checked 26 November 2026)

Official PES sources: [MRD Block / CIE](https://cie.pes.edu/contact), [GJB event venue](https://events.pes.edu/10841/), [BE Block event venue](https://events.pes.edu/11438/), [G Block event venue](https://events.pes.edu/11135/), [Tech Park event venue](https://news.pes.edu/12150/), [RR Campus address](https://pes.edu/contact/).

F Block and the broader campus building list were cross-checked against the community [RR Campus guide](https://pesqts.vercel.app/rrc-campus.html). Floor assignments, departments and individual rooms are not pre-populated from potentially changing guides; users enter the actual floor/room.
