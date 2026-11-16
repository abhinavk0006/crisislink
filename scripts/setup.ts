import {unlink} from 'node:fs/promises';
import {resolve} from 'node:path';
import {getDb} from '../lib/db';
import {hashPassword} from '../lib/password';
import {readSecret} from './secret-input.mjs';
let password=process.env.DEMO_PASSWORD;
if(!password){
 password=await readSecret('Choose a demonstration password (12 to 200 characters, hidden): ');
 const repeated=await readSecret('Repeat the password (hidden): ');
 if(password!==repeated)throw Error('Passwords do not match');
}
if(!password||password.length<12||password.length>200)throw Error('Use a password between 12 and 200 characters');
process.env.DEMO_PASSWORD=password;
const db=await getDb();
try{
 await db.transaction(async tx=>{
  const accounts=await tx.query<{user_id:number}>('SELECT user_id FROM users');
  for(const account of accounts.rows)await tx.query('UPDATE users SET password_hash=$1 WHERE user_id=$2',[hashPassword(password!),account.user_id]);
  await tx.exec('DELETE FROM app_sessions; DELETE FROM app_login_attempts;');
 });
 if(resolve(process.env.PGLITE_DATA_DIR||'data/postgres')===resolve('data/postgres')){
  try{await unlink(resolve('data/demo-accounts.json'));}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 }
 console.log('Setup complete. Passwords are stored only as scrypt hashes.');
 console.log('Accounts: coordinator@example.com, fire@example.com, medic@example.com, rescue@example.com, tech@example.com');
 console.log('Use the password you chose. No password file was created.');
}finally{delete process.env.DEMO_PASSWORD;await db.close();}
