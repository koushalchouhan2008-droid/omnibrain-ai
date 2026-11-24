import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {createApp} from '../server/app.js';
import {createStore,openDatabase} from '../server/database.js';

async function setup() {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'omnibrain-http-'));
  const store=createStore(openDatabase(dir));
  const config={dbDir:dir,webDir:path.resolve('web'),secret:randomBytes(32),production:false,origin:'',maxModels:3,timeout:10000};
  const {server}=createApp({config,store});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  return {store,dir,server,base:`http://127.0.0.1:${server.address().port}`,async cleanup(){await new Promise(r=>server.close(r));store.close();fs.rmSync(dir,{force:true,recursive:true});}};
}
async function request(base,route,body,method='POST',cookie='') {
  const res=await fetch(base+route,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});
  let data;try{data=await res.json();}catch{data=await res.text().catch(()=>null);}
  return {status:res.status,data,cookie:res.headers.get('set-cookie')?.split(';')[0]};
}

// Sequential within file to avoid fetching mock side effects in other tests.
test('real local HTTP server: registration, auth, key encryption, chat streaming, isolation and deletion',async()=>{
  const app=await setup();
  const originalFetch=globalThis.fetch;
  try {
    const base=app.base;
    assert.equal((await request(base,'/api/health',null,'GET')).status,200);
    const reg=await request(base,'/api/v1/auth/register',{name:'Person One',email:'one@example.com',password:'strong-password-12345'});
    assert.equal(reg.status,201);assert.ok(reg.cookie.startsWith('omni_session='));
    const sessionA=reg.cookie;
    const me=await request(base,'/api/v1/me',null,'GET',sessionA);
    assert.equal(me.data.user.email,'one@example.com');
    const unauthorized=await request(base,'/api/v1/conversations',null,'GET');
    assert.equal(unauthorized.status,401);
    const bad=await request(base,'/api/v1/auth/login',{email:'one@example.com',password:'not-the-password'});
    assert.equal(bad.status,401);
    const saved=await request(base,'/api/v1/providers/openai/credential',{key:'sk-MOCK_SECRET_VALUE',model:'gpt-4.1-mini'},'PUT',sessionA);
    assert.equal(saved.status,200);
    const providers=await request(base,'/api/v1/providers',null,'GET',sessionA);
    assert.equal(providers.data.providers.find(x=>x.id==='openai').connected,true);
    assert.equal(JSON.stringify(providers.data).includes('MOCK_SECRET'),false);
    assert.equal(app.store.db.prepare('SELECT encrypted_key FROM credentials').get().encrypted_key.includes('MOCK_SECRET'),false);

    // Mock ONLY the upstream provider; local API continues to use real fetch.
    globalThis.fetch=async (url,options)=>{
      if(String(url).startsWith('https://api.openai.com/')) {
        const body=JSON.parse(options.body);
        assert.equal(body.model,'gpt-4.1-mini');assert.equal(options.headers.Authorization,'Bearer sk-MOCK_SECRET_VALUE');
        const chunks='data: {"choices":[{"delta":{"content":"Hello "}}]}\n\n'+
          'data: {"choices":[{"delta":{"content":"from API"}}]}\n\n'+
          'data: {"usage":{"prompt_tokens":18,"completion_tokens":4}}\n\n'+
          'data: [DONE]\n\n';
        return new Response(chunks,{status:200,headers:{'Content-Type':'text/event-stream'}});
      }
      return originalFetch(url,options);
    };
    const resp=await originalFetch(base+'/api/v1/chat/stream',{method:'POST',headers:{Cookie:sessionA,'Content-Type':'application/json'},body:JSON.stringify({message:'Hi there!',mode:'auto'})});
    assert.equal(resp.status,200);
    const events=await resp.text();
    assert.ok(events.includes('event: start'));
    assert.ok(events.includes('event: delta'));
    assert.ok(events.includes('Hello from API'));
    assert.ok(events.includes('event: final'));
    const conversations=await request(base,'/api/v1/conversations',null,'GET',sessionA);
    const cid=conversations.data.conversations[0].id;
    const history=await request(base,`/api/v1/conversations/${cid}`,null,'GET',sessionA);
    assert.equal(history.data.messages.length,2);
    assert.equal(history.data.messages[1].content,'Hello from API');
    assert.deepEqual(history.data.messages[1].meta.providers,['openai']);
    const usage=await request(base,'/api/v1/usage',null,'GET',sessionA);
    assert.equal(usage.data.summary.calls,1);
    assert.equal(usage.data.summary.input_tokens,18);
    const regB=await request(base,'/api/v1/auth/register',{name:'Person Two',email:'two@example.com',password:'other-strong-password-123'});
    const forbidden=await request(base,`/api/v1/conversations/${cid}`,null,'GET',regB.cookie);
    assert.equal(forbidden.status,404);
    const deletion=await request(base,`/api/v1/conversations/${cid}`,null,'DELETE',sessionA);
    assert.equal(deletion.status,200);
    const noChat=await request(base,`/api/v1/conversations/${cid}`,null,'GET',sessionA);
    assert.equal(noChat.status,404);
  } finally {globalThis.fetch=originalFetch;await app.cleanup();}
});

test('server rejects cross-origin writes and chat without connected providers',async()=>{
  const app=await setup();
  try {
    const reg=await request(app.base,'/api/v1/auth/register',{name:'Security User',email:'security@example.com',password:'long-passphrase-here'});
    const blocked=await fetch(app.base+'/api/v1/conversations',{method:'POST',headers:{Cookie:reg.cookie,'Content-Type':'application/json',Origin:'https://evil.example'},body:'{}'});
    assert.equal(blocked.status,403);
    // A secure tunnel can terminate HTTPS before sending HTTP to this local server.
    // Matching public host and HTTPS origin must work when ORIGIN is not configured.
    const tunnel=await fetch(app.base+'/api/v1/auth/register',{method:'POST',headers:{'Content-Type':'application/json',Origin:app.base.replace('http://','https://')},body:JSON.stringify({name:'Tunnel User',email:'tunnel@example.com',password:'long-passphrase-here'})});
    assert.equal(tunnel.status,201);
    const chat=await request(app.base,'/api/v1/chat/stream',{message:'This should fail'},'POST',reg.cookie);
    assert.equal(chat.status,409);
  } finally {await app.cleanup();}
});
