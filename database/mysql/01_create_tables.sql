-- Emergency Response Database: MySQL 8.0.16+
-- Same 17 relations and 26 foreign keys as the supplied PDF.
-- Run once in a NEW database. No existing tables are dropped.
CREATE DATABASE emergency_response_demo CHARACTER SET utf8mb4;
USE emergency_response_demo;

CREATE TABLE roles (
    role_id INTEGER NOT NULL,
    role_name VARCHAR(255),
    description TEXT,
    CONSTRAINT pk_roles PRIMARY KEY (role_id)
) ENGINE=InnoDB;

CREATE TABLE users (
    user_id INTEGER NOT NULL,
    full_name VARCHAR(255),
    email VARCHAR(255),
    password_hash VARCHAR(255),
    phone VARCHAR(255),
    role_id INTEGER,
    status VARCHAR(255),
    created_at TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT pk_users PRIMARY KEY (user_id),
    CONSTRAINT fk_user_role FOREIGN KEY (role_id)
        REFERENCES roles (role_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB;

CREATE TABLE emergency_types (
    type_id INTEGER NOT NULL,
    type_name VARCHAR(255),
    description TEXT,
    CONSTRAINT pk_emergency_types PRIMARY KEY (type_id)
) ENGINE=InnoDB;

CREATE TABLE locations (
    location_id INTEGER NOT NULL,
    location_name VARCHAR(255),
    address TEXT,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    risk_level VARCHAR(255),
    CONSTRAINT pk_locations PRIMARY KEY (location_id),
    CONSTRAINT ck_latitude CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT ck_longitude CHECK (longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB;

CREATE TABLE emergencies (
    emergency_id INTEGER NOT NULL,
    type_id INTEGER,
    location_id INTEGER,
    reported_by INTEGER,
    description TEXT,
    severity_level VARCHAR(255),
    people_affected INTEGER,
    status VARCHAR(255),
    reported_at TIMESTAMP NULL DEFAULT NULL,
    updated_at TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT pk_emergencies PRIMARY KEY (emergency_id),
    CONSTRAINT fk_emergency_type FOREIGN KEY (type_id)
        REFERENCES emergency_types (type_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_emergency_location FOREIGN KEY (location_id)
        REFERENCES locations (location_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_reports FOREIGN KEY (reported_by)
        REFERENCES users (user_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT ck_people_affected CHECK (people_affected >= 0)
) ENGINE=InnoDB;

CREATE TABLE emergency_status_history (
    history_id INTEGER NOT NULL,
    emergency_id INTEGER,
    status VARCHAR(255),
    remarks TEXT,
    changed_by INTEGER,
    changed_at TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT pk_emergency_status_history PRIMARY KEY (history_id),
    CONSTRAINT fk_emergency_history FOREIGN KEY (emergency_id)
        REFERENCES emergencies (emergency_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_history_author FOREIGN KEY (changed_by)
        REFERENCES users (user_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB;

CREATE TABLE capabilities (
    capability_id INTEGER NOT NULL,
    capability_name VARCHAR(255),
    description TEXT,
    CONSTRAINT pk_capabilities PRIMARY KEY (capability_id)
) ENGINE=InnoDB;

CREATE TABLE emergency_required_capabilities (
    emergency_id INTEGER NOT NULL,
    capability_id INTEGER NOT NULL,
    location_id INTEGER,
    location_name VARCHAR(255),
    address TEXT,
    quantity_required INTEGER,
    CONSTRAINT pk_emergency_required_capabilities PRIMARY KEY (emergency_id, capability_id),
    CONSTRAINT fk_requires_for FOREIGN KEY (capability_id)
        REFERENCES capabilities (capability_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_requirement_emergency FOREIGN KEY (emergency_id)
        REFERENCES emergencies (emergency_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_requirement_location FOREIGN KEY (location_id)
        REFERENCES locations (location_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT ck_quantity CHECK (quantity_required >= 0)
) ENGINE=InnoDB;

CREATE TABLE responders (
    responder_id INTEGER NOT NULL,
    user_id INTEGER,
    employee_id VARCHAR(255),
    team VARCHAR(255),
    status VARCHAR(255),
    CONSTRAINT pk_responders PRIMARY KEY (responder_id),
    CONSTRAINT fk_responder_user FOREIGN KEY (user_id)
        REFERENCES users (user_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB;

CREATE TABLE resource_types (
    type_id INTEGER NOT NULL,
    type_name VARCHAR(255),
    description TEXT,
    CONSTRAINT pk_resource_types PRIMARY KEY (type_id)
) ENGINE=InnoDB;

CREATE TABLE resources (
    resource_id INTEGER NOT NULL,
    type_id INTEGER,
    resource_name VARCHAR(255),
    call_sign VARCHAR(255),
    status VARCHAR(255),
    current_location_id INTEGER,
    capacity INTEGER,
    CONSTRAINT pk_resources PRIMARY KEY (resource_id),
    CONSTRAINT fk_resource_type FOREIGN KEY (type_id)
        REFERENCES resource_types (type_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_resource_location FOREIGN KEY (current_location_id)
        REFERENCES locations (location_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT ck_capacity CHECK (capacity >= 0)
) ENGINE=InnoDB;

CREATE TABLE resource_capabilities (
    resource_id INTEGER NOT NULL,
    capability_id INTEGER NOT NULL,
    proficiency_level VARCHAR(255),
    CONSTRAINT pk_resource_capabilities PRIMARY KEY (resource_id, capability_id),
    CONSTRAINT fk_possesses FOREIGN KEY (resource_id)
        REFERENCES resources (resource_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_resource_capability FOREIGN KEY (capability_id)
        REFERENCES capabilities (capability_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB;

CREATE TABLE assignments (
    assignment_id INTEGER NOT NULL,
    emergency_id INTEGER,
    resource_id INTEGER,
    assigned_by INTEGER,
    assigned_at TIMESTAMP NULL DEFAULT NULL,
    dispatch_time TIMESTAMP NULL DEFAULT NULL,
    status VARCHAR(255),
    remarks TEXT,
    responder_id INTEGER,
    CONSTRAINT pk_assignments PRIMARY KEY (assignment_id),
    CONSTRAINT fk_assigned_in FOREIGN KEY (resource_id)
        REFERENCES resources (resource_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_assignment_emergency FOREIGN KEY (emergency_id)
        REFERENCES emergencies (emergency_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_assignment_author FOREIGN KEY (assigned_by)
        REFERENCES users (user_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_submits_drawn FOREIGN KEY (responder_id)
        REFERENCES responders (responder_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB;

CREATE TABLE maintenance_records (
    maintenance_id INTEGER NOT NULL,
    resource_id INTEGER,
    maintenance_type VARCHAR(255),
    description TEXT,
    performed_on TIMESTAMP NULL DEFAULT NULL,
    next_due_date DATE,
    status VARCHAR(255),
    performed_by INTEGER,
    cost DECIMAL(12,2),
    assignment_id INTEGER,
    CONSTRAINT pk_maintenance_records PRIMARY KEY (maintenance_id),
    CONSTRAINT fk_maintenance_resource FOREIGN KEY (resource_id)
        REFERENCES resources (resource_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_maintenance_author FOREIGN KEY (performed_by)
        REFERENCES users (user_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_has_drawn FOREIGN KEY (assignment_id)
        REFERENCES assignments (assignment_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT ck_cost CHECK (cost >= 0)
) ENGINE=InnoDB;

CREATE TABLE responder_reports (
    report_id INTEGER NOT NULL,
    emergency_id INTEGER,
    responder_id INTEGER,
    initial_assessment TEXT,
    actions_taken TEXT,
    resources_used TEXT,
    people_affected INTEGER,
    outcome TEXT,
    reported_at TIMESTAMP NULL DEFAULT NULL,
    assignment_id INTEGER,
    CONSTRAINT pk_responder_reports PRIMARY KEY (report_id),
    CONSTRAINT fk_report_emergency FOREIGN KEY (emergency_id)
        REFERENCES emergencies (emergency_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_report_responder FOREIGN KEY (responder_id)
        REFERENCES responders (responder_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT fk_report_assignment_drawn FOREIGN KEY (assignment_id)
        REFERENCES assignments (assignment_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT ck_report_people CHECK (people_affected >= 0)
) ENGINE=InnoDB;

CREATE TABLE responder_skills (
    responder_id INTEGER NOT NULL,
    skill VARCHAR(100) NOT NULL,
    CONSTRAINT pk_responder_skills PRIMARY KEY (responder_id, skill),
    CONSTRAINT fk_responder_skills FOREIGN KEY (responder_id)
        REFERENCES responders (responder_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB;

CREATE TABLE resource_tags (
    resource_id INTEGER NOT NULL,
    tag VARCHAR(100) NOT NULL,
    CONSTRAINT pk_resource_tags PRIMARY KEY (resource_id, tag),
    CONSTRAINT fk_resource_tags FOREIGN KEY (resource_id)
        REFERENCES resources (resource_id)
        ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB;

