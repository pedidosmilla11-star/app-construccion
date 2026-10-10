import { readForm } from '../../../../../server/request-security.ts';
import { NextRequest } from 'next/server';
import { assignMember } from '../../../../../server/projects.ts';
import { id } from '../../../../../domain/project.ts';
import { go, requestUser, sameOrigin, safeMessage } from '../../../../../server/http.ts';
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}) {const p=await params;try{sameOrigin(request);const user=await requestUser(request),form=await readForm(request);await assignMember(user,id(p.id),String(form.get('email')||''),form.get('role'));return go(request,`/projects/${p.id}`,'Participante actualizado.');}catch(error){return go(request,`/projects/${encodeURIComponent(p.id)}`,safeMessage(error));}}
