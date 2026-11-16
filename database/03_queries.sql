-- JOIN: show incident type and location.
SELECT e.emergency_id,t.type_name,l.location_name,e.status
FROM emergencies e JOIN emergency_types t USING(type_id)
JOIN locations l USING(location_id) ORDER BY e.emergency_id;

-- Nested scalar query: incidents above the overall affected-people average.
SELECT emergency_id,people_affected FROM emergencies
WHERE people_affected>(SELECT AVG(people_affected) FROM emergencies);

-- Correlated query: incidents with no active assignment.
SELECT e.emergency_id,e.status FROM emergencies e WHERE NOT EXISTS(
 SELECT 1 FROM assignments a WHERE a.emergency_id=e.emergency_id
 AND a.status IN ('active','dispatched'));

-- CTE and window function: latest audit event per incident.
WITH ranked AS (
 SELECT history_id,emergency_id,status,changed_at,
 ROW_NUMBER() OVER(PARTITION BY emergency_id ORDER BY changed_at DESC,history_id DESC) AS rn
 FROM emergency_status_history
) SELECT * FROM ranked WHERE rn=1;

-- Recursive CTE: seven-day reporting calendar, including dates with zero incidents.
WITH RECURSIVE days(day) AS (
 SELECT DATE '2026-10-30'
 UNION ALL SELECT day+1 FROM days WHERE day<DATE '2026-11-05'
) SELECT d.day,COUNT(e.emergency_id) AS incident_count FROM days d
LEFT JOIN emergencies e ON e.reported_at::DATE=d.day
GROUP BY d.day ORDER BY d.day;

-- Grouping and HAVING.
SELECT e.emergency_id,COUNT(a.assignment_id) AS assignments FROM emergencies e
LEFT JOIN assignments a USING(emergency_id) GROUP BY e.emergency_id
HAVING COUNT(a.assignment_id)>=1;

-- Rollback-safe DML example on a disposable tag.
BEGIN;
INSERT INTO resource_tags(resource_id,tag) VALUES(201,'temporary_demo');
UPDATE resource_tags SET tag='updated_demo' WHERE resource_id=201 AND tag='temporary_demo';
SELECT * FROM resource_tags WHERE tag='updated_demo';
DELETE FROM resource_tags WHERE resource_id=201 AND tag='updated_demo';
ROLLBACK;
