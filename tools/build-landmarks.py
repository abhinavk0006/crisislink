"""Generate repeatable landmarks without fixed IDs that can overwrite custom locations."""
from pathlib import Path
import json
r=Path(__file__).resolve().parents[1]
rows=json.loads((r/'database/area-landmarks.json').read_text(encoding='utf8'))
def q(v):return "'"+v.replace("'","''")+"'"
sql=["-- Curated area landmarks; no coordinates or exact street addresses inferred.",
"ALTER TABLE locations ADD COLUMN IF NOT EXISTS catalog_key TEXT;",
"CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_catalog_key ON locations(catalog_key);"]
for d in rows:
 aliases="ARRAY["+','.join(q(a) for a in d['aliases'])+"]::TEXT[]"
 sql.append(f"INSERT INTO locations(location_name,address,area,street,risk_level,aliases,catalog_key) VALUES({q(d['name'])},{q(d['area']+', Bengaluru')},{q(d['area'])},NULL,'unassessed',{aliases},{q(d['key'])}) ON CONFLICT(catalog_key) DO NOTHING;")
(r/'database/11_area_landmarks.sql').write_text('\n'.join(sql)+'\n',encoding='utf8')
print(f"Generated {len(rows)} additional places")
