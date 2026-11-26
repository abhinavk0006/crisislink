import {z} from "zod";
import {getDb,asActor,type Actor} from "./db";
import {requireRole,AppError} from "./auth";
import {embedText,EMBEDDING_ID,vectorLiteral} from "./embeddings";
import {BENGALURU_AREAS} from "./location-catalog";
const inputSchema=z.object({area:z.enum(BENGALURU_AREAS),query:z.string().trim().min(2).max(160),street:z.string().trim().max(200).default("")});
const SOURCE="concat_ws(' | ',location_name,address,area,street,campus,building,array_to_string(aliases,' | '))";
export async function indexLocations(){
 const db=await getDb();
 const pending=(await db.query<{location_id:number;source:string}>(`SELECT location_id,${SOURCE} AS source FROM locations WHERE search_embedding IS NULL OR search_model IS DISTINCT FROM $1 OR search_text IS DISTINCT FROM ${SOURCE}`,[EMBEDDING_ID])).rows;
 for(const r of pending){const vector=vectorLiteral(await embedText(r.source));await db.query(`UPDATE locations SET search_embedding=$1::vector,search_model=$2,search_text=$3 WHERE location_id=$4 AND ${SOURCE}=$3`,[vector,EMBEDDING_ID,r.source,r.location_id]);}
 return pending.length;
}
export async function resolveLocations(actor:Actor,input:unknown){
 requireRole(actor,"Coordinator");const d=inputSchema.parse(input);
 const exact=await asActor(actor,async tx=>(await tx.query<any>("SELECT location_id,location_name,address,area,street FROM locations WHERE area=$1 AND (lower(btrim(location_name))=lower($2) OR EXISTS(SELECT 1 FROM unnest(aliases) a WHERE lower(a)=lower($2))) ORDER BY location_id LIMIT 5",[d.area,d.query])).rows);
 try{
  await indexLocations();const vector=vectorLiteral(await embedText([d.query,d.street,d.area].filter(Boolean).join(' | ')));
  const semantic=await asActor(actor,async tx=>(await tx.query<any>(`SELECT location_id,location_name,address,area,street,search_embedding <=> $1::vector AS cosine_distance FROM locations WHERE area=$2 AND search_embedding IS NOT NULL AND search_model=$3 AND search_text=${SOURCE} ORDER BY search_embedding <=> $1::vector LIMIT 5`,[vector,d.area,EMBEDDING_ID])).rows);
  const exactIds=new Set(exact.map(r=>r.location_id));
  return {candidates:[...exact.map(r=>({...r,match_kind:"saved name or alias"})),...semantic.filter(r=>!exactIds.has(r.location_id)).map(r=>({...r,match_kind:"semantic suggestion"}))].slice(0,5),semanticAvailable:true};
 }catch(e){if(!(e instanceof AppError)||e.status!==503)throw e;return{candidates:exact.map(r=>({...r,match_kind:"saved name or alias"})),semanticAvailable:false};}
}
export async function createLocation(actor:Actor,input:unknown){
 requireRole(actor,"Coordinator");const d=inputSchema.parse(input);
 return asActor(actor,async tx=>{
  const existing=(await tx.query<any>("SELECT location_id,location_name,area,street FROM locations WHERE area=$1 AND lower(btrim(location_name))=lower($2) AND lower(COALESCE(street,''))=lower($3) ORDER BY location_id LIMIT 1",[d.area,d.query,d.street])).rows[0];
  if(existing)return existing;
  return(await tx.query<any>("INSERT INTO locations(location_name,address,area,street,risk_level) VALUES($1,$2,$3,$4,'unassessed') RETURNING location_id,location_name,area,street",[d.query,[d.street,d.area].filter(Boolean).join(', '),d.area,d.street])).rows[0];
 });
}
