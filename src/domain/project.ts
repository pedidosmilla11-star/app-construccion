export const roles = ['director','designer','reviewer','approver','viewer'] as const;
export type Role = typeof roles[number];
export type User = { id: string; email: string; name: string; is_admin: boolean };
export type Project = { id:string; code:string; name:string; municipality:string; department:string; building_use:string; status:string; notes:string; revision:number; role:Role; created_at:string };
export class DomainError extends Error { status:number; constructor(message:string, status:number=400) { super(message); this.status=status; } }
export function canEdit(role:Role) { return role === 'director' || role === 'designer'; }
export function isRole(value:unknown): value is Role { return roles.includes(value as Role); }
export function id(value:string) { if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new DomainError('Identificador inválido.',404); return value; }
export function projectInput(form:FormData) {
 const text = (key:string,max:number) => { const v = form.get(key); if(typeof v !== 'string') throw new DomainError('Completa los campos requeridos.'); const s=v.trim(); if(!s || s.length>max || s.includes('\0')) throw new DomainError(`Revisa el campo ${key}.`); return s; };
 const name=text('name',160), municipality=text('municipality',120), department=text('department',120), building_use=text('building_use',20);
 if(!['vivienda','oficinas','comercio','mixto'].includes(building_use)) throw new DomainError('Uso de edificación inválido.');
 const notes=form.get('notes') ?? ''; if(typeof notes!=='string' || notes.length>4000 || notes.includes('\0')) throw new DomainError('Notas inválidas.');
 return {name,municipality,department,building_use,notes:notes.trim()};
}
