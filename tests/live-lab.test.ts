import {test,after} from "node:test";
import assert from "node:assert/strict";
import {mkdtemp} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {randomBytes} from "node:crypto";
import {type Actor} from "../lib/db";
import {createIncident,runQuery,dispatch} from "../lib/service";
process.env.PGLITE_DATA_DIR=await mkdtemp(join(tmpdir(),"crisislink-live-lab-"));
process.env.DEMO_PASSWORD=randomBytes(24).toString("base64url");
const actor:Actor={user_id:1,full_name:"Operations Coordinator",email:"coordinator@example.com",role_name:"Coordinator"};
test("SQL lab reads new incidents, current-day counts and new assignments",async()=>{
 const before=await runQuery(actor,"recursive");
 const count=before.rows.reduce((sum:number,r:any)=>sum+Number(r.incidents),0);
 const incident=await createIncident(actor,{type_id:2,location_id:2,description:"A newly reported medical incident for live SQL verification",severity_level:"high",people_affected:1000,capability_id:2});
 for(const key of ["join","cte","correlated","nested"]){
  const result=await runQuery(actor,key);assert.ok(result.rows.some((r:any)=>r.emergency_id===incident.emergency_id),key);assert.ok(result.executedAt);
 }
 const calendar=await runQuery(actor,"recursive");assert.equal(calendar.rows.length,7);
 assert.equal(calendar.rows.reduce((sum:number,r:any)=>sum+Number(r.incidents),0),count+1);
 const assignment=await dispatch(actor,{emergency_id:incident.emergency_id,resource_id:202,responder_id:2}) as {assignment_id:number};
 assert.ok((await runQuery(actor,"view")).rows.some((r:any)=>r.assignment_id===assignment.assignment_id));
 assert.ok((await runQuery(actor,"aggregate")).rows.some((r:any)=>r.emergency_id===incident.emergency_id && Number(r.assignment_count)===1));
 assert.ok(!(await runQuery(actor,"correlated")).rows.some((r:any)=>r.emergency_id===incident.emergency_id));
});
after(async()=>{const s=globalThis as any;if(s.crisisDb)await(await s.crisisDb).close();});
