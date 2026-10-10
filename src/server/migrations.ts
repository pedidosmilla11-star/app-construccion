import { createHash } from 'node:crypto';
import { sqlValue } from './db.ts';

export function migrationScript(files: { name: string; sql: string }[]) {
  const names = new Set<string>();
  const statements = [...files].sort((a, b) => a.name.localeCompare(b.name)).map(file => {
    if (!/^\d+_[a-z_]+\.sql$/.test(file.name) || names.has(file.name)) {
      throw new Error('Nombre de migración inválido o duplicado.');
    }
    names.add(file.name);
    if (!file.sql.trim() || file.sql.includes('$migration$')) {
      throw new Error('Contenido de migración vacío o delimitador reservado.');
    }
    const checksum = createHash('sha256').update(file.sql).digest('hex');
    return `DO $migration$
BEGIN
  IF EXISTS (SELECT 1 FROM schema_migrations WHERE name=${sqlValue(file.name)} AND checksum<>${sqlValue(checksum)}) THEN
    RAISE EXCEPTION 'Migration checksum mismatch';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM schema_migrations WHERE name=${sqlValue(file.name)}) THEN
    ${file.sql}
    INSERT INTO schema_migrations(name,checksum) VALUES (${sqlValue(file.name)},${sqlValue(checksum)});
  END IF;
END;
$migration$;`;
  });
  if (!statements.length) throw new Error('No se encontraron migraciones.');
  return `BEGIN;
SELECT pg_advisory_xact_lock(76341001);
CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now());
${statements.join('\n')}
COMMIT;`;
}
