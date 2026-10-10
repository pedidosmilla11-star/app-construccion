import { readForm } from '../../../../server/request-security.ts';
import { NextRequest } from 'next/server';
import { updateProject } from '../../../../server/projects.ts';
import { projectInput, id } from '../../../../domain/project.ts';
import { go, requestUser, sameOrigin, safeMessage } from '../../../../server/http.ts';
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}) {const p=await params;try{sameOrigin(request);const user=await requestUser(request);const form=await readForm(request);await updateProject(user,id(p.id),projectInput(form),Number(form.get('revision')));return go(request,`/projects/${p.id}`,'Datos actualizados.');}catch(error){return go(request,`/projects/${encodeURIComponent(p.id)}`,safeMessage(error));}}
