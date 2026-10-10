import { loadEnvFile } from 'node:process';
import { access } from 'node:fs/promises';
import { query } from '../src/server/db.ts';
try { loadEnvFile('.env.local'); } catch {}

let failed = false;
function report(label: string, ok: boolean) {
  console.log(`${ok ? 'OK' : 'PENDIENTE'} · ${label}`);
  if (!ok) failed = true;
}
report('Node.js 24 o superior', Number(process.versions.node.split('.')[0]) >= 24);
let validOrigin = false;
try {
  const origin = new URL(process.env.APP_ORIGIN || '');
  validOrigin = ['http:', 'https:'].includes(origin.protocol) && origin.pathname === '/' && !origin.username && !origin.password;
} catch {}
report('APP_ORIGIN configurado', validOrigin);
report('DATABASE_URL configurada (no se muestra su contenido)', !!process.env.DATABASE_URL);
try {
  await access('db/migrations/001_core.sql');
  report('Migración inicial presente', true);
} catch { report('Migración inicial presente', false); }
if (process.env.DATABASE_URL) {
  try {
    await query('SELECT 1 AS connected');
    report('Conexión PostgreSQL', true);
    const [migration] = await query<{ exists: boolean }>("SELECT to_regclass('schema_migrations') IS NOT NULL AS exists");
    report('Historial de migraciones presente', migration.exists);
    if (migration.exists) {
      const applied = await query("SELECT name FROM schema_migrations WHERE name='001_core.sql'");
      report('Migración inicial aplicada', applied.length === 1);
    }
  } catch { report('Conexión y migraciones PostgreSQL', false); }
} else { report('Conexión y migraciones PostgreSQL', false); }
console.log('Este diagnóstico no crea usuarios ni modifica datos.');
process.exitCode = failed ? 1 : 0;
