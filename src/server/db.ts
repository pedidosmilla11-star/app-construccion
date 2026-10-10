import { spawn } from 'node:child_process';
export function sqlValue(value:unknown):string {
 if(value===null || value===undefined) return 'NULL';
 if(typeof value==='boolean') return value?'TRUE':'FALSE';
 if(typeof value==='number') { if(!Number.isFinite(value)) throw new Error('Invalid numeric value'); return String(value); }
 const text=typeof value==='string'?value:JSON.stringify(value);
 if(text.includes('\0')) throw new Error('NUL is not supported');
 return "'"+text.replaceAll("'","''")+"'";
}
// Only application-owned SQL templates reach this adapter. Parameters are data literals.
export function bind(sql:string, values:unknown[]=[]) { return sql.replace(/\$(\d+)/g,(_,index:string)=>{ const n=Number(index)-1;if(n<0||n>=values.length)throw new Error('Missing SQL parameter');return sqlValue(values[n]); }); }
export function connectionEnv() {
 const raw=process.env.DATABASE_URL; if(!raw) throw new Error('Configura DATABASE_URL y ejecuta las migraciones.');
 const url=new URL(raw); if(!['postgres:','postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL debe usar PostgreSQL.');
 const local=['localhost','127.0.0.1','::1'].includes(url.hostname);
 const schema=process.env.DB_TEST_SCHEMA;
 if(schema && (!/^test_[a-f0-9]{32}$/.test(schema) || raw!==process.env.TEST_DATABASE_URL))throw new Error('Invalid integration test schema.');
 return {...process.env, PGHOST:url.hostname, PGPORT:url.port||'5432', PGDATABASE:decodeURIComponent(url.pathname.slice(1)), PGUSER:decodeURIComponent(url.username), PGPASSWORD:decodeURIComponent(url.password), PGSSLMODE:url.searchParams.get('sslmode') || (local?'prefer':'verify-full'), PGCONNECT_TIMEOUT:'5', PGOPTIONS:'-c standard_conforming_strings=on -c statement_timeout=15000'+(schema?` -c search_path=${schema}`:'')};
}
export async function runSql(script:string):Promise<string> {
 const env=connectionEnv();
 return new Promise((resolve,reject)=>{
  const child=spawn(process.env.PSQL_BIN||'psql',['-X','-q','-A','-t','-v','ON_ERROR_STOP=1'],{env,stdio:['pipe','pipe','pipe']});
  let output='',size=0; const timeout=setTimeout(()=>{child.kill();reject(new Error('La base de datos no respondió a tiempo.'));},20000);
  child.stdout.on('data',chunk=>{size+=chunk.length;if(size>4*1024*1024){child.kill();reject(new Error('Resultado demasiado grande.'));}else output+=chunk;});
  // PostgreSQL errors can contain row values. Never expose stderr or connection secrets.
  child.stderr.resume();
  child.on('error',()=>{clearTimeout(timeout);reject(new Error('PostgreSQL no está disponible. Revisa PSQL_BIN y DATABASE_URL.'));});
  child.on('close',code=>{clearTimeout(timeout);if(code!==0)reject(new Error('No se pudo completar la operación en PostgreSQL.'));else resolve(output.trim());});
  child.stdin.on('error',()=>{}); child.stdin.end(script);
 });
}
export async function query<T>(select:string, values:unknown[]=[]):Promise<T[]> {
 const output=await runSql(`SELECT COALESCE(json_agg(result),'[]'::json) FROM (${bind(select,values)}) result;`);
 return JSON.parse(output) as T[];
}
export async function write<T>(statement:string, values:unknown[]=[]):Promise<T[]> {
 const output=await runSql(`BEGIN; ${bind(statement,values)} COMMIT;`);
 return output?JSON.parse(output):[];
}
