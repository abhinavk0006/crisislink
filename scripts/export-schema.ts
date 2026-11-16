import {mkdtemp,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {getDb} from '../lib/db';
process.env.PGLITE_DATA_DIR=await mkdtemp(join(tmpdir(),'crisislink-schema-'));
process.env.DEMO_PASSWORD=randomBytes(24).toString('base64url');
const db=await getDb();
try{
 const columns=(await db.query<{table_name:string;column_name:string;sql_type:string;nullable:boolean;identity:string;position:number}>(`SELECT c.relname AS table_name,a.attname AS column_name,format_type(a.atttypid,a.atttypmod) AS sql_type,NOT a.attnotnull AS nullable,a.attidentity AS identity,a.attnum AS position FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid WHERE n.nspname='public' AND c.relkind='r' AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum`)).rows;
 const constraints=(await db.query<{table_name:string;constraint_name:string;type:string;definition:string}>(`SELECT c.relname AS table_name,con.conname AS constraint_name,con.contype AS type,pg_get_constraintdef(con.oid) AS definition FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' ORDER BY c.relname,con.conname`)).rows;
 const indexes=(await db.query('SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname=$1 ORDER BY tablename,indexname',['public'])).rows;
 const tables=[...new Set(columns.map(c=>c.table_name))];
 const output=['# CrisisLink data dictionary','',`Generated from the executed PostgreSQL schema: ${tables.filter(t=>!t.startsWith('app_')).length} domain tables and ${tables.filter(t=>t.startsWith('app_')).length} internal tables. The metadata contains no row data, passwords or session tokens.`,''];
 for(const table of tables){
  output.push('## '+table,'','| Attribute | SQL type | Nullable | Identity |','|---|---|---|---|');
  for(const c of columns.filter(c=>c.table_name===table))output.push(`| ${c.column_name} | ${c.sql_type} | ${c.nullable?'Yes':'No'} | ${c.identity==='d'?'BY DEFAULT':c.identity||'No'} |`);
  output.push('','Constraints:','');
  for(const c of constraints.filter(c=>c.table_name===table))output.push(`- **${c.constraint_name}**: \`${c.definition}\``);
  output.push('');
 }
 output.push('## Index definitions','');for(const index of indexes)output.push('```sql',String(index.indexdef)+';','```','');
 await mkdir('docs',{recursive:true});await writeFile('docs/DATA_DICTIONARY.md',output.join('\n'));
 await writeFile('docs/schema-metadata.json',JSON.stringify({tables,columns,constraints,indexes},null,2));
 console.log(`Exported schema metadata for ${tables.length} tables without row data`);
}finally{delete process.env.DEMO_PASSWORD;await db.close();}
