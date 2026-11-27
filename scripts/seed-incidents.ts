// Explicit one-time sample data command. Stop the app before standalone PGlite access.
// Stable request IDs make reruns reuse the same records without changing timestamps/statuses.
import {connect} from "node:net";
import {randomUUID} from "node:crypto";
// Explicit --fresh adds a new batch; the default remains retry-safe.
const fresh = process.argv.includes("--fresh");
import {getDb,type Actor} from "../lib/db";
import {createIncident} from "../lib/service";
import {indexIncidents} from "../lib/semantic";
const appRunning=await new Promise<boolean>(resolve=>{
 const socket=connect({host:"127.0.0.1",port:3100});
 socket.once("connect",()=>{socket.destroy();resolve(true);});
 socket.once("error",()=>resolve(false));socket.setTimeout(1000,()=>{socket.destroy();resolve(false);});
});
if(appRunning)throw Error("Stop the app on port3100 before running pnpm incidents:seed. Existing incident data will be preserved.");
const samples=[
 {location:27,type:1,capability:1,severity:"high",people:3,description:"Smoke and sparks from an electrical cabinet in BE Block near the second-floor corridor.",directions:"BE Block, second-floor corridor"},
 {location:4,type:2,capability:2,severity:"high",people:1,description:"A student has collapsed near the university cafeteria seating area and needs medical assistance.",directions:"PES University Cafeteria, seating area"},
 {location:12,type:4,capability:4,severity:"high",people:3,description:"Two cars collided near Marathahalli Bridge. One occupant is trapped and traffic is obstructed.",directions:"Marathahalli Bridge approach"},
 {location:3,type:3,capability:3,severity:"critical",people:6,description:"Rising water near the Hebbal Lake perimeter has stranded six people beside the access path.",directions:"Hebbal Lake perimeter, access path"},
 {location:16,type:6,capability:5,severity:"high",people:4,description:"A chemical container is leaking inside a Whitefield industrial warehouse. Workers report a strong smell.",directions:"Whitefield Industrial Area, warehouse loading bay"},
 {location:10,type:9,capability:8,severity:"medium",people:12,description:"Power failure at the Koramangala community centre has stopped essential lighting during an event.",directions:"Koramangala Community Centre, main hall"},
 {location:23,type:10,capability:7,severity:"medium",people:0,description:"A storm has brought down a large tree across the entrance to Yelahanka Sports Ground.",directions:"Yelahanka Sports Ground entrance"},
 {location:13,type:12,capability:16,severity:"high",people:30,description:"Crowding near Malleshwaram Market has blocked an exit and several people need help leaving safely.",directions:"Malleshwaram Market exit"},
] as const;
const db=await getDb();
try{
 const account=(await db.query<{user_id:number;full_name:string;email:string}>("SELECT u.user_id,u.full_name,u.email FROM users u JOIN roles r USING(role_id) WHERE r.role_name='Coordinator' AND u.status='active' ORDER BY u.user_id LIMIT 1")).rows[0];
 if(!account)throw Error("An active coordinator account is required.");
 const actor:Actor={...account,role_name:"Coordinator"};
 const before=Number((await db.query<{n:number}>("SELECT count(*) AS n FROM emergencies")).rows[0].n);
 const incidents=[];
 for(const [i,s] of samples.entries()){
  const record=await createIncident(actor,{type_id:s.type,location_id:s.location,description:s.description,severity_level:s.severity,people_affected:s.people,capability_id:s.capability,reported_location_text:s.directions},fresh ? randomUUID() : `78c87942-3ca6-4bfd-8d15-${String(i+1).padStart(12,"0")}`);
  incidents.push({emergency_id:record.emergency_id,description:s.description});
 }
 const indexed=await indexIncidents();
 const after=Number((await db.query<{n:number}>("SELECT count(*) AS n FROM emergencies")).rows[0].n);
 const checked=(await db.query("SELECT e.emergency_id,e.status,e.reported_at,t.type_name,l.location_name FROM emergencies e JOIN emergency_types t USING(type_id) JOIN locations l USING(location_id) WHERE e.emergency_id=ANY($1::int[]) ORDER BY e.emergency_id",[incidents.map(r=>r.emergency_id)])).rows;
 console.log(JSON.stringify({added:after-before,indexed,incidents:checked},null,2));
}finally{await db.close();}
