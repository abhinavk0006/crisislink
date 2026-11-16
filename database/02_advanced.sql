-- PostgreSQL application extensions. Apply after the supplied 63-row seed.
-- Database roles are deliberately NOLOGIN: the trusted backend selects a role
-- inside each transaction after authenticating a session.
CREATE ROLE crisis_coordinator NOLOGIN;
CREATE ROLE crisis_responder NOLOGIN;
CREATE ROLE crisis_technician NOLOGIN;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO crisis_coordinator, crisis_responder, crisis_technician;

ALTER TABLE users ADD CONSTRAINT uq_users_email UNIQUE(email);
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
ALTER TABLE users ALTER COLUMN role_id SET NOT NULL;
ALTER TABLE responders ADD CONSTRAINT uq_responder_user UNIQUE(user_id);
ALTER TABLE emergencies ALTER COLUMN type_id SET NOT NULL;
ALTER TABLE emergencies ALTER COLUMN location_id SET NOT NULL;
ALTER TABLE emergencies ALTER COLUMN reported_by SET NOT NULL;
ALTER TABLE emergencies ALTER COLUMN description SET NOT NULL;
ALTER TABLE emergencies ADD CONSTRAINT ck_severity CHECK(severity_level IN ('low','medium','high','critical'));
ALTER TABLE emergencies ADD CONSTRAINT ck_status CHECK(status IN ('reported','responding','resolved'));
ALTER TABLE emergencies ADD CONSTRAINT ck_time CHECK(updated_at >= reported_at);
ALTER TABLE assignments ALTER COLUMN emergency_id SET NOT NULL;
ALTER TABLE assignments ALTER COLUMN resource_id SET NOT NULL;
ALTER TABLE assignments ALTER COLUMN responder_id SET NOT NULL;
ALTER TABLE assignments ALTER COLUMN assigned_by SET NOT NULL;
CREATE UNIQUE INDEX uq_active_resource ON assignments(resource_id)
  WHERE status IN ('active','dispatched');
CREATE UNIQUE INDEX uq_active_responder ON assignments(responder_id)
  WHERE status IN ('active','dispatched');
CREATE INDEX idx_emergency_status_time ON emergencies(status,reported_at DESC);
CREATE INDEX idx_history_time ON emergency_status_history(emergency_id,changed_at DESC);
CREATE INDEX idx_assignment_emergency ON assignments(emergency_id);

CREATE TABLE app_sessions (
  token_hash VARCHAR(64) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE app_login_attempts (
  attempt_key VARCHAR(64) PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  blocked_until TIMESTAMPTZ
);

CREATE VIEW v_assignment_summary AS
SELECT a.assignment_id,a.emergency_id,r.resource_name,p.employee_id,
       a.status,a.assigned_at,a.responder_id,p.user_id
FROM assignments a JOIN resources r USING(resource_id)
JOIN responders p USING(responder_id);

CREATE FUNCTION app_actor() RETURNS INTEGER LANGUAGE SQL STABLE AS $$
  SELECT NULLIF(current_setting('app.user_id',true),'')::INTEGER
$$;

CREATE FUNCTION record_emergency_status() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO emergency_status_history(emergency_id,status,remarks,changed_by,changed_at)
    VALUES(NEW.emergency_id,NEW.status,'Automatic status audit',app_actor(),CURRENT_TIMESTAMP);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_emergency_status AFTER INSERT OR UPDATE OF status ON emergencies
FOR EACH ROW EXECUTE FUNCTION record_emergency_status();

CREATE FUNCTION dispatch_response(p_emergency INTEGER,p_resource INTEGER,p_responder INTEGER)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE new_id INTEGER; e emergencies; r resources; p responders;
BEGIN
  SELECT * INTO e FROM emergencies WHERE emergency_id=p_emergency FOR UPDATE;
  IF NOT FOUND OR e.status='resolved' THEN RAISE EXCEPTION 'Incident is missing or resolved' USING ERRCODE='P0001'; END IF;
  SELECT * INTO r FROM resources WHERE resource_id=p_resource FOR UPDATE;
  IF NOT FOUND OR r.status<>'available' THEN RAISE EXCEPTION 'Resource is unavailable' USING ERRCODE='P0001'; END IF;
  SELECT * INTO p FROM responders WHERE responder_id=p_responder FOR UPDATE;
  IF NOT FOUND OR p.status<>'available' THEN RAISE EXCEPTION 'Responder is unavailable' USING ERRCODE='P0001'; END IF;
  IF EXISTS(SELECT 1 FROM emergency_required_capabilities c
    WHERE c.emergency_id=p_emergency AND NOT EXISTS(
      SELECT 1 FROM resource_capabilities rc WHERE rc.resource_id=p_resource
      AND rc.capability_id=c.capability_id)) THEN
    RAISE EXCEPTION 'Resource does not cover required capabilities' USING ERRCODE='P0001';
  END IF;
  INSERT INTO assignments(emergency_id,resource_id,responder_id,assigned_by,assigned_at,dispatch_time,status,remarks)
  VALUES(p_emergency,p_resource,p_responder,app_actor(),CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,'dispatched','Dispatched through application')
  RETURNING assignment_id INTO new_id;
  UPDATE resources SET status='assigned' WHERE resource_id=p_resource;
  UPDATE responders SET status='on_duty' WHERE responder_id=p_responder;
  UPDATE emergencies SET status='responding',updated_at=CURRENT_TIMESTAMP WHERE emergency_id=p_emergency;
  RETURN new_id;
END;
$$;

CREATE FUNCTION finish_response(p_assignment INTEGER,p_outcome TEXT)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE a assignments; new_report INTEGER;
BEGIN
  SELECT * INTO a FROM assignments WHERE assignment_id=p_assignment FOR UPDATE;
  IF NOT FOUND OR a.status NOT IN ('active','dispatched') THEN
    RAISE EXCEPTION 'Assignment is not active' USING ERRCODE='P0001';
  END IF;
  IF current_setting('role')<>'crisis_coordinator' AND NOT EXISTS(
    SELECT 1 FROM responders WHERE responder_id=a.responder_id AND user_id=app_actor()) THEN
    RAISE EXCEPTION 'Assignment belongs to another responder' USING ERRCODE='42501';
  END IF;
  INSERT INTO responder_reports(emergency_id,responder_id,assignment_id,initial_assessment,actions_taken,resources_used,people_affected,outcome,reported_at)
  VALUES(a.emergency_id,a.responder_id,a.assignment_id,'Field response','Response completed',a.resource_id::TEXT,0,p_outcome,CURRENT_TIMESTAMP)
  RETURNING report_id INTO new_report;
  UPDATE assignments SET status='completed' WHERE assignment_id=p_assignment;
  UPDATE resources SET status='available' WHERE resource_id=a.resource_id;
  UPDATE responders SET status='available' WHERE responder_id=a.responder_id;
  IF NOT EXISTS(SELECT 1 FROM assignments WHERE emergency_id=a.emergency_id AND status IN ('active','dispatched')) THEN
    UPDATE emergencies SET status='resolved',updated_at=CURRENT_TIMESTAMP WHERE emergency_id=a.emergency_id;
  END IF;
  RETURN new_report;
END;
$$;

-- No table write permissions are granted to responder/technician for incidents.
GRANT SELECT ON roles,emergency_types,locations,emergencies,emergency_status_history,
 capabilities,emergency_required_capabilities,responders,resource_types,resources,
 resource_capabilities,assignments,maintenance_records,responder_reports,
 responder_skills,resource_tags,v_assignment_summary
 TO crisis_coordinator,crisis_responder,crisis_technician;
GRANT INSERT,UPDATE ON emergencies TO crisis_coordinator;
GRANT INSERT ON emergency_required_capabilities TO crisis_coordinator;
GRANT INSERT ON maintenance_records TO crisis_technician,crisis_coordinator;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO crisis_coordinator,crisis_technician;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_actor() TO crisis_coordinator,crisis_responder,crisis_technician;
GRANT EXECUTE ON FUNCTION dispatch_response(INTEGER,INTEGER,INTEGER) TO crisis_coordinator;
GRANT EXECUTE ON FUNCTION finish_response(INTEGER,TEXT) TO crisis_coordinator,crisis_responder;

-- RLS is independent of the UI/API permission checks.
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY maintenance_read ON maintenance_records FOR SELECT
  TO crisis_coordinator,crisis_responder,crisis_technician USING(true);
CREATE POLICY maintenance_author ON maintenance_records FOR INSERT
  TO crisis_coordinator,crisis_technician WITH CHECK(performed_by=app_actor());
