-- Internal idempotency/decision receipts; not a new domain entity.
CREATE TABLE IF NOT EXISTS app_incident_report_receipts (
  review_id VARCHAR(36) PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id),
  action VARCHAR(10) NOT NULL CHECK(action IN ('create','attach')),
  draft_hash VARCHAR(64) NOT NULL,
  emergency_id INTEGER REFERENCES emergencies(emergency_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
GRANT SELECT,INSERT,UPDATE ON app_incident_report_receipts TO crisis_coordinator;
