import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {loadEnvFile} from 'node:process';
import {readFile} from 'node:fs/promises';
import {runSql,query,write,sqlValue} from '../src/server/db.ts';
import {createProject,getProject,listProjects,updateProject,assignMember} from '../src/server/projects.ts';
import {hashPassword} from '../src/server/password.ts';
import {authenticate,sessionUser,revoke} from '../src/server/auth.ts';
import type {User} from '../src/domain/project.ts';
import {migrationScript} from '../src/server/migrations.ts';
try{loadEnvFile('.env.test');}catch{}
const enabled=!!process.env.TEST_DATABASE_URL;
test('PostgreSQL integration: migration, isolation, audit, conflicts, roles and sessions',{skip:!enabled},async()=>{
 process.env.DATABASE_URL=process.env.TEST_DATABASE_URL;
 const schema='test_'+randomUUID().replaceAll('-','');
 const originalRunOptions=process.env.PGOPTIONS;
 // Test connection has its own schema; no production schema is deleted.
 await runSql(`CREATE SCHEMA ${schema};`);
 // Set search_path via a test-only URL option consumed explicitly by the adapter.
 process.env.DB_TEST_SCHEMA=schema;
 try{
  const migration=await readFile('db/migrations/001_core.sql','utf8');
  const initial={name:'001_core.sql',sql:migration};
  await runSql(migrationScript([initial]));
  await runSql(migrationScript([initial]));
  await assert.rejects(runSql(migrationScript([{...initial,sql:migration+'\n'}])));
  const hash=await hashPassword('password-integration-test');
  const owner:User={id:randomUUID(),email:randomUUID()+'@example.test',name:'Director test',is_admin:true};
  const outsider:User={id:randomUUID(),email:randomUUID()+'@example.test',name:'Other test',is_admin:false};
  await runSql(`INSERT INTO users(id,email,name,password_hash,is_admin) VALUES(${sqlValue(owner.id)},${sqlValue(owner.email)},'Director test',${sqlValue(hash)},true),(${sqlValue(outsider.id)},${sqlValue(outsider.email)},'Other test',${sqlValue(hash)},false);`);
  const input={name:'Prueba',municipality:'Medellín',department:'Antioquia',building_use:'vivienda',notes:"x'; DROP TABLE projects;--"};
  const projectId=await createProject(owner,input);assert.equal((await listProjects(owner)).length,1);assert.equal((await listProjects(outsider)).length,0);
  await assert.rejects(getProject(outsider,projectId));await assert.rejects(createProject(outsider,input));
  const p=await getProject(owner,projectId);assert.equal(p.notes,input.notes);
  await updateProject(owner,projectId,{...input,name:'Actualizado'},1);await assert.rejects(updateProject(owner,projectId,input,1));assert.equal((await getProject(owner,projectId)).revision,2);
  await assignMember(owner,projectId,outsider.email,'viewer');assert.equal((await getProject(outsider,projectId)).role,'viewer');await assert.rejects(updateProject(outsider,projectId,input,2));
  await assert.rejects(assignMember(outsider,projectId,owner.email,'viewer'));await assert.rejects(assignMember(owner,projectId,owner.email,'viewer'));
  const events=await query<{count:string}>('SELECT count(*) AS count FROM audit_events WHERE project_id=$1',[projectId]);assert.equal(Number(events[0].count),3);
  await assert.rejects(runSql('DELETE FROM audit_events;'));
  const token=await authenticate(owner.email,'password-integration-test');assert.equal((await sessionUser(token))?.id,owner.id);
  await revoke(token);assert.equal(await sessionUser(token),null);
  await assert.rejects(authenticate(owner.email,'incorrect-password'));
  // Atomicity: audit failure must roll back the business change.
  await assert.rejects(write(`UPDATE projects SET name='Should rollback' WHERE id=$1; INSERT INTO audit_events(id,actor_id,action) VALUES($2,$3,'bad');`,[projectId,randomUUID(),randomUUID()]));
  assert.equal((await getProject(owner,projectId)).name,'Actualizado');
 }finally{delete process.env.DB_TEST_SCHEMA; if(originalRunOptions===undefined)delete process.env.PGOPTIONS;else process.env.PGOPTIONS=originalRunOptions;await runSql(`DROP SCHEMA ${schema} CASCADE;`);}
});
