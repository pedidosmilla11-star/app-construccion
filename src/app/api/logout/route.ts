import { readForm } from '../../../server/request-security.ts';
import { NextRequest } from 'next/server';
import { revoke } from '../../../server/auth.ts';
import { go, sameOrigin, safeMessage } from '../../../server/http.ts';
export async function POST(request:NextRequest) {try{sameOrigin(request);const token=request.cookies.get('construction_session')?.value;if(token)await revoke(token);const response=go(request,'/login');response.cookies.delete('construction_session');return response;}catch(error){return go(request,'/projects',safeMessage(error));}}
