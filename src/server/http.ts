import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sessionUser } from './auth.ts';
import { DomainError } from '../domain/project.ts';
import { checkOrigin } from './request-security.ts';
export async function requireUser() { const user=await sessionUser((await cookies()).get('construction_session')?.value);if(!user)redirect('/login');return user; }
export async function requestUser(request:NextRequest) { const user=await sessionUser(request.cookies.get('construction_session')?.value);if(!user)throw new DomainError('Inicia sesión.',401);return user; }
export function sameOrigin(request:NextRequest) { checkOrigin(request.headers.get('origin'),process.env.APP_ORIGIN); }
export function go(request:NextRequest,path:string,message?:string) { const origin=process.env.APP_ORIGIN||request.url;const url=new URL(path,origin);if(message)url.searchParams.set('message',message);return NextResponse.redirect(url,303); }
export function safeMessage(error:unknown) { return error instanceof DomainError?error.message:'No se pudo completar la operación. Revisa la conexión y las migraciones de PostgreSQL.'; }
