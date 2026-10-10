import { loadEnvFile } from 'node:process';
import { randomUUID } from 'node:crypto';
import { query, write } from '../src/server/db.ts';
import type { User } from '../src/domain/project.ts';
try{loadEnvFile('.env.local');}catch{}
try{
 const email=process.argv[2]?.toLowerCase();if(!email)throw new Error('Uso: npm run pilot:seed -- correo-del-director');
 const [user]=await query<User>('SELECT id,name,email,is_admin FROM users WHERE email=$1 AND active',[email]);if(!user?.is_admin)throw new Error('El director inicial debe ser un administrador existente.');
 const notes='Piloto Las Violetas, Medellín, Antioquia. Área de intervención rectangular informada: 10 m de frente × 7 m de fondo = 70 m², vacía, vecinos a ambos lados, dentro de un predio mayor y sin matrícula independiente. Área del predio matriz desconocida. Apartaestudios de una habitación con cocineta. Objetivo de crecimiento progresivo hasta cuatro pisos; altura y normativa del predio sin verificar. A-01: reserva bruta de vivienda 39 m², acceso/escalera 18 m², patios 13 m². Validación conceptual del usuario el 9 de octubre de 2026; no es aprobación técnica. Dirección y diferencia calle/carrera 84 pendientes. A-02 pendiente de desarrollo. Fuente: documentos y conversación del proyecto.';
 const created=await write<{id:string}>(`WITH added AS (INSERT INTO projects(id,code,name,municipality,department,building_use,notes,created_by) VALUES($1,'LV-001','Las Violetas','Medellín','Antioquia','vivienda',$2,$3) ON CONFLICT(code) DO NOTHING RETURNING id), member AS (INSERT INTO memberships(project_id,user_id,role) SELECT id,$3,'director' FROM added RETURNING project_id), logged AS (INSERT INTO audit_events(id,actor_id,project_id,action,details) SELECT $4,$3,project_id,'project.created',jsonb_build_object('source','existing project documents','conceptual_validation_date','2026-10-09','technical_approval',false) FROM member RETURNING project_id) SELECT COALESCE(json_agg(logged),'[]'::json) FROM logged;`,[randomUUID(),notes,user.id,randomUUID()]);
 console.log(created.length?'Piloto cargado; datos faltantes y validación conceptual preservados.':'El piloto ya existe; no fue sobrescrito.');
}catch(error){console.error(error instanceof Error?error.message:'Error al cargar piloto.');process.exitCode=1;}
