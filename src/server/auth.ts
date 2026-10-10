import { randomBytes, randomUUID } from 'node:crypto';
import { query, write } from './db.ts';
import { verifyPassword, tokenHash } from './password.ts';
import { DomainError, type User } from '../domain/project.ts';
const dummy='scrypt$00000000000000000000000000000000$'+'00'.repeat(64);
export async function authenticate(email:string,password:string) {
 email=email.trim().toLowerCase(); if(email.length>254 || !email.includes('@') || !password || password.length>1024) throw new DomainError('Credenciales incorrectas.',401);
 const limits=await write<{attempts:number}>(`WITH attempt AS (INSERT INTO login_limits(email,attempts,reset_at) VALUES ($1,1,now()+interval '15 minutes') ON CONFLICT(email) DO UPDATE SET attempts=CASE WHEN login_limits.reset_at<=now() THEN 1 ELSE login_limits.attempts+1 END, reset_at=CASE WHEN login_limits.reset_at<=now() THEN now()+interval '15 minutes' ELSE login_limits.reset_at END RETURNING attempts) SELECT json_agg(attempt) FROM attempt;`,[email]);
 if(limits[0].attempts>10)throw new DomainError('Demasiados intentos. Espera 15 minutos.',429);
 const [user]=await query<User & {password_hash:string;active:boolean}>('SELECT id,email,name,is_admin,password_hash,active FROM users WHERE email=$1',[email]);
 const valid=await verifyPassword(password,user?.password_hash||dummy);
 if(!valid || !user?.active)throw new DomainError('Credenciales incorrectas.',401);
 const token=randomBytes(32).toString('hex');
 await write(`WITH session_added AS (INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '8 hours') RETURNING user_id), logged AS (INSERT INTO audit_events(id,actor_id,action) SELECT $3,user_id,'session.created' FROM session_added RETURNING id) SELECT json_agg(logged) FROM logged;`,[tokenHash(token),user.id,randomUUID()]);
 return token;
}
export async function sessionUser(token:string|undefined):Promise<User|null> {
 if(!token || !/^[a-f0-9]{64}$/.test(token))return null;
 const [user]=await query<User>('SELECT u.id,u.email,u.name,u.is_admin FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active',[tokenHash(token)]);
 return user||null;
}
export async function revoke(token:string) {
 await write(`WITH removed AS (DELETE FROM sessions WHERE token_hash=$1 RETURNING user_id), logged AS (INSERT INTO audit_events(id,actor_id,action) SELECT $2,user_id,'session.revoked' FROM removed RETURNING id) SELECT COALESCE(json_agg(logged),'[]'::json) FROM logged;`,[tokenHash(token),randomUUID()]);
}
