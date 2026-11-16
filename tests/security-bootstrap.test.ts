import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdtemp,readdir,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {getDb} from '../lib/db';
const dir=await mkdtemp(join(tmpdir(),'crisislink-security-'));
const password=randomBytes(24).toString('base64url');
process.env.PGLITE_DATA_DIR=dir;
process.env.DEMO_PASSWORD=password;
test('Bootstrap stores independent password hashes and no plaintext credential artifact',async()=>{
 const db=await getDb();
 const rows=(await db.query<{password_hash:string}>('SELECT password_hash FROM users')).rows;
 assert.equal(rows.length,5);assert.equal(new Set(rows.map(r=>r.password_hash)).size,5);
 assert.ok(rows.every(r=>r.password_hash.startsWith('scrypt$')&&!r.password_hash.includes(password)));
 const paths=await readdir(dir,{recursive:true,withFileTypes:true});
 assert.ok(!paths.some(p=>p.name==='demo-accounts.json'||p.name==='credentials.json'));
 for(const entry of paths)if(entry.isFile()){
  const file=join(entry.parentPath,entry.name);
  assert.ok(!(await readFile(file)).includes(Buffer.from(password)),`Plaintext password unexpectedly persisted in ${entry.name}`);
 }
});
after(async()=>{const state=globalThis as any;if(state.crisisDb)await(await state.crisisDb).close();});
