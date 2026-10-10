import { readForm } from '../../../server/request-security.ts';
import { NextRequest } from 'next/server';
import { authenticate } from '../../../server/auth.ts';
import { go, sameOrigin, safeMessage } from '../../../server/http.ts';
export async function POST(request:NextRequest) {
 try {sameOrigin(request);const form=await readForm(request);const token=await authenticate(String(form.get('email')||''),String(form.get('password')||''));const response=go(request,'/projects');response.cookies.set('construction_session',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:8*3600});return response;}
 catch(error){return go(request,'/login',safeMessage(error));}
}
