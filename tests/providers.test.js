import test from 'node:test';
import assert from 'node:assert/strict';
import {complete,parseSSE,braveSearch} from '../server/providers.js';

test('SSE parser handles split frames',async()=>{
  const stream=new ReadableStream({start(controller){
    controller.enqueue(new TextEncoder().encode('data: {"a":1}\n\ndata: {"a":'));
    controller.enqueue(new TextEncoder().encode('2}\n\ndata: [DONE]\n\n'));
    controller.close();
  }});
  const frames=[];await parseSSE(stream,v=>frames.push(v));
  assert.deepEqual(frames,['{"a":1}','{"a":2}','[DONE]']);
});

test('OpenAI compatible adapter uses real endpoint contract and captures token usage',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async(url,opts)=>{
    assert.equal(String(url),'https://api.openai.com/v1/chat/completions');
    assert.equal(opts.headers.Authorization,'Bearer TEST_KEY_123');
    assert.equal(JSON.parse(opts.body).model,'gpt-4.1-mini');
    return new Response(JSON.stringify({choices:[{message:{content:'Actual mocked provider response'}}],usage:{prompt_tokens:12,completion_tokens:6}}),{status:200});
  };
  try {
    const result=await complete({provider:'openai',key:'TEST_KEY_123',messages:[{role:'user',content:'Hello'}],signal:AbortSignal.timeout(1000)});
    assert.equal(result.content,'Actual mocked provider response');
    assert.equal(result.input,12);assert.equal(result.output,6);
  } finally {globalThis.fetch=original;}
});

test('Brave search only returns genuine HTTP(S) results from provider response',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async(url,opts)=>{
    assert.ok(String(url).startsWith('https://api.search.brave.com/res/v1/web/search'));
    assert.equal(opts.headers['X-Subscription-Token'],'BRAVE_KEY');
    return new Response(JSON.stringify({web:{results:[{title:'Evidence',url:'https://example.org/research',description:'Interesting result'},
      {title:'Invalid',url:'javascript:alert(1)',description:'Not safe'}]}}),{status:200});
  };
  try {
    const data=await braveSearch({key:'BRAVE_KEY',query:'Research question'});
    assert.equal(data.length,1);assert.equal(data[0].title,'Evidence');
  }finally{globalThis.fetch=original;}
});
