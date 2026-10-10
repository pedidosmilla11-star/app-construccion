import test from 'node:test';
import assert from 'node:assert/strict';
import { migrationScript } from '../src/server/migrations.ts';

test('migration history has deterministic checksums and rejects ambiguous inputs', () => {
  const file = { name: '001_core.sql', sql: 'CREATE TABLE sample(id integer);' };
  assert.equal(migrationScript([file]), migrationScript([file]));
  assert.notEqual(migrationScript([file]), migrationScript([{ ...file, sql: file.sql + '\n' }]));
  assert.throws(() => migrationScript([file, file]));
  assert.throws(() => migrationScript([{ ...file, name: '../001_core.sql' }]));
  assert.throws(() => migrationScript([{ ...file, sql: '$migration$' }]));
  assert.throws(() => migrationScript([]));
});
