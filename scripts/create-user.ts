import { loadEnvFile } from 'node:process';
import { randomUUID } from 'node:crypto';
import { hashPassword } from '../src/server/password.ts';
import { write } from '../src/server/db.ts';
try{loadEnvFile('.env.local');}catch{}
try{
 const [email,name,flag]=process.argv.slice(2);const password=process.env.APP_USER_PASSWORD;
 if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!name||name.length>120||!password)throw new Error('Uso: APP_USER_PASSWORD configurada y npm run user:create -- correo nombre [--admin].');
 const hash=await hashPassword(password),userId=randomUUID();delete process.env.APP_USER_PASSWORD;
 await write(`WITH added AS (INSERT INTO users(id,email,name,password_hash,is_admin) VALUES($1,$2,$3,$4,$5) RETURNING id), logged AS (INSERT INTO audit_events(id,actor_id,action,details) SELECT $6,id,'user.provisioned',jsonb_build_object('method','local operator','is_admin',$5::boolean) FROM added RETURNING id) SELECT json_agg(logged) FROM logged;`,[userId,email.toLowerCase(),name,hash,flag==='--admin',randomUUID()]);
 console.log('Usuario creado. No se mostraron credenciales.');
}catch(error){console.error(error instanceof Error?error.message:'Error al crear usuario.');process.exitCode=1;}
