import { z } from "zod";
import { createHash } from "node:crypto";
import { asActor, type Actor } from "./db";
import { requireRole, AppError } from "./auth";
export const incidentInput = z.object({
  type_id: z.number().int().positive(),
  location_id: z.number().int().positive(),
  description: z.string().trim().min(5).max(2000),
  severity_level: z.enum(["low", "medium", "high", "critical"]),
  people_affected: z.number().int().min(0).max(1000000),
  capability_id: z.number().int().positive().optional(),
});
export async function dashboard(actor: Actor) {
  return asActor(actor, async (tx) => {
    const incidents = (
      await tx.query(
        `SELECT e.emergency_id,e.type_id,e.location_id,e.reported_by,e.description,e.severity_level,e.people_affected,e.status,e.reported_at,e.updated_at,t.type_name,l.location_name FROM emergencies e JOIN emergency_types t USING(type_id) JOIN locations l USING(location_id) ORDER BY e.reported_at DESC,e.emergency_id DESC`,
      )
    ).rows;
    const resources = (
      await tx.query("SELECT * FROM resources ORDER BY resource_id")
    ).rows;
    const responders = (
      await tx.query(
        "SELECT responder_id,user_id,employee_id,team,status FROM responders ORDER BY responder_id",
      )
    ).rows;
    const assignments = (
      await tx.query(
        "SELECT * FROM v_assignment_summary ORDER BY assignment_id DESC",
      )
    ).rows;
    const history = (
      await tx.query(
        "SELECT * FROM emergency_status_history ORDER BY changed_at DESC,history_id DESC LIMIT 100",
      )
    ).rows;
    const types = (
      await tx.query("SELECT * FROM emergency_types ORDER BY type_id")
    ).rows;
    const locations = (
      await tx.query("SELECT * FROM locations ORDER BY location_id")
    ).rows;
    const capabilities = (
      await tx.query("SELECT * FROM capabilities ORDER BY capability_id")
    ).rows;
    const maintenance = (
      await tx.query(
        "SELECT * FROM maintenance_records ORDER BY maintenance_id DESC",
      )
    ).rows;
    const resourceTags = (
      await tx.query(
        "SELECT resource_id,tag FROM resource_tags ORDER BY resource_id,tag",
      )
    ).rows;
    return {
      incidents,
      resources,
      responders,
      assignments,
      history,
      types,
      locations,
      capabilities,
      maintenance,
      resourceTags,
    };
  });
}
const tagInput = z.object({
  resource_id: z.number().int().positive(),
  tag: z.string().trim().min(1).max(100),
});
export async function addResourceTag(actor: Actor, input: unknown) {
  requireRole(actor, "Coordinator", "Technician");
  const d = tagInput.parse(input);
  return asActor(
    actor,
    async (tx) =>
      (
        await tx.query(
          "INSERT INTO resource_tags(resource_id,tag) VALUES($1,$2) RETURNING resource_id,tag",
          [d.resource_id, d.tag],
        )
      ).rows[0],
  );
}
export async function updateResourceTag(actor: Actor, input: unknown) {
  requireRole(actor, "Coordinator", "Technician");
  const d = tagInput
    .extend({ new_tag: z.string().trim().min(1).max(100) })
    .parse(input);
  return asActor(actor, async (tx) => {
    const row = (
      await tx.query(
        "UPDATE resource_tags SET tag=$1 WHERE resource_id=$2 AND tag=$3 RETURNING resource_id,tag",
        [d.new_tag, d.resource_id, d.tag],
      )
    ).rows[0];
    if (!row) throw new AppError(404, "Resource tag not found");
    return row;
  });
}
export async function removeResourceTag(actor: Actor, input: unknown) {
  requireRole(actor, "Coordinator", "Technician");
  const d = tagInput.parse(input);
  return asActor(actor, async (tx) => {
    const row = (
      await tx.query(
        "DELETE FROM resource_tags WHERE resource_id=$1 AND tag=$2 RETURNING resource_id,tag",
        [d.resource_id, d.tag],
      )
    ).rows[0];
    if (!row) throw new AppError(404, "Resource tag not found");
    return { deleted: true, ...row };
  });
}
export async function createIncident(actor: Actor, input: unknown, requestId?: string) {
  requireRole(actor, "Coordinator");
  const data = incidentInput.parse(input);
  return asActor(actor, async (tx) => {
    if (requestId) {
      const claim = await tx.query(
        "INSERT INTO app_incident_report_receipts(review_id,user_id,action,draft_hash) VALUES($1,$2,'create',$3) ON CONFLICT(review_id) DO NOTHING RETURNING review_id",
        [requestId, actor.user_id, createHash('sha256').update(JSON.stringify(data)).digest('hex')],
      );
      if (!claim.rows.length) {
        const receipt = (await tx.query<{emergency_id:number;action:string;draft_hash:string}>(
          "SELECT emergency_id,action,draft_hash FROM app_incident_report_receipts WHERE review_id=$1 AND user_id=$2",
          [requestId, actor.user_id],
        )).rows[0];
        if (!receipt || receipt.action !== "create" || !receipt.emergency_id || receipt.draft_hash!==createHash('sha256').update(JSON.stringify(data)).digest('hex'))
          throw new AppError(409, "This report already has a different decision. Review it again.");
        return { emergency_id: receipt.emergency_id };
      }
    }
    const row = (
      await tx.query<{ emergency_id: number }>(
        "INSERT INTO emergencies(type_id,location_id,reported_by,description,severity_level,people_affected,status,reported_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,'reported',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP) RETURNING emergency_id",
        [
          data.type_id,
          data.location_id,
          actor.user_id,
          data.description,
          data.severity_level,
          data.people_affected,
        ],
      )
    ).rows[0];
    if (data.capability_id)
      await tx.query(
        "INSERT INTO emergency_required_capabilities(emergency_id,capability_id,quantity_required,location_id) VALUES($1,$2,1,$3)",
        [row.emergency_id, data.capability_id, data.location_id],
      );
    if (requestId) await tx.query(
      "UPDATE app_incident_report_receipts SET emergency_id=$1 WHERE review_id=$2",
      [row.emergency_id, requestId],
    );
    return row;
  });
}
export async function dispatch(actor: Actor, input: unknown) {
  requireRole(actor, "Coordinator");
  const d = z
    .object({
      emergency_id: z.number().int().positive(),
      resource_id: z.number().int().positive(),
      responder_id: z.number().int().positive(),
    })
    .parse(input);
  return asActor(
    actor,
    async (tx) =>
      (
        await tx.query("SELECT dispatch_response($1,$2,$3) AS assignment_id", [
          d.emergency_id,
          d.resource_id,
          d.responder_id,
        ])
      ).rows[0],
  );
}
export async function complete(actor: Actor, input: unknown) {
  requireRole(actor, "Coordinator", "Responder");
  const d = z
    .object({
      assignment_id: z.number().int().positive(),
      outcome: z.string().trim().min(5).max(2000),
    })
    .parse(input);
  return asActor(
    actor,
    async (tx) =>
      (
        await tx.query("SELECT finish_response($1,$2) AS report_id", [
          d.assignment_id,
          d.outcome,
        ])
      ).rows[0],
  );
}
export async function maintenance(actor: Actor, input: unknown) {
  requireRole(actor, "Coordinator", "Technician");
  const d = z
    .object({
      resource_id: z.number().int().positive(),
      description: z.string().trim().min(5).max(2000),
      cost: z.number().min(0).max(10000000),
    })
    .parse(input);
  return asActor(
    actor,
    async (tx) =>
      (
        await tx.query(
          "INSERT INTO maintenance_records(resource_id,maintenance_type,description,performed_on,status,performed_by,cost) VALUES($1,'Inspection',$2,CURRENT_TIMESTAMP,'completed',$3,$4) RETURNING maintenance_id",
          [d.resource_id, d.description, actor.user_id, d.cost],
        )
      ).rows[0],
  );
}
export async function ensureIncident(actor: Actor, id: number, write = false) {
  return asActor(actor, async (tx) => {
    const exists = (
      await tx.query(
        "SELECT emergency_id FROM emergencies WHERE emergency_id=$1",
        [id],
      )
    ).rows[0];
    if (!exists) throw new AppError(404, "Incident not found");
    if (write) {
      if (actor.role_name === "Technician")
        throw new AppError(403, "Technicians have read-only field notes");
      if (actor.role_name === "Responder") {
        const assigned = (
          await tx.query(
            "SELECT 1 FROM assignments a JOIN responders p USING(responder_id) WHERE a.emergency_id=$1 AND p.user_id=$2",
            [id, actor.user_id],
          )
        ).rows[0];
        if (!assigned)
          throw new AppError(403, "You are not assigned to this incident");
      }
    }
  });
}
export const labQueries = {
  join: "SELECT e.emergency_id,t.type_name,l.location_name,e.status FROM emergencies e JOIN emergency_types t USING(type_id) JOIN locations l USING(location_id) ORDER BY e.emergency_id",
  nested:
    "SELECT emergency_id,people_affected FROM emergencies WHERE people_affected>(SELECT AVG(people_affected) FROM emergencies)",
  correlated:
    "SELECT e.emergency_id,e.status FROM emergencies e WHERE NOT EXISTS(SELECT 1 FROM assignments a WHERE a.emergency_id=e.emergency_id AND a.status IN ('active','dispatched'))",
  cte: "WITH ranked AS (SELECT history_id,emergency_id,status,changed_at,ROW_NUMBER() OVER(PARTITION BY emergency_id ORDER BY changed_at DESC,history_id DESC) AS rn FROM emergency_status_history) SELECT * FROM ranked WHERE rn=1 ORDER BY emergency_id",
  recursive:
    "WITH RECURSIVE days(day) AS (SELECT CURRENT_DATE-6 UNION ALL SELECT day+1 FROM days WHERE day<CURRENT_DATE) SELECT d.day,COUNT(e.emergency_id) AS incidents FROM days d LEFT JOIN emergencies e ON e.reported_at::DATE=d.day GROUP BY d.day ORDER BY d.day",
  view: "SELECT * FROM v_assignment_summary ORDER BY assignment_id",
  aggregate:
    "SELECT emergency_id,COUNT(*) AS assignment_count FROM assignments GROUP BY emergency_id HAVING COUNT(*)>=1",
};
export async function runQuery(actor: Actor, key: string) {
  if (!(key in labQueries)) throw new AppError(400, "Choose a listed query");
  const sql = labQueries[key as keyof typeof labQueries];
  return asActor(actor, async (tx) => ({
    sql,
    rows: (await tx.query(sql)).rows,
    executedAt: new Date().toISOString(),
  }));
}
