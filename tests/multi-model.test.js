import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {openDatabase,createStore} from '../server/database.js';
import {createApp} from '../server/app.js';

async function scenario() {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'omnibrain-multi-'));
  const store=createStore(openDatabase(dir));
  const {server}=createApp({config:{webDir:path.resolve('web'),dbDir:dir,secret:randomBytes(32),maxModels:3,timeout:10000,production:false,origin:''},store});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const originFetch=globalThis.fetch;
  async function api(route,body,method='POST',cookie='') {
    const response=await originFetch(base+route,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    const text=await response.text();return {status:response.status,data:text,headers:response.headers};
  }
  return {base,api,store,originFetch,async done(){globalThis.fetch=originFetch;await new Promise(resolve=>server.close(resolve));store.close();fs.rmSync(dir,{force:true,recursive:true});}};
}

test('Ultimate Brain performs two real-adapter calls plus synthesis and records source references',async()=>{
  const s=await scenario();
  try {
    const register=await s.api('/api/v1/auth/register',{name:'Multi User',email:'multi@example.com',password:'this-is-long-enough-123'});
    const cookie=register.headers.get('set-cookie').split(';')[0];
    for(const [p,key] of [['openai','sk-openai-MOCK'],['gemini','gemini-MOCK'],['brave','brave-MOCK']]) {
      const result=await s.api(`/api/v1/providers/${p}/credential`,{key},'PUT',cookie);
      assert.equal(result.status,200);
    }
    let openaiCount=0, geminiCount=0;
    globalThis.fetch=async(url,opts)=>{
      const value=String(url);
      if(value.includes('api.search.brave.com')) {
        return new Response(JSON.stringify({web:{results:[{title:'Public article',url:'https://example.org/article',description:'Source data'}]}}),{status:200});
      }
      if(value.includes('api.openai.com')) {
        openaiCount++;
        const content=openaiCount===1?'Model A claims fact X.':'The two models disagree about X, so verify it.';
        return new Response(JSON.stringify({choices:[{message:{content}}],usage:{prompt_tokens:20,completion_tokens:11}}),{status:200});
      }
      if(value.includes('generativelanguage.googleapis.com')) {
        geminiCount++;
        const text=geminiCount===1?'Model B disputes X.':'The two models disagree about X, so verify it.';
        return new Response(JSON.stringify({candidates:[{content:{parts:[{text}]}}],usageMetadata:{promptTokenCount:16,candidatesTokenCount:7}}),{status:200});
      }
      return s.originFetch(url,opts);
    };
    const chat=await s.api('/api/v1/chat/stream',{message:'What does article say?',mode:'ultimate',search:true},'POST',cookie);
    assert.equal(chat.status,200);
    assert.ok(chat.data.includes('event: sources'));
    assert.ok(chat.data.includes('example.org/article'));
    assert.ok(chat.data.includes('event: final'));
    assert.ok(chat.data.includes('two models disagree'));
    assert.equal(openaiCount+geminiCount,3);
    const convo=(await s.api('/api/v1/conversations',null,'GET',cookie));
    const cid=JSON.parse(convo.data).conversations[0].id;
    const history=JSON.parse((await s.api(`/api/v1/conversations/${cid}`,null,'GET',cookie)).data);
    assert.equal(history.messages[1].meta.providers.length,2);
    assert.equal(history.messages[1].meta.sources.length,1);
    assert.equal(JSON.parse((await s.api('/api/v1/usage',null,'GET',cookie)).data).summary.calls,3);
  }finally{await s.done();}
});
