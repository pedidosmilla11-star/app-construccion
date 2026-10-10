import { DomainError } from '../domain/project.ts';
export function checkOrigin(actual:string|null,configured:string|undefined) {
 if(!configured)throw new DomainError('Configura APP_ORIGIN antes de usar la aplicación.',503);
 if(actual!==new URL(configured).origin)throw new DomainError('Origen de solicitud no permitido.',403);
}
export async function readForm(request:Request) {
 if(!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))throw new DomainError('Formato de solicitud no permitido.',415);
 const reader=request.body?.getReader(); if(!reader)throw new DomainError('Solicitud vacía.');
 let size=0;const chunks:Uint8Array[]=[];
 try {for(;;){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>32768){await reader.cancel();throw new DomainError('Solicitud demasiado grande.',413);}chunks.push(part.value);}}finally{reader.releaseLock();}
 const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength;}
 const fields=new URLSearchParams(new TextDecoder().decode(data)),form=new FormData();
 for(const [key,value] of fields){if(form.has(key))throw new DomainError('Campo duplicado.');form.set(key,value);}return form;
}
