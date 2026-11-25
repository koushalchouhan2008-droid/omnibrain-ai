/** Official, fixed-host provider adapters. Keys are supplied server-side only. */
export const PROVIDERS = Object.freeze({
  ollama: {label:'Ollama (server-local)',model:'llama3.2',category:'ai',supportsStreaming:false},
  openai: { label:'OpenAI', model:'gpt-4.1-mini', category:'ai', supportsStreaming: true },
  gemini: { label:'Google Gemini', model:'gemini-2.5-flash', category:'ai', supportsStreaming: false },
  anthropic: { label:'Anthropic Claude', model:'claude-haiku-4-5', category:'ai', supportsStreaming: false },
  deepseek: { label:'DeepSeek', model:'deepseek-chat', category:'ai', supportsStreaming: true },
  grok: { label:'xAI Grok', model:'grok-3-mini', category:'ai', supportsStreaming: true },
  groq: {label:'Groq',model:'llama-3.3-70b-versatile',category:'ai',supportsStreaming:true},
  openrouter: {label:'OpenRouter',model:'openrouter/auto',category:'ai',supportsStreaming:true},
  mistral: {label:'Mistral',model:'mistral-small-latest',category:'ai',supportsStreaming:true},
  together: {label:'Together AI',model:'meta-llama/Llama-3.3-70B-Instruct-Turbo',category:'ai',supportsStreaming:true},
  huggingface: {label:'Hugging Face',model:'Qwen/Qwen2.5-7B-Instruct',category:'ai',supportsStreaming:false},
  perplexity: {label:'Perplexity',model:'sonar',category:'ai',supportsStreaming:false},
  tavily: {label:'Tavily Search',model:null,category:'search',supportsStreaming:false},
  brave: { label:'Brave Web Search', model:null, category:'search', supportsStreaming: false },
});

export class ProviderError extends Error {
  constructor(message, status = 502) { super(message); this.name = 'ProviderError'; this.status = status; }
}

function validatedModel(model, provider) {
  const value = model || PROVIDERS[provider]?.model;
  if (typeof value !== 'string' || !/^[\w.:\/-]{1,100}$/.test(value)) throw new ProviderError('Unsupported model identifier.',400);
  return value;
}

const chatEndpoints = {
  groq:'https://api.groq.com/openai/v1/chat/completions',
  openrouter:'https://openrouter.ai/api/v1/chat/completions',
  mistral:'https://api.mistral.ai/v1/chat/completions',
  together:'https://api.together.xyz/v1/chat/completions',
  huggingface:'https://router.huggingface.co/v1/chat/completions',
  perplexity:'https://api.perplexity.ai/chat/completions',
  openai:'https://api.openai.com/v1/chat/completions',
  deepseek:'https://api.deepseek.com/chat/completions',
  grok:'https://api.x.ai/v1/chat/completions'
};

async function checkedFetch(url, opts, signal) {
  let resp;
  try { resp = await fetch(url, { ...opts, signal, redirect:'error' }); }
  catch (error) {
    if (signal?.aborted) throw new ProviderError('Request timed out or was cancelled.', 504);
    throw new ProviderError(`Provider unreachable: ${error.message}`, 502);
  }
  if (!resp.ok) {
    const data = (await resp.text()).slice(0, 600);
    let parsed;
    try { parsed = JSON.parse(data); } catch {}
    const detail = `HTTP ${resp.status}; check credentials, model availability and quota.`;
    const clean = String(detail).replace(/[\r\n]+/g, ' ').slice(0, 220);
    throw new ProviderError(`${resp.status} from provider: ${clean}`, resp.status);
  }
  return resp;
}

/** Parsing keeps partial records until a complete SSE event is available. */
export async function parseSSE(stream, handler) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream:true });
      let n;
      while ((n = buffer.search(/\r?\n\r?\n/)) >= 0) {
        const separator = buffer.slice(n).match(/^\r?\n\r?\n/)[0];
        const frame = buffer.slice(0,n);
        buffer = buffer.slice(n + separator.length);
        const parts = frame.split(/\r?\n/).filter(s => s.startsWith('data:')).map(s => s.slice(5).trimStart());
        if (parts.length) await handler(parts.join('\n'));
      }
    }
    if (buffer.trim()) {
      const line = buffer.split(/\r?\n/).find(x => x.startsWith('data:'));
      if (line) await handler(line.slice(5).trim());
    }
  } finally { reader.releaseLock(); }
}

async function openAICompatible({provider,key,model,messages,signal,onDelta,stream=false}) {
  const actualModel = validatedModel(model,provider);
  const headers = { 'Content-Type':'application/json', Authorization:`Bearer ${key}` };
  const body = { model:actualModel, messages, stream };
  if (stream) body.stream_options = { include_usage:true };
  const response = await checkedFetch(chatEndpoints[provider], { method:'POST', headers, body:JSON.stringify(body) }, signal);
  if (!stream) {
    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content;
    if (typeof answer !== 'string' || !answer.trim()) throw new ProviderError('Provider returned an empty response.');
    return { content:answer, input:data.usage?.prompt_tokens ?? null, output:data.usage?.completion_tokens ?? null, model:actualModel };
  }
  let content = '', usage = {};
  await parseSSE(response.body, async line => {
    if (line === '[DONE]') return;
    let packet;
    try { packet = JSON.parse(line); } catch { return; }
    if (packet.error) throw new ProviderError(packet.error.message || 'Streaming provider error.');
    const delta = packet.choices?.[0]?.delta?.content;
    if (typeof delta === 'string' && delta) {
      content += delta;
      onDelta?.(delta);
    }
    if (packet.usage) usage = packet.usage;
  });
  if (!content) throw new ProviderError('Streaming response ended without content.');
  return { content, input:usage.prompt_tokens ?? null, output:usage.completion_tokens ?? null, model:actualModel };
}

async function anthropic({key,model,messages,signal}) {
  const actualModel = validatedModel(model,'anthropic');
  const systemText = messages.filter(m => m.role === 'system').map(m=>m.content).join('\n');
  const promptMessages = messages.filter(m => m.role !== 'system').map(m => ({ role:m.role === 'assistant'?'assistant':'user', content:m.content }));
  const resp = await checkedFetch('https://api.anthropic.com/v1/messages', {
    method:'POST', headers:{'x-api-key':key,'anthropic-version':'2023-06-01','Content-Type':'application/json'},
    body:JSON.stringify({model:actualModel,max_tokens:8192,system:systemText,messages:promptMessages})
  },signal);
  const data=await resp.json();
  const answer = (data.content || []).filter(x=>x.type==='text').map(x=>x.text).join('\n');
  if (!answer) throw new ProviderError('Anthropic returned no text.');
  return { content:answer, input:data.usage?.input_tokens ?? null, output:data.usage?.output_tokens ?? null, model:actualModel };
}

async function gemini({key,model,messages,signal}) {
  const actualModel = validatedModel(model,'gemini');
  const system = messages.filter(m=>m.role==='system').map(m=>m.content).join('\n');
  const contents = messages.filter(m=>m.role!=='system').map(m=>({role:m.role==='assistant'?'model':'user',parts:[{text:m.content}]}));
  const resp = await checkedFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(actualModel)}:generateContent`, {
    method:'POST', headers:{'x-goog-api-key':key,'Content-Type':'application/json'},
    body:JSON.stringify({systemInstruction:{parts:[{text:system || 'Be helpful and accurate.'}]},contents,generationConfig:{maxOutputTokens:8192}})
  },signal);
  const data=await resp.json();
  const answer = data.candidates?.[0]?.content?.parts?.map(x=>x.text || '').join('');
  if (!answer) throw new ProviderError('Gemini returned no text (possibly blocked by safety settings).');
  return {content:answer, input:data.usageMetadata?.promptTokenCount ?? null, output:data.usageMetadata?.candidatesTokenCount ?? null, model:actualModel};
}

export async function complete({provider,key,model,messages,signal,onDelta,stream=false}) {
  if (!PROVIDERS[provider] || PROVIDERS[provider].category!=='ai') throw new ProviderError('Unknown AI provider.',400);
  if(provider==='ollama'){if(process.env.OLLAMA_ENABLED!=='true')throw new ProviderError('Operator must enable OLLAMA_ENABLED=true on the backend.',400);const actualModel=validatedModel(model,provider);const resp=await checkedFetch('http://127.0.0.1:11434/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:actualModel,messages,stream:false})},signal);const d=await resp.json();if(!d.choices?.[0]?.message?.content)throw new ProviderError('Ollama returned no text.');return {content:d.choices[0].message.content,model:actualModel,input:d.usage?.prompt_tokens,output:d.usage?.completion_tokens};}
  if (!key) throw new ProviderError('Provider is not configured.',400);
  if (provider === 'gemini') return gemini({key,model,messages,signal});
  if (provider === 'anthropic') return anthropic({key,model,messages,signal});
  return openAICompatible({provider,key,model,messages,signal,onDelta,stream});
}

export async function braveSearch({key,query,signal}) {
  if (!key) throw new ProviderError('Brave API key is not configured.',400);
  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q',query.slice(0,300));
  url.searchParams.set('count','5');
  const resp=await checkedFetch(url, { headers:{Accept:'application/json','X-Subscription-Token':key} },signal);
  const result=await resp.json();
  return (result.web?.results || []).slice(0,5).map(x=>({title:String(x.title||'').slice(0,180),url:x.url,description:String(x.description||'').slice(0,420)}))
    .filter(x=>typeof x.url==='string' && /^https?:\/\//.test(x.url));
}

export async function testConnection(provider,key,signal) {
  if (!Object.hasOwn(PROVIDERS,provider)) throw new ProviderError('Unknown provider.',400);
  let url, headers = {Accept:'application/json'};
  if(provider==='ollama'){if(process.env.OLLAMA_ENABLED!=='true')throw new ProviderError('Ollama is not enabled on this backend.',400);await checkedFetch('http://127.0.0.1:11434/api/tags',{},signal);return true;}
  if (provider==='openai') {url='https://api.openai.com/v1/models';headers.Authorization=`Bearer ${key}`;}
  else if (provider==='deepseek') {url='https://api.deepseek.com/models';headers.Authorization=`Bearer ${key}`;}
  else if (provider==='grok') {url='https://api.x.ai/v1/models';headers.Authorization=`Bearer ${key}`;}
  else if (provider==='anthropic') {url='https://api.anthropic.com/v1/models';headers['x-api-key']=key;headers['anthropic-version']='2023-06-01';}
  else if (provider==='gemini') {url='https://generativelanguage.googleapis.com/v1beta/models';headers['x-goog-api-key']=key;}
  else if(provider==='tavily'){await checkedFetch('https://api.tavily.com/search',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({query:'connection test',max_results:1})},signal);return true;}
  else if(chatEndpoints[provider]){await complete({provider,key,messages:[{role:'user',content:'Reply OK'}],signal});return true;}
  else {url='https://api.search.brave.com/res/v1/web/search?q=connection+test&count=1'; headers['X-Subscription-Token']=key;}
  await checkedFetch(url,{headers},signal);
  return true;
}
