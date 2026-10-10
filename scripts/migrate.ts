import { loadEnvFile } from 'node:process';
import { readFile, readdir } from 'node:fs/promises';
import { runSql } from '../src/server/db.ts';
import { migrationScript } from '../src/server/migrations.ts';
try {loadEnvFile('.env.local');} catch {}
const files=(await readdir('db/migrations')).filter(f=>/^\d+_[a-z_]+\.sql$/.test(f)).sort();
try {
 const migrations=await Promise.all(files.map(async name=>({name,sql:await readFile(`db/migrations/${name}`,'utf8')})));
 // One connection and transaction: lock, check history and apply only missing migrations.
 const script=migrationScript(migrations);
 await runSql(script); console.log('Migraciones aplicadas y comprobadas.');
}catch(error){console.error(error instanceof Error?error.message:'Error de migración.');process.exitCode=1;}
