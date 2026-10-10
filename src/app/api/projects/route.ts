import { readForm } from '../../../server/request-security.ts';
import { NextRequest } from 'next/server';
import { createProject } from '../../../server/projects.ts';
import { projectInput } from '../../../domain/project.ts';
import { go, requestUser, sameOrigin, safeMessage } from '../../../server/http.ts';
export async function POST(request:NextRequest) {try{sameOrigin(request);const user=await requestUser(request);const projectId=await createProject(user,projectInput(await readForm(request)));return go(request,`/projects/${projectId}`);}catch(error){return go(request,'/projects/new',safeMessage(error));}}
