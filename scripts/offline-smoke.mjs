import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const dir=await mkdtemp(join(tmpdir(),'crisislink-offline-'));
const password='OfflineVerificationOnly2026!';
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3102'],{
 env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',PGLITE_DATA_DIR:join(dir,'postgres'),DEMO_ACCOUNTS_FILE:join(dir,'accounts.json'),DEMO_PASSWORD:password,MONGODB_URI:'mongodb://127.0.0.1:27999',MONGODB_DATABASE:'crisislink_offline'},
 stdio:'ignore',windowsHide:true,
});
try{
 let ready=false;
 for(let i=0;i<100;i++){try{await fetch('http://127.0.0.1:3102/');ready=true;break;}catch{await new Promise(r=>setTimeout(r,100));}}
 assert.ok(ready,'Isolated production server did not start');
 const login=await fetch('http://127.0.0.1:3102/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'coordinator@example.com',password})});
 assert.equal(login.status,200);
 const cookie=login.headers.get('set-cookie').split(';')[0];
 const res=await fetch('http://127.0.0.1:3102/api/notes',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({emergency_id:101,text:'This note must fail while MongoDB is unavailable',tags:[]})});
 assert.equal(res.status,503);assert.match((await res.json()).error,/not saved|not confirmed/);
 const dashboard=await fetch('http://127.0.0.1:3102/api/dashboard',{headers:{Cookie:cookie}});assert.equal(dashboard.status,200);
 await mkdir('test-results',{recursive:true});await writeFile('test-results/offline.json',JSON.stringify({checkedAt:new Date().toISOString(),passed:2,checks:['Unavailable real MongoDB endpoint returns 503 without success','SQL dashboard remains available during MongoDB outage']},null,2));
 console.log('PASS MongoDB outage produces 503; SQL operations remain available');
}finally{child.kill();}
