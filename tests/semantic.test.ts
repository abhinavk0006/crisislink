import {test,after} from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,mkdir,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {randomBytes,randomUUID} from "node:crypto";
import {getDb,asActor,type Actor} from "../lib/db";
import {createIncident,complete,dispatch} from "../lib/service";
import {embedText,EMBEDDING_ID,vectorLiteral} from "../lib/embeddings";
import {indexIncidents} from "../lib/semantic";
import {reviewIncident,confirmIncidentReport,DUPLICATE_SQL} from "../lib/incident-review";
import {mongo} from "../lib/mongo";
process.env.PGLITE_DATA_DIR=await mkdtemp(join(tmpdir(),"crisislink-duplicates-"));
process.env.MONGODB_DATABASE="crisislink_duplicates_"+randomUUID().replaceAll("-","");
process.env.DEMO_PASSWORD=randomBytes(24).toString("base64url");
process.env.EMBEDDING_OFFLINE="1";
const coordinator:Actor={user_id:1,full_name:"Operations Coordinator",email:"coordinator@example.com",role_name:"Coordinator"};
const technician:Actor={user_id:5,full_name:"Maintenance Officer",email:"tech@example.com",role_name:"Technician"};
const original={type_id:1,location_id:1,description:"Flames and heavy smoke are coming from a warehouse near the market.",severity_level:"high",people_affected:20,capability_id:1};
const incoming={...original,description:"A storage building is burning behind the shops.",people_affected:5};
const checks:string[]=[];
const evidence:Record<string,unknown>={checkedAt:new Date().toISOString(),checks};
test("Real vector review and human-confirmed report decisions",async(t)=>{
 const db=await getDb();
 async function check(name:string,fn:()=>Promise<void>){await t.test(name,async()=>{await fn();checks.push(name);});}
 await check("Real pgvector, normalized offline MiniLM and HNSW index",async()=>{
  assert.equal((await db.query("SELECT 1 FROM pg_extension WHERE extname='vector'")).rows.length,1);
  const v=await embedText(incoming.description);assert.equal(v.length,384);assert.ok(Math.abs(Math.hypot(...v)-1)<0.001);
  assert.deepEqual(v,await embedText(incoming.description));
  assert.match(JSON.stringify((await db.query("SELECT indexdef FROM pg_indexes WHERE indexname='idx_emergency_embedding_hnsw'")).rows),/hnsw.*vector_cosine_ops/);
 });
 const target=(await createIncident(coordinator,original)).emergency_id;
 await complete(coordinator,{assignment_id:301,outcome:"Training unit released for test"});
 await dispatch(coordinator,{emergency_id:target,resource_id:201,responder_id:1});
 const elsewhere=(await createIncident(coordinator,{...original,location_id:2})).emergency_id;
 const old=(await createIncident(coordinator,original)).emergency_id;
 await db.query("UPDATE emergencies SET reported_at=CURRENT_TIMESTAMP-INTERVAL '48 hours' WHERE emergency_id=$1",[old]);
 const resolved=(await createIncident(coordinator,original)).emergency_id;
 await db.query("UPDATE emergencies SET status='resolved' WHERE emergency_id=$1",[resolved]);
 await createIncident(coordinator,{...original,type_id:2,description:"Several people are injured after a bus collision near the market."});
 let review:any;
 await check("Paraphrase review excludes other locations, old and resolved incidents and shows deployed teams",async()=>{
  review=await reviewIncident(coordinator,incoming);
  assert.deepEqual(review.candidates.map((r:any)=>r.emergency_id),[target]);
  assert.equal(review.candidates[0].active_assignments.length,1);
  assert.ok(review.candidates[0].cosine_distance<0.65);assert.equal(await indexIncidents(),0);
  evidence.example={description:incoming.description,candidates:review.candidates};
 });
 const counts=async()=> (await db.query<any>("SELECT (SELECT COUNT(*) FROM emergencies) AS incidents,(SELECT COUNT(*) FROM assignments) AS assignments")).rows;
 await check("Review creates no incident, assignment or field note",async()=>{
  const before=await counts();const notes=await(await mongo()).countDocuments({});
  await reviewIncident(coordinator,incoming);assert.deepEqual(await counts(),before);
  assert.equal(await(await mongo()).countDocuments({}),notes);
 });
 await check("Roles, changed drafts, tampered or expired tokens and unreviewed targets are rejected",async()=>{
  await assert.rejects(()=>reviewIncident(technician,incoming),(e:any)=>e.status===403);
  const body={draft:incoming,action:"attach",emergency_id:target,reviewToken:review.reviewToken};
  await assert.rejects(()=>confirmIncidentReport(coordinator,{...body,draft:{...incoming,description:"Changed report"}}),(e:any)=>e.status===409);
  await assert.rejects(()=>confirmIncidentReport(coordinator,{...body,reviewToken:"x"+review.reviewToken}),(e:any)=>e.status===409);
  await assert.rejects(()=>confirmIncidentReport(coordinator,{...body,emergency_id:elsewhere}),(e:any)=>e.status===400);
  const now=Date.now;try{Date.now=()=>now()+11*60*1000;await assert.rejects(()=>confirmIncidentReport(coordinator,body),(e:any)=>e.status===409);}finally{Date.now=now;}
 });
 await check("Attach saves the original report once in MongoDB without another incident or dispatch",async()=>{
  const before=await counts();const body={draft:incoming,action:"attach",emergency_id:target,reviewToken:review.reviewToken};
  const result=await confirmIncidentReport(coordinator,body);assert.equal(result.action,"attached");
  assert.deepEqual(await confirmIncidentReport(coordinator,body),result);assert.deepEqual(await counts(),before);
  const notes=await(await mongo()).find({emergency_id:target}).toArray();assert.equal(notes.length,1);
  assert.equal(notes[0].text,incoming.description);assert.equal(notes[0].author_id,1);
  assert.equal(notes[0].assessment.reported_people_affected,"5");
  assert.equal((await db.query<any>("SELECT people_affected FROM emergencies WHERE emergency_id=$1",[target])).rows[0].people_affected,20);
  await assert.rejects(()=>confirmIncidentReport(coordinator,{...body,action:"create"}),(e:any)=>e.status===409);
 });
 await check("Create-separately is a human choice and retries reuse one SQL receipt",async()=>{
  const r=await reviewIncident(coordinator,incoming);const body={draft:incoming,action:"create",reviewToken:r.reviewToken};
  const before=await counts();const a=await confirmIncidentReport(coordinator,body);const b=await confirmIncidentReport(coordinator,body);
  assert.equal(a.emergency_id,b.emergency_id);assert.notEqual(a.emergency_id,target);
  assert.equal(Number((await counts())[0].incidents),Number(before[0].incidents)+1);
  await assert.rejects(()=>confirmIncidentReport(coordinator,{...body,action:"attach",emergency_id:target}),(e:any)=>e.status===409);
 });
 await check("Changed or closed candidates reject stale decisions; description edits invalidate vectors",async()=>{
  const r=await reviewIncident(coordinator,incoming);
  await db.query("UPDATE emergencies SET status='resolved' WHERE emergency_id=$1",[target]);
  await assert.rejects(()=>confirmIncidentReport(coordinator,{draft:incoming,action:"attach",emergency_id:target,reviewToken:r.reviewToken}),(e:any)=>e.status===409);
  await db.query("UPDATE emergencies SET status='responding' WHERE emergency_id=$1",[target]);
  const r2=await reviewIncident(coordinator,incoming);
  await db.query("UPDATE emergencies SET description=$1 WHERE emergency_id=$2",["A completely different medical report",target]);
  assert.deepEqual((await db.query<any>("SELECT embedding,embedding_model,embedded_at FROM emergencies WHERE emergency_id=$1",[target])).rows[0],{embedding:null,embedding_model:null,embedded_at:null});
  await assert.rejects(()=>confirmIncidentReport(coordinator,{draft:incoming,action:"attach",emergency_id:target,reviewToken:r2.reviewToken}),(e:any)=>e.status===409);
  await indexIncidents();assert.equal((await db.query<any>("SELECT embedding_model FROM emergencies WHERE emergency_id=$1",[target])).rows[0].embedding_model,EMBEDDING_ID);
 });
 await check("Explicit unchecked creation works without a model and retries are idempotent",async()=>{
  const body={draft:incoming,action:"create",bypass_review:true,request_id:randomUUID()};
  const a=await confirmIncidentReport(coordinator,body);assert.ok("reviewed" in a);assert.equal(a.reviewed,false);
  assert.deepEqual(await confirmIncidentReport(coordinator,body),a);
  await assert.rejects(()=>confirmIncidentReport(coordinator,{...body,draft:{...incoming,people_affected:99}}),(e:any)=>e.status===409);
  await assert.rejects(()=>confirmIncidentReport(coordinator,{draft:incoming,action:"create"}),(e:any)=>e.status===400);
 });
 await check("Bound vectors, HNSW eligibility and SQL permissions remain enforced",async()=>{
  assert.throws(()=>vectorLiteral([1,2]));await reviewIncident(coordinator,{...incoming,description:"'; DROP TABLE emergencies; --"});
  assert.ok((await db.query("SELECT 1 FROM emergencies LIMIT 1")).rows.length);
  await assert.rejects(()=>asActor(technician,tx=>tx.exec("UPDATE emergencies SET embedding=NULL")));
  const vector=vectorLiteral(await embedText(incoming.description));
  const plan=await db.transaction(async tx=>{await tx.exec("SET LOCAL enable_seqscan=off");return(await tx.query("EXPLAIN SELECT emergency_id FROM emergencies WHERE embedding IS NOT NULL ORDER BY embedding <=> $1::vector LIMIT 5",[vector])).rows;});
  assert.match(JSON.stringify(plan),/idx_emergency_embedding_hnsw/);evidence.forcedIndexPlan=plan;
  evidence.actualReviewPlan=(await db.query("EXPLAIN "+DUPLICATE_SQL,[vector,1,EMBEDDING_ID])).rows;
 });
 await mkdir("test-results",{recursive:true});await writeFile("test-results/semantic.json",JSON.stringify({...evidence,passed:checks.length},null,2));
});
after(async()=>{const s=globalThis as any;if(s.crisisMongo){const c=await s.crisisMongo;await c.db(process.env.MONGODB_DATABASE).dropDatabase();await c.close();}if(s.crisisDb)await(await s.crisisDb).close();});
