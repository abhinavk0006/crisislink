import {spawn} from "node:child_process";
import {mkdtemp,mkdir,writeFile} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {randomBytes,randomUUID} from "node:crypto";
import {MongoClient} from "mongodb";
import assert from "node:assert/strict";
const root=await mkdtemp(join(tmpdir(),"crisislink-review-http-"));
const password=randomBytes(24).toString("base64url");
const mongoName="crisislink_review_http_"+randomUUID().replaceAll("-","");
const base="http://127.0.0.1:3103",checks=[];
const original={type_id:1,location_id:1,description:"Flames and heavy smoke are coming from a warehouse near the market.",severity_level:"high",people_affected:20,capability_id:1};
const incoming={...original,description:"A storage building is burning behind the shops.",people_affected:5};
let server,cookie;
async function start(cache,mongoURI="mongodb://127.0.0.1:27028"){
 server=spawn(process.execPath,["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port","3103"],{
  env:{...process.env,PGLITE_DATA_DIR:join(root,"postgres"),DEMO_PASSWORD:password,EMBEDDING_OFFLINE:"1",EMBEDDING_CACHE_DIR:cache,MONGODB_URI:mongoURI,MONGODB_DATABASE:mongoName,NEXT_TELEMETRY_DISABLED:"1"},windowsHide:true,stdio:"ignore"});
 for(let i=0;i<100;i++){try{if((await fetch(base)).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}throw Error("Server did not start");
}
async function stop(){if(server&&server.exitCode===null)await new Promise(r=>{server.once("exit",r);server.kill();});}
async function request(path,method="GET",body,session=cookie){
 const r=await fetch(base+"/api/"+path,{method,headers:{...(session?{Cookie:session}:{}),...(body?{"Content-Type":"application/json"}:{}),...(method!=="GET"?{Origin:base}:{})},body:body?JSON.stringify(body):undefined});
 return {status:r.status,data:await r.json(),headers:r.headers};
}
async function login(){const r=await request("auth/login","POST",{email:"coordinator@example.com",password},null);assert.equal(r.status,200);cookie=r.headers.get("set-cookie").split(";")[0];}
async function check(name,fn){await fn();checks.push(name);console.log("PASS "+name);}
try{
 await start(join(process.cwd(),"data/models"));
 await check("Unauthenticated duplicate review is rejected",async()=>assert.equal((await request("incidents/review","POST",incoming,null)).status,401));
 await login();
 const first=await request("incidents","POST",original);assert.equal(first.status,201);const target=first.data.emergency_id;
 let review;
 await check("Live review returns the paraphrased same-location incident",async()=>{
  const r=await request("incidents/review","POST",incoming);assert.equal(r.status,200);review=r.data;
  assert.equal(review.candidates[0].emergency_id,target);
 });
 await check("Attach decision and retry preserve one observation with no new SQL incident",async()=>{
  const before=(await request("dashboard")).data.incidents.length;
  const body={draft:incoming,action:"attach",reviewToken:review.reviewToken,emergency_id:target};
  const a=await request("incidents/report","POST",body),b=await request("incidents/report","POST",body);
  assert.equal(a.status,201);assert.equal(a.data.note_id,b.data.note_id);
  assert.equal((await request("dashboard")).data.incidents.length,before);
  const notes=await request("notes?incident="+target);assert.equal(notes.data.notes.length,1);assert.equal(notes.data.notes[0].text,incoming.description);
 });
 await check("Changed draft cannot reuse a signed review",async()=>{
  assert.equal((await request("incidents/report","POST",{draft:{...incoming,people_affected:99},action:"create",reviewToken:review.reviewToken})).status,409);
 });
 await check("SQL lab shows newly created incidents and today's rolling counts",async()=>{
  const todayBefore=(await request("queries?key=recursive")).data.rows.reduce((n,r)=>n+Number(r.incidents),0);
  const r=await request("incidents/review","POST",incoming);
  const body={draft:incoming,action:"create",reviewToken:r.data.reviewToken};
  const a=await request("incidents/report","POST",body),b=await request("incidents/report","POST",body);assert.equal(a.status,201);assert.equal(a.data.emergency_id,b.data.emergency_id);
  const cte=await request("queries?key=cte");assert.ok(cte.data.rows.some(r=>r.emergency_id===a.data.emergency_id));assert.ok(cte.data.executedAt);
  const recursive=await request("queries?key=recursive");assert.equal(recursive.data.rows.reduce((n,r)=>n+Number(r.incidents),0),todayBefore+1);
 });
 await check("Existing 12 HTTP authentication, SQL and MongoDB checks still pass",async()=>{
  const http=spawn(process.execPath,["scripts/http-smoke.mjs"],{env:{...process.env,APP_URL:base,TEST_PASSWORD:password},stdio:"inherit",windowsHide:true});
  assert.equal(await new Promise(r=>http.once("exit",r)),0);
 });
 await stop();await start(join(root,"missing-model-cache"));await login();
 await check("Model outage fails review explicitly but permits idempotent unchecked incident creation",async()=>{
  assert.equal((await request("incidents/review","POST",incoming)).status,503);
  const body={draft:incoming,action:"create",bypass_review:true,request_id:randomUUID()};
  const a=await request("incidents/report","POST",body),b=await request("incidents/report","POST",body);
  assert.equal(a.status,201);assert.equal(a.data.reviewed,false);assert.equal(a.data.emergency_id,b.data.emergency_id);
  assert.equal((await request("dashboard")).status,200);
 });
 await stop();await start(join(process.cwd(),"data/models"),"mongodb://127.0.0.1:27999");await login();
 await check("MongoDB outage cannot turn an attachment into a successful save or new incident",async()=>{
  const r=await request("incidents/review","POST",incoming);assert.equal(r.status,200);assert.ok(r.data.candidates.length);
  const before=(await request("dashboard")).data.incidents.length;
  const result=await request("incidents/report","POST",{draft:incoming,action:"attach",reviewToken:r.data.reviewToken,emergency_id:r.data.candidates[0].emergency_id});
  assert.equal(result.status,503);assert.equal((await request("dashboard")).data.incidents.length,before);
 });
 await mkdir("test-results",{recursive:true});await writeFile("test-results/vector-http.json",JSON.stringify({checkedAt:new Date().toISOString(),passed:checks.length,newNamedChecks:checks.length-1,checks,note:"The existing 12 HTTP checks are counted separately, not twice."},null,2));
}finally{await stop();const c=new MongoClient("mongodb://127.0.0.1:27028");try{await c.connect();await c.db(mongoName).dropDatabase();}finally{await c.close();}}
