-- Idempotent extension for a meaningful SQL CRUD feature in the interface.
-- Responders retain SELECT only; coordinators and technicians maintain tags.
GRANT INSERT, UPDATE, DELETE ON resource_tags
    TO crisis_coordinator, crisis_technician;
