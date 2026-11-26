import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { asActor, type Actor } from "./db";
import { requireRole, AppError } from "./auth";
import { createIncident, incidentInput } from "./service";
import { indexIncidents } from "./semantic";
import { embedText, EMBEDDING_ID, vectorLiteral } from "./embeddings";
import { mongo, saveAdditionalReport } from "./mongo";

export const DUPLICATE_WINDOW_HOURS = 24;
// Candidate-screening heuristic, not a probability or proof of identity.
export const MAX_DUPLICATE_DISTANCE = 0.65;
const shared = globalThis as unknown as { crisisReviewSecret?: Buffer };
const secret = shared.crisisReviewSecret ||= randomBytes(32);
type Draft = z.infer<typeof incidentInput>;
type Review = { id:string;user:number;draft:string;expires:number;candidates:{id:number;fingerprint:string}[] };
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const fingerprint = (r: any) => hash([r.description,r.location_id,r.reported_at]);
function sign(review: Review) {
  const payload = Buffer.from(JSON.stringify(review)).toString("base64url");
  return payload + "." + createHmac("sha256",secret).update(payload).digest("base64url");
}
function verify(token: string, actor: Actor, draft: Draft): Review {
  try {
    const [payload,signature,...extra] = token.split(".");
    if (extra.length) throw Error();
    const expected = createHmac("sha256",secret).update(payload).digest();
    const actual = Buffer.from(signature,"base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual,expected)) throw Error();
    const review = JSON.parse(Buffer.from(payload,"base64url").toString()) as Review;
    if (review.user !== actor.user_id || review.draft !== hash(draft) || review.expires < Date.now()) throw Error();
    return review;
  } catch { throw new AppError(409,"The report changed or its review expired. Check for existing incidents again."); }
}

export const DUPLICATE_SQL = `WITH nearest AS MATERIALIZED (
  SELECT e.*, e.embedding <=> $1::vector AS cosine_distance
  FROM emergencies e
  WHERE e.location_id=$2 AND e.status IN ('reported','responding')
    AND e.reported_at>=CURRENT_TIMESTAMP-INTERVAL '24 hours'
    AND e.reported_at<=CURRENT_TIMESTAMP
    AND e.embedding IS NOT NULL AND e.embedding_model=$3
  ORDER BY e.embedding <=> $1::vector LIMIT 5
)
SELECT e.emergency_id,e.description,e.location_id,
  e.reported_at::text AS reported_at,e.status,t.type_name,
  e.cosine_distance,
  (SELECT COALESCE(json_agg(a),'[]'::json) FROM v_assignment_summary a
    WHERE a.emergency_id=e.emergency_id AND a.status IN ('active','dispatched')) AS active_assignments
FROM nearest e JOIN emergency_types t USING(type_id)
ORDER BY e.cosine_distance`;

export async function reviewIncident(actor: Actor, input: unknown) {
  requireRole(actor,"Coordinator");
  const draft = incidentInput.parse(input);
  // No report is written by this read-only review. Index writes are derived metadata only.
  await indexIncidents();
  const vector = vectorLiteral(await embedText(draft.description));
  const candidates = await asActor(actor, async (tx) => {
    await tx.exec("SET LOCAL hnsw.iterative_scan = 'strict_order'");
    const location = (await tx.query("SELECT 1 FROM locations WHERE location_id=$1",[draft.location_id])).rows[0];
    if (!location) throw new AppError(400,"Choose an existing location");
    const rows = (await tx.query<any>(DUPLICATE_SQL,[vector,draft.location_id,EMBEDDING_ID])).rows;
    return rows.filter(r => r.cosine_distance <= MAX_DUPLICATE_DISTANCE);
  });
  return { candidates, windowHours: DUPLICATE_WINDOW_HOURS, maxDistance: MAX_DUPLICATE_DISTANCE,
    reviewToken: sign({ id:randomUUID(),user:actor.user_id,draft:hash(draft),expires:Date.now()+10*60*1000,
      candidates:candidates.map(r=>({id:r.emergency_id,fingerprint:fingerprint(r)})) }) };
}

export async function confirmIncidentReport(actor: Actor, input: unknown) {
  requireRole(actor,"Coordinator");
  const d = z.object({ draft:incidentInput, action:z.enum(["create","attach"]),
    reviewToken:z.string().max(10000).optional(), emergency_id:z.number().int().positive().optional(),
    bypass_review:z.literal(true).optional(), request_id:z.uuid().optional(),
  }).parse(input);
  // Explicit emergency-reporting fallback: never silently claim a model check succeeded.
  if (!d.reviewToken) {
    if (d.action!=="create" || !d.bypass_review || !d.request_id)
      throw new AppError(400,"Review the report or explicitly create it without a duplicate check.");
    const row = await createIncident(actor,d.draft,d.request_id);
    return { ...row, action:"created", reviewed:false };
  }
  const review = verify(d.reviewToken,actor,d.draft);
  if (d.action==="create") {
    const row = await createIncident(actor,d.draft,review.id);
    return { ...row, action:"created", reviewed:true };
  }
  const candidate = review.candidates.find(r=>r.id===d.emergency_id);
  if (!candidate) throw new AppError(400,"Choose an incident from this report's review results.");
  const incident = d.emergency_id!;
  const col = await mongo();
  const existing = await col.findOne({report_review_id:review.id,author_id:actor.user_id,emergency_id:incident});
  if (existing) return {action:"attached",emergency_id:incident,note_id:existing._id.toHexString()};
  await asActor(actor,async(tx)=>{
    const current = (await tx.query<any>(
      "SELECT description,location_id,reported_at::text AS reported_at FROM emergencies WHERE emergency_id=$1 AND status IN ('reported','responding') AND reported_at>=CURRENT_TIMESTAMP-INTERVAL '24 hours' AND reported_at<=CURRENT_TIMESTAMP FOR UPDATE",
      [incident],
    )).rows[0];
    if (!current || fingerprint(current)!==candidate.fingerprint)
      throw new AppError(409,"That incident changed or is no longer eligible. Review the report again.");
    await tx.query("INSERT INTO app_incident_report_receipts(review_id,user_id,action,emergency_id,draft_hash) VALUES($1,$2,'attach',$3,$4) ON CONFLICT(review_id) DO NOTHING",[review.id,actor.user_id,incident,hash(d.draft)]);
    const receipt=(await tx.query<any>("SELECT * FROM app_incident_report_receipts WHERE review_id=$1",[review.id])).rows[0];
    if(receipt.user_id!==actor.user_id || receipt.action!=="attach" || receipt.emergency_id!==incident)
      throw new AppError(409,"This report already has a different decision. Review it again.");
  });
  const saved = await saveAdditionalReport(actor,incident,review.id,d.draft);
  return {action:"attached",emergency_id:incident,note_id:saved.id};
}
