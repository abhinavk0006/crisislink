-- Fictional demonstration records; no real credentials or personal data.
BEGIN;
INSERT INTO roles VALUES
(1,'Coordinator','Assigns response teams'),
(2,'Responder','Responds to incidents'),
(3,'Technician','Maintains equipment');
INSERT INTO users VALUES
(1,'Demo Coordinator','coordinator@example.com','DEMO_NOT_A_REAL_HASH','9000000001',1,'active','2026-10-30 08:00:00'),
(2,'Demo Firefighter','fire@example.com','DEMO_NOT_A_REAL_HASH','9000000002',2,'active','2026-10-30 08:00:00'),
(3,'Demo Medic','medic@example.com','DEMO_NOT_A_REAL_HASH','9000000003',2,'active','2026-10-30 08:00:00'),
(4,'Demo Rescue Worker','rescue@example.com','DEMO_NOT_A_REAL_HASH','9000000004',2,'active','2026-10-30 08:00:00'),
(5,'Demo Technician','tech@example.com','DEMO_NOT_A_REAL_HASH','9000000005',3,'active','2026-10-30 08:00:00');
INSERT INTO emergency_types VALUES
(1,'Fire','Building or outdoor fire'),(2,'Medical','Medical assistance'),(3,'Flood','Water rescue');
INSERT INTO locations VALUES
(1,'Demo Market','Training Road A',12.9716,77.5946,'high'),
(2,'Demo Campus','Training Road B',12.9352,77.6245,'medium'),
(3,'Demo Riverside','Training Road C',13.0100,77.5800,'high');
INSERT INTO emergencies VALUES
(101,1,1,1,'Training warehouse fire','high',20,'responding','2026-10-30 09:00:00','2026-10-30 09:10:00'),
(102,2,2,1,'Training medical incident','medium',2,'resolved','2026-10-30 10:00:00','2026-10-30 10:45:00'),
(103,3,3,1,'Training flood rescue','high',12,'responding','2026-10-30 11:00:00','2026-10-30 11:10:00');
INSERT INTO emergency_status_history VALUES
(1,101,'reported','Call registered',1,'2026-10-30 09:00:00'),
(2,101,'responding','Fire team dispatched',1,'2026-10-30 09:10:00'),
(3,102,'reported','Call registered',1,'2026-10-30 10:00:00'),
(4,102,'resolved','Patient transferred safely',3,'2026-10-30 10:45:00'),
(5,103,'reported','Call registered',1,'2026-10-30 11:00:00'),
(6,103,'responding','Boat dispatched',1,'2026-10-30 11:10:00');
INSERT INTO capabilities VALUES
(1,'Fire suppression','Extinguish fires'),(2,'Medical support','Provide first aid'),(3,'Water rescue','Rescue from floodwater');
INSERT INTO emergency_required_capabilities VALUES
(101,1,1,'Demo Market','Training Road A',1),
(102,2,2,'Demo Campus','Training Road B',1),
(103,3,3,'Demo Riverside','Training Road C',1);
INSERT INTO responders VALUES
(1,2,'EMP-F01','Fire Team','on_duty'),
(2,3,'EMP-M01','Medical Team','available'),
(3,4,'EMP-R01','Rescue Team','on_duty');
INSERT INTO resource_types VALUES
(1,'Fire engine','Fire response vehicle'),(2,'Ambulance','Medical transport'),(3,'Rescue boat','Water rescue craft');
INSERT INTO resources VALUES
(201,1,'Demo Fire Engine','FIRE-01','assigned',1,6),
(202,2,'Demo Ambulance','MED-01','available',2,2),
(203,3,'Demo Rescue Boat','RESCUE-01','assigned',3,8);
INSERT INTO resource_capabilities VALUES
(201,1,'advanced'),(201,2,'basic'),(202,2,'advanced'),(203,3,'advanced');
INSERT INTO assignments VALUES
(301,101,201,1,'2026-10-30 09:05:00','2026-10-30 09:10:00','dispatched','Fire engine dispatched',1),
(302,102,202,1,'2026-10-30 10:05:00','2026-10-30 10:10:00','completed','Medical response completed',2),
(303,103,203,1,'2026-10-30 11:05:00','2026-10-30 11:10:00','dispatched','Boat dispatched',3);
INSERT INTO maintenance_records VALUES
(401,201,'Inspection','Post-drill inspection','2026-10-30 12:00:00','2026-11-30','completed',5,1500.00,301),
(402,202,'Sanitization','Post-response cleaning','2026-10-30 12:15:00','2026-11-06','completed',5,500.00,302),
(403,203,'Engine service','Post-drill engine check','2026-10-30 12:30:00','2026-11-30','completed',5,2200.00,303);
INSERT INTO responder_reports VALUES
(501,101,1,'Smoke in warehouse','Evacuation in progress','Fire engine and hoses',20,'Response ongoing','2026-10-30 09:30:00',301),
(502,102,2,'Two patients need care','First aid and transport','Ambulance and medical kit',2,'Patients transferred','2026-10-30 10:45:00',302),
(503,103,3,'People stranded','Rescue operation started','Boat and life jackets',12,'Response ongoing','2026-10-30 11:30:00',303);
INSERT INTO responder_skills VALUES
(1,'Fire suppression'),(1,'First aid'),(2,'First aid'),(2,'Patient transport'),(3,'Swimming'),(3,'Water rescue');
INSERT INTO resource_tags VALUES
(201,'fire'),(201,'heavy_vehicle'),(202,'medical'),(202,'patient_transport'),(203,'water'),(203,'rescue');
COMMIT;

