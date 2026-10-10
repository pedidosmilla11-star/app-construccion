import test from 'node:test';
import assert from 'node:assert/strict';
import {checkOrigin,readForm} from '../src/server/request-security.ts';
test('POST rejects absent and foreign origins',()=>{checkOrigin('http://localhost:3000','http://localhost:3000');assert.throws(()=>checkOrigin(null,'http://localhost:3000'));assert.throws(()=>checkOrigin('https://evil.example','http://localhost:3000'));assert.throws(()=>checkOrigin('http://localhost:3000',undefined));});
test('form reader supports accents and rejects duplicate, oversized and file submissions',async()=>{const req=(body:string,type='application/x-www-form-urlencoded')=>new Request('http://localhost:3000',{method:'POST',headers:{'content-type':type},body});assert.equal((await readForm(req('name=Medell%C3%ADn'))).get('name'),'Medellín');await assert.rejects(readForm(req('name=one&name=two')));await assert.rejects(readForm(req('notes='+'x'.repeat(33000))));await assert.rejects(readForm(req('{}','application/json')));});
