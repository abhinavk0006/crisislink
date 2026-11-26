# CrisisLink data dictionary

Generated from the executed PostgreSQL schema: 17 domain tables and 2 internal tables. The metadata contains no row data, passwords or session tokens.

## app_login_attempts

| Attribute | SQL type | Nullable | Identity |
|---|---|---|---|
| attempt_key | character varying(64) | No | No |
| failures | integer | No | No |
| blocked_until | timestamp with time zone | Yes | No |

Constraints:

- **app_login_attempts_attempt_key_not_null**: `NOT NULL attempt_key`
- **app_login_attempts_failures_not_null**: `NOT NULL failures`
- **app_login_attempts_pkey**: `PRIMARY KEY (attempt_key)`

## app_sessions

| Attribute | SQL type | Nullable | Identity |
|---|---|---|---|
| token_hash | character varying(64) | No | No |
| user_id | integer | No | No |
| expires_at | timestamp with time zone | No | No |

Constraints:

- **app_sessions_expires_at_not_null**: `NOT NULL expires_at`
- **app_sessions_pkey**: `PRIMARY KEY (token_hash)`
- **app_sessions_token_hash_not_null**: `NOT NULL token_hash`
- **app_sessions_user_id_fkey**: `FOREIGN KEY (user_id) REFERENCES users(user_id)`
- **app_sessions_user_id_not_null**: `NOT NULL user_id`

## assignments

| Attribute | SQL type | Nullable | Identity |
|---|---|---|---|
| assignment_id | integer | No | BY DEFAULT |
| emergency_id | integer | No | No |
| resource_id | integer | No | No |
| assigned_by | integer | No | No |
| assigned_at | timestamp with time zone | Yes | No |
| dispatch_time | timestamp with time zone | Yes | No |
| status | character varying(255) | Yes | No |
| remarks | text | Yes | No |
| responder_id | integer | No | No |

Constraints:

- **assignments_assigned_by_not_null**: `NOT NULL assigned_by`
- **assignments_assignment_id_not_null**: `NOT NULL assignment_id`
- **assignments_emergency_id_not_null**: `NOT NULL emergency_id`
- **assignments_resource_id_not_null**: `NOT NULL resource_id`
- **assignments_responder_id_not_null**: `NOT NULL responder_id`
- **fk_assigned_in**: `FOREIGN KEY (resource_id) REFERENCES resources(resource_id)`
- **fk_assignment_author**: `FOREIGN KEY (assigned_by) REFERENCES users(user_id)`
- **fk_assignment_emergency**: `FOREIGN KEY (emergency_id) REFERENCES emergencies(emergency_id)`
- **fk_submits_drawn**: `FOREIGN KEY (responder_id) REFERENCES responders(responder_id)`
- **pk_assignments**: `PRIMARY KEY (assignment_id)`

## capabilities

| Attribute | SQL type | Nullable | Identity |
|---|---|---|---|
| capability_id | integer | No | BY DEFAULT |
| capability_name | character varying(255) | Yes | No |
| description | text | Yes | No |

Constraints:

- **capabilities_capability_id_not_null**: `NOT NULL capability_id`
- **pk_capabilities**: `PRIMARY KEY (capability_id)`

## emergencies

| Attribute | SQL type | Nullable | Identity |
|---|---|---|---|
| emergency_id | integer | No | BY DEFAULT |
| type_id | integer | No | No |
| location_id | integer | No | No |
| reported_by | integer | No | No |
| description | text | No | No |
| severity_level | character varying(255) | Yes | No |
| people_affected | integer | Yes | No |
| status | character varying(255) | Yes | No |
| reported_at | timestamp with time zone | Yes | No |
| updated_at | timestamp with time zone | Yes | No |
| embedding | vector(384) | Yes | No |
| embedding_model | character varying(160) | Yes | No |
| embedded_at | timestamp with time zone | Yes | No |

Constraints:

- **ck_people_affected**: `CHECK ((people_affected >= 0))`
- **ck_severity**: `CHECK (((severity_level)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[])))`
- **ck_status**: `CHECK (((status)::text = ANY ((ARRAY['reported'::character varying, 'responding'::character varying, 'resolved'::character varying])::text[])))`
- **ck_time**: `CHECK ((updated_at >= reported_at))`
- **emergencies_description_not_null**: `NOT NULL description`
- **emergencies_emergency_id_not_null**: `NOT NULL emergency_id`
- **emergencies_location_id_not_null**: `NOT NULL location_id`
- **emergencies_reported_by_not_null**: `NOT NULL reported_by`
- **emergencies_type_id_not_null**: `NOT NULL type_id`
- **fk_emergency_location**: `FOREIGN KEY (location_id) REFERENCES locations(location_id)`
- **fk_emergency_type**: `FOREIGN KEY (type_id) REFERENCES emergency_types(type_id)`
- **fk_reports**: `FOREIGN KEY (reported_by) REFERENCES users(user_id)`
- **pk_emergencies**: `PRIMARY KEY (emergency_id)`

## emergency_required_capabilities

| Attribute | SQL type | Nullable | Identity |
|---|---|---|---|
| emergency_id | integer | No | No |
| capability_id | integer | No | BY DEFAULT |
| location_id | integer | Yes | No |
| location_name | character varying(255) | Yes | No |
| address | text | Yes | No |
| quantity_required | integer | Yes | No |

Constraints:

- **ck_quantity**: `CHECK ((quantity_required >= 0))`
- **emergency_required_capabilities_capability_id_not_null**: `NOT NULL capability_id`
- **emergency_required_capabilities_emergency_id_not_null**: `NOT NULL emergency_id`
- **fk_requirement_emergency**: `FOREIGN KEY (emergency_id) REFERENCES emergencies(emergency_id)`
- **fk_requirement_location**: `FOREIGN KEY (location_id) REFERENCES locations(location_id)`
- **fk_requires_for**: `FOREIGN KEY (capability_id) REFERENCES capabilities(capability_id)`
- **pk_emergency_required_capabilities**: `PRIMARY KEY (emergency_id, capability_id)`

## emergency_status_history

| Attribute | SQL type | Nullable | Identity |
|---|---|---|---|
| history_id | integer | No | BY DEFAULT |
| emergency_id | integer | Yes | No |
| status | character varying(255) | Yes | No |
| remarks | text | Yes | No |
| changed_by | integer | Yes | No |
| changed_at | timestamp with time zone | Yes | No |

Constraints:

- **emergency_status_history_history_id_not_null**: `NOT NULL history_id`
- **fk_emergency_history**: `FOREIGN KEY (emergency_id) REFERENCES emergencies(emergency_id)`
- **fk_history_author**: `FOREIGN KEY (changed_by) REFERENCES users(user_id)`
- **pk_emergency_status_history**: `PRIMARY KEY (history_id)`

## emergency_types

| Attribute | SQL type | Nullable | Identity |
|---|---|---|---|
| type_id | integer | No | BY DEFAULT |
| type_name | character varying(255) | Yes | No |
| description | text | Yes | No |

Constraints:

- **emergency_types_type_id_not_null**: `NOT NULL type_id`
- **pk_emergency_types**: `PRIMARY KEY (type_id)`

## locations

| Attribute | SQL type | Nullable | Identity |
|---|---|---|---|
| location_id | integer | No | BY DEFAULT |
| location_name | character varying(255) | Yes | No |
| address | text | Yes | No |
| latitude | numeric(10,7) | Yes | No |
| longitude | numeric(10,7) | Yes | No |
| risk_level | character varying(255) | Yes | No |

Constraints:

- **ck_latitude**: `CHECK (((latitude >= ('-90'::integer)::numeric) AND (latitude <= (90)::numeric)))`
- **ck_longitude**: `CHECK (((longitude >= ('-180'::integer)::numeric) AND (longitude <= (180)::numeric)))`
- **locations_location_id_not_null**: `NOT NULL location_id`
- **pk_locations**: `PRIMARY KEY (location_id)`

## maintenance_records

| Attribute | SQL type | Nullable | Identity |
|---|---|---|---|
| maintenance_id | integer | No | BY DEFAULT |
| resource_id | integer | Yes | No |
| maintenance_type | character varying(255) | Yes | No |
| description | text | Yes | No |
| performed_on | timestamp with time zone | Yes | No |
| next_due_date | date | Yes | No |
| status | character varying(255) | Yes | No |
| performed_by | integer | Yes | No |
| cost | numeric(12,2) | Yes | No |
| assignment_id | integer | Yes | No |

Constraints:

- **ck_cost**: `CHECK ((cost >= (0)::numeric))`
- **fk_has_drawn**: `FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id)`
- **fk_maintenance_author**: `FOREIGN KEY (performed_by) REFERENCES users(user_id)`
- **fk_maintenance_resource**: `FOREIGN KEY (resource_id) REFERENCES resources(resource_id)`
- **maintenance_records_maintenance_id_not_null**: `NOT NULL maintenance_id`
- **pk_maintenance_records**: `PRIMARY KEY (maintenance_id)`

## resource_capabilities

| Attribute | SQL type | Nullable | Identity |
|---|---|---|---|
| resource_id | integer | No | No |
| capability_id | integer | No | BY DEFAULT |
| proficiency_level | character varying(255) | Yes | No |

Constraints:

- **fk_possesses**: `FOREIGN KEY (resource_id) REFERENCES resources(resource_id)`
- **fk_resource_capability**: `FOREIGN KEY (capability_id) REFERENCES capabilities(capability_id)`
- **pk_resource_capabilities**: `PRIMARY KEY (resource_id, capability_id)`
- **resource_capabilities_capability_id_not_null**: `NOT NULL capability_id`
- **resource_capabilities_resource_id_not_null**: `NOT NULL resource_id`

## resource_tags

| Attribute | SQL type | Nullable | Identity |
|---|---|---|---|
| resource_id | integer | No | No |
| tag | character varying(100) | No | No |

Constraints:

- **fk_resource_tags**: `FOREIGN KEY (resource_id) REFERENCES resources(resource_id)`
- **pk_resource_tags**: `PRIMARY KEY (resource_id, tag)`
- **resource_tags_resource_id_not_null**: `NOT NULL resource_id`
- **resource_tags_tag_not_null**: `NOT NULL tag`

## resource_types

| Attribute | SQL type | Nullable | Identity |
|---|---|---|---|
| type_id | integer | No | BY DEFAULT |
| type_name | character varying(255) | Yes | No |
| description | text | Yes | No |

Constraints:

- **pk_resource_types**: `PRIMARY KEY (type_id)`
- **resource_types_type_id_not_null**: `NOT NULL type_id`

## resources

| Attribute | SQL type | Nullable | Identity |
|---|---|---|---|
| resource_id | integer | No | BY DEFAULT |
| type_id | integer | Yes | No |
| resource_name | character varying(255) | Yes | No |
| call_sign | character varying(255) | Yes | No |
| status | character varying(255) | Yes | No |
| current_location_id | integer | Yes | No |
| capacity | integer | Yes | No |

Constraints:

- **ck_capacity**: `CHECK ((capacity >= 0))`
- **fk_resource_location**: `FOREIGN KEY (current_location_id) REFERENCES locations(location_id)`
- **fk_resource_type**: `FOREIGN KEY (type_id) REFERENCES resource_types(type_id)`
- **pk_resources**: `PRIMARY KEY (resource_id)`
- **resources_resource_id_not_null**: `NOT NULL resource_id`

## responder_reports

| Attribute | SQL type | Nullable | Identity |
|---|---|---|---|
| report_id | integer | No | BY DEFAULT |
| emergency_id | integer | Yes | No |
| responder_id | integer | Yes | No |
| initial_assessment | text | Yes | No |
| actions_taken | text | Yes | No |
| resources_used | text | Yes | No |
| people_affected | integer | Yes | No |
| outcome | text | Yes | No |
| reported_at | timestamp with time zone | Yes | No |
| assignment_id | integer | Yes | No |

Constraints:

- **ck_report_people**: `CHECK ((people_affected >= 0))`
- **fk_report_assignment_drawn**: `FOREIGN KEY (assignment_id) REFERENCES assignments(assignment_id)`
- **fk_report_emergency**: `FOREIGN KEY (emergency_id) REFERENCES emergencies(emergency_id)`
- **fk_report_responder**: `FOREIGN KEY (responder_id) REFERENCES responders(responder_id)`
- **pk_responder_reports**: `PRIMARY KEY (report_id)`
- **responder_reports_report_id_not_null**: `NOT NULL report_id`

## responder_skills

| Attribute | SQL type | Nullable | Identity |
|---|---|---|---|
| responder_id | integer | No | No |
| skill | character varying(100) | No | No |

Constraints:

- **fk_responder_skills**: `FOREIGN KEY (responder_id) REFERENCES responders(responder_id)`
- **pk_responder_skills**: `PRIMARY KEY (responder_id, skill)`
- **responder_skills_responder_id_not_null**: `NOT NULL responder_id`
- **responder_skills_skill_not_null**: `NOT NULL skill`

## responders

| Attribute | SQL type | Nullable | Identity |
|---|---|---|---|
| responder_id | integer | No | BY DEFAULT |
| user_id | integer | Yes | No |
| employee_id | character varying(255) | Yes | No |
| team | character varying(255) | Yes | No |
| status | character varying(255) | Yes | No |

Constraints:

- **fk_responder_user**: `FOREIGN KEY (user_id) REFERENCES users(user_id)`
- **pk_responders**: `PRIMARY KEY (responder_id)`
- **responders_responder_id_not_null**: `NOT NULL responder_id`
- **uq_responder_user**: `UNIQUE (user_id)`

## roles

| Attribute | SQL type | Nullable | Identity |
|---|---|---|---|
| role_id | integer | No | BY DEFAULT |
| role_name | character varying(255) | Yes | No |
| description | text | Yes | No |

Constraints:

- **pk_roles**: `PRIMARY KEY (role_id)`
- **roles_role_id_not_null**: `NOT NULL role_id`

## users

| Attribute | SQL type | Nullable | Identity |
|---|---|---|---|
| user_id | integer | No | BY DEFAULT |
| full_name | character varying(255) | Yes | No |
| email | character varying(255) | No | No |
| password_hash | character varying(255) | No | No |
| phone | character varying(255) | Yes | No |
| role_id | integer | No | No |
| status | character varying(255) | Yes | No |
| created_at | timestamp with time zone | Yes | No |

Constraints:

- **fk_user_role**: `FOREIGN KEY (role_id) REFERENCES roles(role_id)`
- **pk_users**: `PRIMARY KEY (user_id)`
- **uq_users_email**: `UNIQUE (email)`
- **users_email_not_null**: `NOT NULL email`
- **users_password_hash_not_null**: `NOT NULL password_hash`
- **users_role_id_not_null**: `NOT NULL role_id`
- **users_user_id_not_null**: `NOT NULL user_id`

## Index definitions

```sql
CREATE UNIQUE INDEX app_login_attempts_pkey ON public.app_login_attempts USING btree (attempt_key);
```

```sql
CREATE UNIQUE INDEX app_sessions_pkey ON public.app_sessions USING btree (token_hash);
```

```sql
CREATE INDEX idx_assignment_emergency ON public.assignments USING btree (emergency_id);
```

```sql
CREATE UNIQUE INDEX pk_assignments ON public.assignments USING btree (assignment_id);
```

```sql
CREATE UNIQUE INDEX uq_active_resource ON public.assignments USING btree (resource_id) WHERE ((status)::text = ANY ((ARRAY['active'::character varying, 'dispatched'::character varying])::text[]));
```

```sql
CREATE UNIQUE INDEX uq_active_responder ON public.assignments USING btree (responder_id) WHERE ((status)::text = ANY ((ARRAY['active'::character varying, 'dispatched'::character varying])::text[]));
```

```sql
CREATE UNIQUE INDEX pk_capabilities ON public.capabilities USING btree (capability_id);
```

```sql
CREATE INDEX idx_emergency_embedding_hnsw ON public.emergencies USING hnsw (embedding vector_cosine_ops) WHERE (embedding IS NOT NULL);
```

```sql
CREATE INDEX idx_emergency_status_time ON public.emergencies USING btree (status, reported_at DESC);
```

```sql
CREATE UNIQUE INDEX pk_emergencies ON public.emergencies USING btree (emergency_id);
```

```sql
CREATE UNIQUE INDEX pk_emergency_required_capabilities ON public.emergency_required_capabilities USING btree (emergency_id, capability_id);
```

```sql
CREATE INDEX idx_history_time ON public.emergency_status_history USING btree (emergency_id, changed_at DESC);
```

```sql
CREATE UNIQUE INDEX pk_emergency_status_history ON public.emergency_status_history USING btree (history_id);
```

```sql
CREATE UNIQUE INDEX pk_emergency_types ON public.emergency_types USING btree (type_id);
```

```sql
CREATE UNIQUE INDEX pk_locations ON public.locations USING btree (location_id);
```

```sql
CREATE UNIQUE INDEX pk_maintenance_records ON public.maintenance_records USING btree (maintenance_id);
```

```sql
CREATE UNIQUE INDEX pk_resource_capabilities ON public.resource_capabilities USING btree (resource_id, capability_id);
```

```sql
CREATE UNIQUE INDEX pk_resource_tags ON public.resource_tags USING btree (resource_id, tag);
```

```sql
CREATE UNIQUE INDEX pk_resource_types ON public.resource_types USING btree (type_id);
```

```sql
CREATE UNIQUE INDEX pk_resources ON public.resources USING btree (resource_id);
```

```sql
CREATE UNIQUE INDEX pk_responder_reports ON public.responder_reports USING btree (report_id);
```

```sql
CREATE UNIQUE INDEX pk_responder_skills ON public.responder_skills USING btree (responder_id, skill);
```

```sql
CREATE UNIQUE INDEX pk_responders ON public.responders USING btree (responder_id);
```

```sql
CREATE UNIQUE INDEX uq_responder_user ON public.responders USING btree (user_id);
```

```sql
CREATE UNIQUE INDEX pk_roles ON public.roles USING btree (role_id);
```

```sql
CREATE UNIQUE INDEX pk_users ON public.users USING btree (user_id);
```

```sql
CREATE UNIQUE INDEX uq_users_email ON public.users USING btree (email);
```
