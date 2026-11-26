import {test,after} from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,readFile,mkdir,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {randomBytes} from "node:crypto";
import {getDb,asActor,type Actor} from "../lib/db";
import {createLocation,resolveLocations,indexLocations} from "../lib/locations";
import {createIncident,dispatch,complete,dashboard} from "../lib/service";
import {reviewIncident} from "../lib/incident-review";
process.env.PGLITE_DATA_DIR=await mkdtemp(join(tmpdir(),"crisislink-locations-"));
process.env.DEMO_PASSWORD=randomBytes(24).toString("base64url");
process.env.EMBEDDING_OFFLINE="1";
const actor:Actor={user_id:1,full_name:"Operations Coordinator",email:"coordinator@example.com",role_name:"Coordinator"};
const responder:Actor={...actor,user_id:2,role_name:"Responder"};
const checks:string[]=[];
test("Bengaluru catalog and campus location workflow",async t=>{
 const db=await getDb();
 async function check(name:string,fn:()=>Promise<void>){await t.test(name,async()=>{await fn();checks.push(name);});}
 await check("Catalog includes six named RR Campus buildings and expanded operational capacity",async()=>{
  const d=await dashboard(actor); assert.equal(d.types.length,12);assert.equal(d.resources.length,20);assert.equal(d.capabilities.length,16);assert.equal(d.responders.length,15);assert.equal(d.locations.length,30);
  assert.deepEqual(d.locations.filter((l:any)=>l.building).map((l:any)=>l.building).sort(),["BE Block","F Block","G Block","GJB Block","MRD Block","Tech Park"].sort());
 });
 await check("Migration preserves changed resource status, password hashes and custom locations",async()=>{
  const hash=(await db.query<any>("SELECT password_hash FROM users WHERE user_id=1")).rows[0].password_hash;
  await db.exec("UPDATE resources SET status='maintenance' WHERE resource_id=204");
  const custom=await createLocation(actor,{area:"Banashankari",query:"East gate tea shop",street:"Third Cross"});assert.ok(custom.location_id>30);
  await db.exec(await readFile("database/09_operational_catalog.sql","utf8"));
  assert.equal((await db.query<any>("SELECT status FROM resources WHERE resource_id=204")).rows[0].status,"maintenance");
  assert.equal((await db.query<any>("SELECT password_hash FROM users WHERE user_id=1")).rows[0].password_hash,hash);
  assert.equal((await db.query<any>("SELECT location_name FROM locations WHERE location_id=$1",[custom.location_id])).rows[0].location_name,"East gate tea shop");
  assert.equal((await createLocation(actor,{area:"Banashankari",query:"east gate tea shop",street:"Third Cross"})).location_id,custom.location_id);
 });
 await check("Only coordinator may create locations, including at SQL permission level",async()=>{
  await assert.rejects(()=>createLocation(responder,{area:"Banashankari",query:"Bad place"}),(e:any)=>e.status===403);
  await assert.rejects(()=>asActor(responder,tx=>tx.exec("INSERT INTO locations(location_name) VALUES('Denied')")),(e:any)=>e.code==='42501');
 });
 await check("Location vectors are real, current and area constrained; aliases resolve to canonical IDs",async()=>{
  assert.ok(await indexLocations()>=30);assert.equal(await indexLocations(),0);
  const alias=await resolveLocations(actor,{area:"Banashankari",query:"golden jubilee block"});
  assert.equal(alias.semanticAvailable,true);assert.equal(alias.candidates[0].location_id,26);assert.equal(alias.candidates[0].match_kind,"saved name or alias");
  const semantic=await resolveLocations(actor,{area:"Banashankari",query:"engineering building at PES university"});
  assert.ok(semantic.candidates.some((c:any)=>c.location_id===27));assert.ok(semantic.candidates.every((c:any)=>c.area==='Banashankari'));
  const elsewhere=await resolveLocations(actor,{area:"Whitefield",query:"golden jubilee block"});assert.ok(elsewhere.candidates.every((c:any)=>c.area==='Whitefield'));
  await db.exec("UPDATE locations SET street='New Third Cross' WHERE location_name='East gate tea shop'");assert.equal(await indexLocations(),1);
  assert.ok((await db.query("SELECT 1 FROM pg_indexes WHERE indexname='idx_location_embedding_hnsw'")).rows.length);
 });
 await check("Alias-confirmed building shares duplicate review while another building stays distinct",async()=>{
  const draft={type_id:1,location_id:26,description:"Heavy smoke and flames in a storage room",severity_level:"high",people_affected:2,capability_id:1,reported_location_text:"GJB Block, 3rd floor room 302"};
  const saved=await createIncident(actor,draft);
  const match=await resolveLocations(actor,{area:"Banashankari",query:"gjb"});assert.equal(match.candidates[0].location_id,26);
  const review=await reviewIncident(actor,{...draft,location_id:match.candidates[0].location_id});assert.ok(review.candidates.some((c:any)=>c.emergency_id===saved.emergency_id));
  const other=await reviewIncident(actor,{...draft,location_id:27});assert.ok(!other.candidates.some((c:any)=>c.emergency_id===saved.emergency_id));
  assert.equal((await db.query<any>("SELECT reported_location_text FROM emergencies WHERE emergency_id=$1",[saved.emergency_id])).rows[0].reported_location_text,draft.reported_location_text);
 });
 await check("New hazardous-material capability works through existing atomic dispatch and completion",async()=>{
  const incident=await createIncident(actor,{type_id:6,location_id:29,description:"Chemical spill near the laboratory",severity_level:"high",people_affected:4,capability_id:5});
  const a=await dispatch(actor,{emergency_id:incident.emergency_id,resource_id:211,responder_id:10});
  await complete(actor,{assignment_id:(a as any).assignment_id,outcome:"Spill contained and area secured"});
  assert.equal((await db.query<any>("SELECT status FROM resources WHERE resource_id=211")).rows[0].status,"available");
 });
 await mkdir("test-results",{recursive:true});await writeFile("test-results/locations.json",JSON.stringify({checkedAt:new Date().toISOString(),checks,passed:checks.length},null,2));
});
after(async()=>{const s=globalThis as any;if(s.crisisDb)await(await s.crisisDb).close();});
