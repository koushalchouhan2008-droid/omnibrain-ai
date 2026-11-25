const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const state = {
  user:null, providers:[], conversations:[], conversationId:null,
  models:new Set(), search:false, view:'chat', busy:false, runId:null,
  controller:null, authMode:'login', credentialProvider:null, backendReady:false, authBusy:false,
};

function html(tag,cls,text) {
  const el=document.createElement(tag);
  if(cls) el.className=cls;
  if(text!==undefined) el.textContent=String(text);
  return el;
}
async function api(path,options={}) {
  const method=options.method||'GET';
  const deferred=['agent/run','search','site','gmail/draft','automation/run','artifact/generate','agent/plan','automation/plan','link/test','service/test','service/read'].some(x=>path==='/api/v1/workspace/'+x);
  if(window.OMNI_PROXY&&method==='POST'&&deferred){const r=await queuedFetch(path,options.body);if(!r.ok){const d=await r.json();throw Error(d.error||'Background request failed.');}return r.json();}
  let response;
  try {response=await fetch(path,{method,credentials:'same-origin',cache:'no-store',redirect:'error',signal:options.signal,headers:{Accept:'application/json',...(options.body?{'Content-Type':'application/json'}:{})},body:options.body?JSON.stringify(options.body):undefined});}
  catch {throw Object.assign(new Error('Cannot reach the OMNIBRAIN backend. Check your internet connection or server deployment.'),{status:0});}
  let result;
  try {result=await response.json();} catch {}
  if(!response.ok || !result || typeof result!=='object' || Array.isArray(result)) {
    const message=(!result || response.status>=500)?`Backend unavailable or API routing is incorrect (HTTP ${response.status}). Check deployment and retry.`:result.error || `Request failed (${response.status})`;
    throw Object.assign(new Error(message),{status:response.status});
  }
  return result;
}
async function queuedFetch(path,body,signal){const response=await fetch('/api/v1/tasks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path,body}),signal});if(!response.ok)return response;const {id}=await response.json();for(let i=0;i<300;i++){await new Promise(r=>setTimeout(r,1500));const p=await fetch('/api/v1/tasks/'+id,{signal,cache:'no-store'});if(!p.ok)return p;const t=await p.json();if(t.done)return new Response(t.output,{status:t.status,headers:{'Content-Type':path.endsWith('/stream')?'text/event-stream':'application/json'}});}throw Error('Background task wait timed out; check saved history.');}
let toastTimer;
function toast(message) {
  const element=$('#toast');element.textContent=message;element.classList.remove('hidden');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>element.classList.add('hidden'),4500);
}
function setTheme(theme) {
  const selected=['dark','wukong','tron','minimal','amoled','light'].includes(theme)?theme:'dark';
  document.documentElement.dataset.theme=selected;
  $('#theme-select').value=selected;
  localStorage.setItem('omnibrain-theme',selected);
}
setTheme(localStorage.getItem('omnibrain-theme')||'dark');

function authScreen(show) {$('#auth-screen').classList.toggle('hidden',!show);}
function chooseAuth(mode) {
  state.authMode=mode;
  const register=mode==='register';
  $('#auth-title').textContent=register?'Create your account':'Welcome back';
  $('#name-field').classList.toggle('hidden',!register);
  $('#auth-name').required=register;
  $('#auth-password').minLength=register?12:1;
  $('#auth-password').autocomplete=register?'new-password':'current-password';
  $('#auth-submit').textContent=register?'Create account →':'Sign in →';
  $('#sign-in-tab').classList.toggle('active',!register);
  $('#register-tab').classList.toggle('active',register);
  $('#auth-error').textContent='';
}
$('#sign-in-tab').addEventListener('click',()=>chooseAuth('login'));
$('#register-tab').addEventListener('click',()=>chooseAuth('register'));
function authConnection(ready,message) {
  state.backendReady=ready;
  $('#auth-submit').disabled=!ready||state.authBusy;
  $('#auth-status').textContent=message;
  $('#auth-retry').classList.toggle('hidden',ready);
}
async function verifyBackend() {
  const health=await api('/api/health',{signal:AbortSignal.timeout(12000)});
  if(health.ok!==true || health.service!=='OMNIBRAIN AI') throw new Error('This address is not connected to the OMNIBRAIN API.');
}
function deploymentError(error) {
  const detail=error.status===404||error.status===405||error.status===200?'API route not found.':error.message;
  return `${detail} Start the Node server, or deploy the frontend using npm run build with OMNI_BACKEND_URL set to your live HTTPS backend. Then retry.`;
}
$('#auth-retry').addEventListener('click',()=>init());
$('#auth-form').addEventListener('submit',async(event)=>{
  event.preventDefault();
  if(!state.backendReady||state.authBusy)return;
  const button=$('#auth-submit');state.authBusy=true;button.disabled=true;$('#auth-retry').classList.add('hidden');$('#auth-error').textContent='';
  const register=state.authMode==='register';
  const body={email:$('#auth-email').value,password:$('#auth-password').value};
  if(register) body.name=$('#auth-name').value;
  let submitted=false;
  try {
    await verifyBackend();
    const response=await api(`/api/v1/auth/${register?'register':'login'}`,{method:'POST',body,signal:AbortSignal.timeout(25000)});
    if(!response.user?.id)throw new Error('Invalid authentication response.');
    submitted=true;
    $('#auth-password').value='';
    const {user}=await api('/api/v1/me',{signal:AbortSignal.timeout(12000)});
    if(!user?.id || user.id!==response.user.id)throw new Error('Session could not be verified.');
    state.user=user;
    await initializeWorkspace();authScreen(false);
  } catch(error) {
    authScreen(true);
    if(submitted){chooseAuth('login');$('#auth-error').textContent=(register?'Account created. ':'')+'Session or workspace could not be loaded. Check HTTPS, cookies and the backend, then sign in again.';}
    else if([0,404,405,200,502,503,504].includes(error.status)||!error.status){authConnection(false,deploymentError(error));}
    else if(error.status===403){$('#auth-error').textContent='Server rejected this website origin. Ask the host administrator to set ORIGIN to the exact frontend HTTPS URL.';}
    else if(error.status===409&&register){$('#auth-error').textContent='Email already registered. Use Sign in.';}
    else $('#auth-error').textContent=error.message;
  } finally {state.authBusy=false;button.disabled=!state.backendReady;}
});
async function initializeWorkspace() {
  wsData=null;currentSite=null;$('#site-result').classList.add('hidden');$('#site-preview').removeAttribute('src');$('#site-source').value='';$('#agent-result').textContent='';$('#mail-form').reset();$('#mail-result').textContent='';
  $('#user-avatar').textContent=(state.user.name||'U').slice(0,1).toUpperCase();
  $('#account-name').textContent=state.user.name;
  $('#account-email').textContent=state.user.email;
  await Promise.all([fetchProviders(),fetchConversations()]);
  showView(location.hash==='#connections'?'connections':'chat');
}
async function init() {
  if(state.authBusy)return;
  state.authBusy=true;authScreen(true);authConnection(false,'Checking secure backend connection…');$('#auth-retry').disabled=true;
  try {
    await verifyBackend();
    try {
      const {user}=await api('/api/v1/me',{signal:AbortSignal.timeout(12000)});
      if(!user?.id)throw new Error('Invalid account API response.');
      state.user=user;await initializeWorkspace();authScreen(false);
    } catch(error) {
      if(error.status!==401)throw error;
      state.user=null;authScreen(true);
    }
    authConnection(true,'Backend connected.');
  } catch(error) {authConnection(false,deploymentError(error));}
  finally {state.authBusy=false;$('#auth-submit').disabled=!state.backendReady;$('#auth-retry').disabled=false;}
}

async function fetchProviders() {
  const response=await api('/api/v1/providers');
  state.providers=response.providers;
  $('#connection-count').textContent=state.providers.filter(x=>x.connected).length;
  renderPicker();renderConnections();renderChips();
}
function renderConnections() {
  const grid=$('#connection-grid');grid.replaceChildren();
  const icons={openai:'◎',gemini:'✧',anthropic:'✳',deepseek:'◉',grok:'✕',brave:'⌕'};
  for(const p of state.providers.filter(p=>!p.id.startsWith('custom-'))) {
    const card=html('article','connection-card');
    const row=html('div','connection-top');
    row.append(html('div','provider-icon',icons[p.id]||'◈'));
    const info=html('div');info.append(html('h3','',p.label),html('p','',p.category==='search'?'Public web search API':'AI model provider'));
    const status=html('span',`pill ${p.connected?(p.verified?'connected':'unverified'):''}`,p.connected?(p.verified?'Verified':'Saved · not tested'):'Not connected');
    row.append(info,status);card.append(row);
    card.append(html('div','provider-model',p.category==='search'?'Search API':`Model: ${p.model}`));
    const buttons=html('div','connection-buttons');
    const connect=html('button','',p.connected?'Update key':'Connect API key');connect.addEventListener('click',()=>openCredential(p.id));buttons.append(connect);
    if(p.connected) {
      const test=html('button','','Test connection');test.addEventListener('click',async()=>{
        test.disabled=true;test.textContent='Testing…';
        try {await api(`/api/v1/providers/${p.id}/test`,{method:'POST'});toast(`${p.label} connection verified.`);await fetchProviders();}
        catch(error){toast(`Test failed: ${error.message}`);test.textContent='Test connection';}
        finally{test.disabled=false;}
      });
      const remove=html('button','danger','Disconnect');remove.addEventListener('click',async()=>{
        if(!confirm(`Remove your saved ${p.label} API key?`)) return;
        try {await api(`/api/v1/providers/${p.id}/credential`,{method:'DELETE'});state.models.delete(p.id);toast(`${p.label} disconnected.`);await fetchProviders();}
        catch(error){toast(error.message);}
      });
      buttons.append(test,remove);
    }
    card.append(buttons);grid.append(card);
  }
}
function openCredential(providerId) {
  const p=state.providers.find(x=>x.id===providerId);
  if(!p)return;
  state.credentialProvider=providerId;
  $('#credential-title').textContent=`Connect ${p.label}`;
  $('#credential-info').textContent=p.connected?'Saving a new key replaces the previous one and resets verification status.':'Use an official API key from this provider. API usage may have separate charges.';
  $('#credential-key').value=p.id==='ollama'?'local-ollama':'';$('#credential-key').required=p.id!=='ollama';$('#credential-key').readOnly=p.id==='ollama';$('#credential-model').value=p.model||'';
  $('#model-field').classList.toggle('hidden',p.category==='search');
  $('#credential-error').textContent='';
  $('#credential-modal').classList.remove('hidden');$('#credential-key').focus();
}
function closeCredential(){state.credentialProvider=null;$('#credential-key').value='';$('#credential-modal').classList.add('hidden');}
$('#close-credential').addEventListener('click',closeCredential);
$('#credential-modal').addEventListener('click',e=>{if(e.target===$('#credential-modal'))closeCredential();});
$('#credential-form').addEventListener('submit',async e=>{
  e.preventDefault();$('#credential-error').textContent='';
  const p=state.credentialProvider;
  const button=$('#credential-form button[type=submit]');button.disabled=true;
  try {
    await api(`/api/v1/providers/${p}/credential`,{method:'PUT',body:{key:$('#credential-key').value,model:$('#credential-model').value||null}});
    closeCredential();toast('Key encrypted and saved. Use Test connection to verify access.');await fetchProviders();
  }catch(error){$('#credential-error').textContent=error.message;}
  finally{button.disabled=false;}
});

function renderPicker() {
  const picker=$('#model-picker');picker.replaceChildren();
  const connected=state.providers.filter(x=>x.category==='ai');
  for(const p of connected) {
    const row=html('label','picker-row');
    const text=html('span','',p.label);text.append(html('small','',p.connected?`${p.model} · ${p.verified?'verified':'not tested'}`:'Not connected (connect first)'));
    const check=html('input');check.type='checkbox';check.checked=state.models.has(p.id);check.disabled=!p.connected;
    check.addEventListener('change',()=>{if(check.checked)state.models.add(p.id);else state.models.delete(p.id);renderChips();});
    row.append(text,check);picker.append(row);
  }
  $('#picker-search').checked=state.search;
}
function renderChips() {
  const chips=$('#selection-chips');chips.replaceChildren();
  for(const id of state.models) {
    const provider=state.providers.find(x=>x.id===id);
    if(provider?.connected) chips.append(html('span','selection-chip',provider.label));
  }
  if(state.search||$('#mode').value==='ultimate')chips.append(html('span','selection-chip','Multi-source search'));
  $('#search-state').textContent=state.search?'On':'Off';
  $('#search-toggle').classList.toggle('enabled',state.search);
  const count=[...state.models].filter(id=>state.providers.some(p=>p.id===id&&p.connected)).length;
  $('#model-summary').textContent=$('#mode').value==='auto'?'Smart routing':count?`${count} selected model${count!==1?'s':''}`:'Choose a model';
}
function closePlus(){$('#plus-panel').classList.add('hidden');}
$('#plus-button').addEventListener('click',()=>{$('#plus-panel').classList.toggle('hidden');renderPicker();});
$('#close-plus').addEventListener('click',closePlus);
$('#apply-selection').addEventListener('click',()=>{state.search=$('#picker-search').checked;renderChips();closePlus();});
$('#clear-selection').addEventListener('click',()=>{state.models.clear();state.search=false;renderPicker();renderChips();});
$('#search-toggle').addEventListener('click',()=>{state.search=!state.search;renderChips();});
$('#mode').addEventListener('change',()=>{renderChips();toast($('#mode').value==='ultimate'?'Ultimate Brain uses up to three models automatically (or your manual selection) and may increase API costs.':'Model selection mode changed.');});

async function fetchConversations() {
  const {conversations}=await api('/api/v1/conversations');
  state.conversations=conversations;
  const list=$('#chat-list');list.replaceChildren();
  if(!conversations.length) list.append(html('p','muted-small','Start your first conversation.'));
  for(const conv of conversations) {
    const button=html('button',`chat-list-item ${state.conversationId===conv.id?'active':''}`,`◌   ${conv.title}`);
    button.title=conv.title;button.addEventListener('click',()=>openConversation(conv.id));list.append(button);
  }
}
function newChat() {
  if(state.busy){toast('Finish or stop the current run first.');return;}
  state.conversationId=null;$('#chat-title').textContent='Your AI workspace';$('#thread').replaceChildren();$('#thread').append(createWelcome());
  $('#prompt').value='';updateSend();$('#view-chat').classList.add('is-welcome');fetchConversations().catch(()=>{});showView('chat');
}
function createWelcome() {
  // Move original welcome node if available; the source is retained as a template.
  return $('#welcome-template')?.content?.firstElementChild?.cloneNode(true) || makeWelcome();
}
function makeWelcome() {
  const template = document.createElement('template');
  template.innerHTML = `<div id="welcome" class="welcome">
    <div class="hero-kicker"><span class="kicker-line"></span> THE POWER OF MULTIPLE MINDS <span class="kicker-line"></span></div>
    <div class="hero-mark"><img src="/assets/celestial-emblem.svg" alt="" aria-hidden="true"></div>
    <div class="hero-subline">INTELLIGENCE, REIMAGINED</div>
    <h2>Think beyond<br><span>the ordinary.</span></h2>
    <p>Every great journey begins with a question. Explore ideas, research faster and build with your AI minds in one powerful workspace.</p>
    <div class="hero-divider"><span></span><b>✦</b><span></span></div>
    <div class="suggestions">
      <button class="suggestion" data-prompt="Explain machine learning in simple Hindi with examples."><span class="suggestion-icon">◈</span><span>Learn something new<small>Explain machine learning</small></span><span class="suggestion-arrow">↗</span></button>
      <button class="suggestion" data-prompt="Create a clear step-by-step plan to launch my small business."><span class="suggestion-icon">▦</span><span>Plan a project<small>Build a launch roadmap</small></span><span class="suggestion-arrow">↗</span></button>
      <button class="suggestion" data-prompt="Review my idea for an AI-powered study assistant and list trade-offs."><span class="suggestion-icon">✧</span><span>Explore an idea<small>Analyze a product concept</small></span><span class="suggestion-arrow">↗</span></button>
    </div>
  </div>`;
  return template.content.firstElementChild;
}

async function openConversation(cid) {
  if(state.busy){toast('Stop the current run first.');return;}
  try {
    const {conversation,messages}=await api(`/api/v1/conversations/${cid}`);
    state.conversationId=cid;$('#chat-title').textContent=conversation.title;$('#view-chat').classList.remove('is-welcome');
    const thread=$('#thread');thread.replaceChildren();
    for(const msg of messages)addMessage(msg.role,msg.content,msg.meta);
    await fetchConversations();showView('chat');scrollThread();
  }catch(error){toast(error.message);}
}
function addMessage(role,content='',meta={}) {
  const thread=$('#thread');
  $('#welcome')?.remove();
  $('#view-chat').classList.remove('is-welcome');
  const item=html('article',`msg ${role}`);
  item.append(html('div','msg-avatar',role==='assistant'?'✳':'◈'));
  const body=html('div','msg-body');body.append(html('div','msg-label',role==='assistant'?'OMNIBRAIN AI':'You'));
  const text=html('div','msg-text',content);body.append(text);
  const metaEl=html('div','msg-meta');body.append(metaEl);
  item.append(body);thread.append(item);
  if(meta) renderMessageMeta(body,meta);
  scrollThread();return {item,text,body};
}
function renderMessageMeta(body,meta={}) {
  body.querySelector('.source-items')?.remove();
  const metaEl=body.querySelector('.msg-meta');
  metaEl.textContent='';
  if(meta.providers?.length)metaEl.textContent=`Models: ${meta.providers.join(', ')}`;
  if(meta.synthesisWarning)metaEl.textContent+=' · '+meta.synthesisWarning;
  if(meta.failures?.length)metaEl.textContent+=` · ${meta.failures.length} provider(s) failed`;
  if(meta.searchWarnings?.length)metaEl.textContent+=' · '+meta.searchWarnings.join('; ');
  if(meta.sources?.length) {
    const links=html('div','source-items');links.append(html('div','source-title','Retrieved sources'));
    for(const s of meta.sources) {
      try {
        const target=new URL(s.url);
        if(!['http:','https:'].includes(target.protocol))continue;
        const link=html('a','',s.title||target.host);link.href=target.href;link.target='_blank';link.rel='noopener noreferrer';links.append(link);
      }catch{}
    }
    body.append(links);
  }
}
function scrollThread() {
  const scroller=$('#thread-area');requestAnimationFrame(()=>{scroller.scrollTop=scroller.scrollHeight;});
}
function showView(view) {
  state.view=view;closePlus();closeSidebar();
  $$('.view').forEach(v=>v.classList.toggle('hidden',v.id!==`view-${view}`));
  $$('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  $('#view-heading').textContent=({chat:'AI Chat',connections:'Connections',usage:'Activity & usage',settings:'Settings',studio:'Creation Studio',agents:'AI Agent Studio',automation:'Automation Studio',knowledge:'Knowledge Base',artifacts:'Artifacts',mail:'Gmail Assistant'})[view];
  if(view==='usage')fetchUsage();
  if(view==='connections')fetchProviders().catch(e=>toast(e.message));
  if(['connections','studio','agents','automation','knowledge','artifacts','mail'].includes(view))refreshWorkspace().catch(e=>toast(e.message));
}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>{showView(b.dataset.view);if(b.dataset.mode){$('#mode').value=b.dataset.mode;renderChips();}else if(b.dataset.view==='chat'&&$('#mode').value==='research'){$('#mode').value='auto';renderChips();}if(b.dataset.kind){$('#studio-kind').value=b.dataset.kind;updateStudio();}else if(b.dataset.view==='studio'){$('#studio-kind').value='site';updateStudio();}if(b.dataset.add)$('#link-form').scrollIntoView();}));
function closeSidebar() {
  $('#sidebar').classList.remove('open');
  $('#sidebar-backdrop').classList.remove('open');
  $('#menu-button').setAttribute('aria-expanded','false');
}
$('#sidebar-backdrop').addEventListener('click',closeSidebar);
$('#menu-button').addEventListener('click',()=>{
  const open = !$('#sidebar').classList.contains('open');
  $('#sidebar').classList.toggle('open',open);
  $('#sidebar-backdrop').classList.toggle('open',open);
  $('#menu-button').setAttribute('aria-expanded',String(open));
});
$('#new-chat').addEventListener('click',newChat);
$('#refresh-chats').addEventListener('click',()=>fetchConversations().catch(e=>toast(e.message)));
$('#user-avatar').addEventListener('click',()=>showView('settings'));
$('#logout').addEventListener('click',async()=>{
  try{await api('/api/v1/auth/logout',{method:'POST'});location.reload();}catch(error){toast(error.message);}
});
$('#theme-select').addEventListener('change',e=>setTheme(e.target.value));
$('#export-chat').addEventListener('click',async()=>{
  if(!state.conversationId)return toast('Open or create a conversation first.');
  try {
    const data=await api(`/api/v1/conversations/${state.conversationId}`);
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`omnibrain-chat-${state.conversationId.slice(0,8)}.json`;link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }catch(error){toast(error.message);}
});
async function fetchUsage() {
  try {
    const {summary,recent}=await api('/api/v1/usage');
    const stats=[['Total API calls',summary.calls],['Successful',summary.successful],['Input tokens',summary.input_tokens],['Output tokens',summary.output_tokens]];
    const grid=$('#stat-grid');grid.replaceChildren();
    for(const [title,value] of stats) {
      const card=html('div','stat');card.append(html('div','stat-label',title),html('div','stat-number',(value||0).toLocaleString()));grid.append(card);
    }
    const rows=$('#usage-rows');rows.replaceChildren();
    if(!recent.length) {const row=html('tr');const cell=html('td','','No API requests yet.');cell.colSpan=6;row.append(cell);rows.append(row);}
    for(const entry of recent) {
      const row=html('tr');
      for(const value of [entry.provider,entry.model,entry.tokens_in??'—',entry.tokens_out??'—',entry.status,new Date(entry.created_at).toLocaleString()])row.append(html('td','',value));
      rows.append(row);
    }
  }catch(error){toast(error.message);}
}
function updateSend() {$('#send-button').disabled=state.busy||!$('#prompt').value.trim();}
$('#prompt').addEventListener('input',updateSend);
$('#prompt').addEventListener('keydown',event=>{
  if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing && window.matchMedia('(min-width: 701px)').matches){event.preventDefault();sendMessage();}
});
$('#send-button').addEventListener('click',sendMessage);
$('#stop-button').addEventListener('click',async()=>{
  if(state.runId)api(`/api/v1/runs/${state.runId}/cancel`,{method:'POST'}).catch(()=>{});
  state.controller?.abort();$('#run-status').textContent='Request cancelled.';
});

async function sendMessage() {
  const prompt=$('#prompt').value.trim();
  if(state.busy||!prompt)return;
  const creation=prompt.match(/^\/(website|image|video)\s+([\s\S]+)/i);
  if(creation){showView('studio');const f=$('#studio-form');f.elements.kind.value=creation[1].toLowerCase()==='website'?'site':creation[1].toLowerCase();f.elements.prompt.value=creation[2];currentSite=null;updateStudio();$('#prompt').value='';updateSend();f.requestSubmit();return;}
  const address=prompt.match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  if(address&&/\b(send|email|mail|gmail|bh[ae]j|bhej)\b/i.test(prompt)){showView('mail');const f=$('#mail-form');f.elements.to.value=address;f.elements.prompt.value=prompt;f.elements.subject.value='';f.elements.body.value='';$('#prompt').value='';updateSend();f.requestSubmit();return;}
  const mode=$('#mode').value;
  const selected=[...state.models].filter(id=>state.providers.some(p=>p.id===id&&p.connected));
  if(mode==='manual'&&!selected.length)return toast('Choose a connected model using the + button.');
  if(mode==='ultimate'&&state.providers.filter(p=>p.category==='ai'&&p.connected).length<2)return toast('Ultimate Brain requires at least two connected AI providers.');
  if(!state.providers.some(p=>p.category==='ai'&&p.connected))return toast('Connect an AI provider in Connections first.');
  state.busy=true;state.controller=new AbortController();updateSend();
  $('#stop-button').classList.remove('hidden');$('#send-button').classList.add('hidden');
  $('#prompt').value='';renderChips();
  addMessage('user',prompt);const output=addMessage('assistant','');output.text.textContent='Connecting to selected providers…';
  $('#run-status').textContent='Preparing request…';
  let done=false, streamed=false;
  try {
    const payload={conversationId:state.conversationId,message:prompt,mode,providers:selected,search:state.search,knowledge:$('#picker-knowledge').checked};
    const response=window.OMNI_PROXY?await queuedFetch('/api/v1/chat/stream',payload,state.controller.signal):await fetch('/api/v1/chat/stream',{
      method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:state.controller.signal,
      body:JSON.stringify(payload)
    });
    if(!response.ok){let error={};try{error=await response.json();}catch{}throw new Error(error.error||`HTTP ${response.status}`);}
    if(!response.body)throw new Error('Streaming is unavailable in this browser.');
    const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';
    const processFrame=frame=>{
      const lines=frame.split(/\r?\n/);
      const event=lines.find(x=>x.startsWith('event:'))?.slice(6).trim();
      const raw=lines.filter(x=>x.startsWith('data:')).map(x=>x.slice(5).trimStart()).join('\n');
      if(!raw)return;
      let data;try{data=JSON.parse(raw);}catch{return;}
      if(event==='start'){state.runId=data.runId;state.conversationId=data.conversationId;}
      else if(event==='status'){$('#run-status').textContent=data.text;}
      else if(event==='delta'){if(!streamed){output.text.textContent='';streamed=true;}output.text.textContent+=data.text;scrollThread();}
      else if(event==='provider'&&data.state==='failed'){toast(`${data.provider}: ${data.error}`);}
      else if(event==='final'){done=true;output.text.textContent=data.answer;renderMessageMeta(output.body,data.meta);$('#run-status').textContent='Response completed.';scrollThread();}
      else if(event==='error'){throw new Error(data.message||'AI provider failed.');}
    };
    while(true){
      const {done:readDone,value}=await reader.read();if(readDone)break;
      buffer+=decoder.decode(value,{stream:true});
      let idx;
      while((idx=buffer.search(/\r?\n\r?\n/))>=0){
        const separator=buffer.slice(idx).match(/^\r?\n\r?\n/)[0];
        const frame=buffer.slice(0,idx);buffer=buffer.slice(idx+separator.length);processFrame(frame);
      }
    }
    if(!done)throw new Error('Connection ended before the response completed.');
  }catch(error){
    const message=error.name==='AbortError'?'Request stopped.':error.message;
    if(!streamed)output.text.textContent=`Unable to complete request: ${message}`;
    else output.text.textContent+=`\n\n[Incomplete response: ${message}]`;
    $('#run-status').textContent=message;
    toast(message);
  }finally{
    state.busy=false;state.controller=null;state.runId=null;
    $('#stop-button').classList.add('hidden');$('#send-button').classList.remove('hidden');updateSend();
    await fetchConversations().catch(()=>{});
  }
}

// Simple suggestions at initial startup; delegated clicks also work on welcome cards.
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-prompt]');
  if(button){$('#prompt').value=button.dataset.prompt;updateSend();$('#prompt').focus();}
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){closePlus();closeCredential();closeSidebar();}
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='n'){event.preventDefault();newChat();}
});
// Workspace tools. All provider calls and secrets remain on the authenticated server.
const ws=(p,body,method)=>api('/api/v1/workspace'+p,{method:method||(body?'POST':'GET'),body});
let wsData=null, currentSite=null, currentArtifact=null, currentVersions=[], refreshBusy=false;
const formData=f=>Object.fromEntries(new FormData(f));
function bindForm(selector,fn){const f=$(selector);f.addEventListener('submit',async e=>{e.preventDefault();const b=f.querySelector('button[type=submit],button:not([type])');if(b)b.disabled=true;try{await fn(formData(f),f);}catch(e){toast(e.message);}finally{if(b)b.disabled=false;}});}
function action(label,fn){const b=html('button','subtle-button',label);b.type='button';b.addEventListener('click',async()=>{b.disabled=true;try{await fn();}catch(e){toast(e.message);}finally{b.disabled=false;}});return b;}
function item(container,title,detail){const d=html('div','ws-item');d.append(html('strong','',title),html('p','muted',detail));const buttons=html('div','ws-actions');d.append(buttons);container.append(d);return {d,buttons};}
function deleteAction(x){return action('Remove',async()=>{if(confirm('Remove '+x.name+'?')){await ws('/item/'+x.id,undefined,'DELETE');await refreshWorkspace();await fetchProviders();}});}
function setEmpty(el,txt){el.replaceChildren();if(txt)el.append(html('p','muted',txt));}
async function refreshWorkspace(){if(refreshBusy)return;refreshBusy=true;try{const d=await ws('/overview');if(JSON.stringify(d)===JSON.stringify(wsData))return;wsData=d;
 const links=$('#custom-links');setEmpty(links,d.links.length?'':'No custom connections yet.');for(const x of d.links){const r=item(links,x.name,`${x.kind} · ${x.url}${x.hasSecret?' · encrypted API key':''}${x.verified?' · tested':' · saved'}`);if(x.kind==='bookmark'||x.kind==='website'){const a=html('a','subtle-button','Open website / sign in');a.href=x.url;a.target='_blank';a.rel='noopener noreferrer';r.buttons.append(a);}if(x.kind==='rest')r.buttons.append(action('Read API',async()=>{$('#service-result').textContent=(await ws('/rest/read',{id:x.id})).content;}));if(x.kind!=='bookmark')r.buttons.append(action('Test',async()=>{await ws('/link/test',{id:x.id});toast('Connection tested successfully.');await refreshWorkspace();await fetchProviders();}));r.buttons.append(deleteAction(x));}
 $('#gmail-status').textContent=d.gmail?'Gmail connected · send-only permission':d.oauthReady?'Ready to sign in using Google’s official consent screen.':'Google OAuth needs one-time setup in .env. See the setup guide.';
 $('#gmail-connect').classList.toggle('hidden',d.gmail);$('#gmail-disconnect').classList.toggle('hidden',!d.gmail);$('#mail-connection').textContent=d.gmail?'Gmail connected. Review each message before sending.':'Gmail is not connected. Go to Connections → Sign in with Google.';
 const agents=$('#agent-list'),sel=$('#agent-select');setEmpty(agents,d.agents.length?'':'Create an agent to get started.');const selected=sel.value;sel.replaceChildren();for(const x of d.agents){const o=html('option','',x.name);o.value=x.id;sel.append(o);const r=item(agents,x.name,x.instructions);r.buttons.append(action('Use',()=>{sel.value=x.id;$('#agent-run').scrollIntoView({behavior:'smooth'});}),deleteAction(x));}if(d.agents.some(a=>a.id===selected))sel.value=selected;
 const autom=$('#automation-list');setEmpty(autom,d.automations.length?'':'No automations yet.');for(const x of d.automations){const r=item(autom,x.name,`${x.steps.join(' → ')} · ${x.interval?`${x.enabled?'Every':'Paused ·'} ${x.interval} min`:'Manual'}${x.last?' · last: '+x.last.status:''}`);r.buttons.append(action('Run now',async()=>{const result=await ws('/automation/run',{id:x.id});toast('Workflow '+result.status);await refreshWorkspace();}));if(x.interval)r.buttons.append(action(x.enabled?'Pause':'Enable',async()=>{await ws('/automation/toggle',{id:x.id,enabled:!x.enabled});await refreshWorkspace();}));r.buttons.append(deleteAction(x));if(x.last){const details=html('details');details.append(html('summary','','Last output'),html('pre','ws-output',x.last.output));r.d.append(details);}}
 const services=$('#service-list');setEmpty(services,d.services.length?'':'No additional apps connected.');for(const x of d.services){const r=item(services,x.name,x.scope||'Token saved; test to verify');r.buttons.append(action('Read / test',async()=>{$('#service-result').textContent=JSON.stringify((await ws('/service/read',{kind:x.kind})).items,null,2);}),action('Disconnect locally',async()=>{if(confirm('Remove this connection locally? Revoke provider consent separately if needed.')){await ws('/service/disconnect',{kind:x.kind});await refreshWorkspace();}}));}
 const knowledge=$('#knowledge-list');setEmpty(knowledge,d.knowledge.length?'':'No documents yet.');for(const x of d.knowledge){const r=item(knowledge,x.name,x.length+' characters');r.buttons.append(action('View',async()=>{const z=await ws('/item/'+x.id);$('#knowledge-result').textContent=z.content;}),deleteAction(x));}
 const artifacts=$('#artifact-list');setEmpty(artifacts,d.artifacts.length?'':'No artifacts yet.');for(const x of d.artifacts){const r=item(artifacts,x.name,x.format.toUpperCase());r.buttons.append(action('Open',async()=>openArtifact(await ws('/item/'+x.id))),deleteAction(x));}
 const studio=$('#studio-list');setEmpty(studio,d.jobs.length||d.sites.length?'':'No creations yet.');for(const x of d.sites){const r=item(studio,x.name,'Website · HTML project');r.buttons.append(action('Open',async()=>showSite(await ws('/item/'+x.id))),deleteAction(x));}for(const x of d.jobs){const r=item(studio,x.name,`${x.type} · ${x.status}${x.error?' · '+x.error:''}`);if(x.status==='done'){const media=document.createElement(x.type==='image'?'img':'video');media.src='/api/v1/workspace/item/'+x.id;media.className='ws-media';if(x.type==='video')media.controls=true;else media.alt=x.name;r.d.append(media);const a=html('a','subtle-button','Download');a.href=media.src;a.download=x.id+(x.type==='image'?'.png':'.mp4');r.buttons.append(a);}if(!['running','queued'].includes(x.status))r.buttons.append(deleteAction(x));}
 }finally{refreshBusy=false;}}
function linkFields(){const k=$('#link-kind').value;$('#link-model-label').classList.toggle('hidden',k!=='ai');$('#link-key-label').classList.toggle('hidden',!['ai','search','rest'].includes(k));$('#link-query-label').classList.toggle('hidden',k!=='search');$('#link-hint').textContent={ai:'Use the complete official chat/completions URL, not a chatbot login page.',search:'GET endpoint returning results with title, url and description; the prompt is sent as a query parameter.',website:'Public page text will be included in research. Login-only pages are not scraped.',rest:'Read a fixed public HTTPS GET endpoint using an optional bearer token.',bookmark:'Opens the real site so you can sign in there. This does not grant API access.'}[k];}
$('#link-kind').addEventListener('change',linkFields);linkFields();
bindForm('#link-form',async(b,f)=>{if(!['ai','search','rest'].includes(b.kind))b.key='';await ws('/links',b);f.reset();linkFields();await refreshWorkspace();await fetchProviders();toast('Connection saved.');});
$('#gmail-connect').addEventListener('click',async()=>{try{const d=await ws('/gmail/start',{});location.assign(d.url);}catch(e){toast(e.message);}});$('#gmail-disconnect').addEventListener('click',async()=>{if(confirm('Revoke Gmail permission?'))try{await ws('/gmail/disconnect',{});await refreshWorkspace();}catch(e){toast(e.message);}});
const templates={research:['Deep researcher','Compare credible sources, cite real links, identify uncertainty.',true],study:['Study buddy','Explain in simple Hinglish, give examples and short practice questions.',false],code:['Code engineer','Write clear, maintainable code and tests; explain trade-offs.',false],writer:['Hinglish writer','Write natural, polished emails and messages in the user’s language.',false],business:['Business strategist','Analyze options, risks and practical next steps.',true]};
$('#agent-template').addEventListener('change',()=>{const t=templates[$('#agent-template').value];if(t){const f=$('#agent-form');f.elements.name.value=t[0];f.elements.instructions.value=t[1];f.elements.research.checked=t[2];}});
bindForm('#agent-form',async(b,f)=>{b.research=f.elements.research.checked;await ws('/agents',b);f.reset();await refreshWorkspace();toast('Agent created.');});
bindForm('#agent-run',async b=>{$('#agent-result').textContent='Agent running…';try{const r=await ws('/agent/run',b);$('#agent-result').textContent=r.answer+(r.sources.length?'\n\nSources:\n'+r.sources.map(x=>x.url).join('\n'):'');}catch(e){$('#agent-result').textContent=e.message;throw e;}});
function addStep(){if($('#step-list').children.length>=5)return toast('Maximum five steps per workflow.');const row=html('div','ws-step');const s=html('select');for(const [value,label] of [['search','Search connected sources'],['ai','Ask AI / summarize'],['site','Build website'],['draft','Draft email']]){const o=html('option','',label);o.value=value;s.append(o);}row.append(s,action('×',()=>{if($('#step-list').children.length>1)row.remove();}));$('#step-list').append(row);}
$('#add-step').addEventListener('click',addStep);addStep();$('#step-list select').value='ai';
bindForm('#automation-form',async(b,f)=>{b.steps=$$('#step-list select').map(s=>s.value);await ws('/automations',b);f.reset();$('#step-list').replaceChildren();addStep();$('#step-list select').value='ai';await refreshWorkspace();toast('Automation saved.');});
function updateStudio(){const site=$('#studio-kind').value==='site';$('#aspect-label').classList.toggle('hidden',site);$('#media-model-label').classList.toggle('hidden',site);$('#site-reset').classList.toggle('hidden',!site);}
$('#studio-kind').addEventListener('change',updateStudio);updateStudio();
function showSite(x){currentSite=x.id;currentVersions=x.versions||[];const vs=$('#site-versions');vs.replaceChildren(new Option('Version history',''));currentVersions.forEach((v,i)=>vs.add(new Option(new Date(v.at).toLocaleString(),i)));$('#studio-kind').value='site';updateStudio();$('#site-result').classList.remove('hidden');$('#site-source').value=x.html;$('#site-preview').src='/api/v1/workspace/preview/'+x.id+'?v='+Date.now();}
$('#site-save').addEventListener('click',async()=>{try{showSite(await ws('/site/save',{id:currentSite,html:$('#site-source').value}));toast('Code saved.');}catch(e){toast(e.message);}});
$('#site-code').addEventListener('click',()=>$('#site-source').classList.toggle('hidden'));$('#site-reset').addEventListener('click',()=>{currentSite=null;$('#site-result').classList.add('hidden');$('#studio-status').textContent='New project ready.';});
$('#site-download').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([$('#site-source').value],{type:'text/html'}));const a=html('a');a.href=url;a.download='omnibrain-website.html';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
bindForm('#studio-form',async b=>{$('#studio-status').textContent='Generating…';try{if(b.kind==='site'){showSite(await ws('/site',{prompt:b.prompt,id:currentSite}));$('#studio-status').textContent='Website ready. Preview, revise or download.';}else{await ws('/media',b);$('#studio-status').textContent='Job queued. Watch Your creations for progress.';}await refreshWorkspace();}catch(e){$('#studio-status').textContent=e.message;throw e;}});
bindForm('#mail-form',async(b,f)=>{$('#mail-result').textContent='Drafting…';try{const d=await ws('/gmail/draft',b);f.elements.subject.value=d.subject;f.elements.body.value=d.body;$('#mail-result').textContent='Draft ready. Edit and review before sending.';}catch(e){$('#mail-result').textContent=e.message;throw e;}});
$('#mail-send').addEventListener('click',async()=>{const b=formData($('#mail-form'));if(!b.to||!b.subject||!b.body)return toast('Recipient, subject and message are required.');if(!confirm(`Send this email from your connected Gmail?\nTo: ${b.to}\nSubject: ${b.subject}\n\n${b.body}`))return;const btn=$('#mail-send');btn.disabled=true;try{const r=await ws('/gmail/send',{...b,confirm:true});$('#mail-result').textContent='Sent successfully. Gmail message ID: '+r.messageId;}catch(e){$('#mail-result').textContent=e.message;toast(e.message);}finally{btn.disabled=false;}});
setInterval(()=>{if(state.user&&['studio','agents','automation'].includes(state.view)&&!document.hidden)refreshWorkspace().catch(()=>{});},7000);
$('#site-zip').addEventListener('click',()=>{if(currentSite)location.assign('/api/v1/workspace/site/zip/'+currentSite);});
$('#site-restore').addEventListener('click',async()=>{const v=$('#site-versions').value;if(v===''||!currentVersions[v])return toast('Choose a version.');$('#site-source').value=currentVersions[v].html;$('#site-save').click();});
for(const kind of ['drive','calendar'])$('#'+kind+'-connect').addEventListener('click',async()=>{try{location.assign((await ws('/gmail/start',{kind})).url);}catch(e){toast(e.message);}});
bindForm('#github-form',async(b,f)=>{await ws('/service/github',b);f.reset();await refreshWorkspace();toast('Token saved. Read / test to verify.');});
$('#knowledge-file').addEventListener('change',async e=>{const f=e.target.files[0];if(!f)return;if(f.size>500000)return toast('Maximum 500 KB text file.');const form=$('#knowledge-form');form.elements.name.value=f.name;form.elements.content.value=await f.text();});
bindForm('#knowledge-form',async(b,f)=>{await ws('/knowledge',b);f.reset();await refreshWorkspace();toast('Knowledge saved.');});
bindForm('#knowledge-search',async b=>{$('#knowledge-result').textContent=JSON.stringify((await ws('/knowledge/search',b)).results,null,2);});
function openArtifact(x){currentArtifact=x;$('#artifact-content').value=x.content;}
bindForm('#artifact-form',async b=>{openArtifact(await ws('/artifact/generate',b));await refreshWorkspace();});
$('#artifact-save').addEventListener('click',async()=>{if(!currentArtifact)return toast('Open or generate an artifact first.');try{await ws('/artifact/save',{id:currentArtifact.id,content:$('#artifact-content').value});toast('Saved.');}catch(e){toast(e.message);}});
$('#artifact-download').addEventListener('click',()=>{if(!currentArtifact)return toast('Open or generate an artifact first.');const a=html('a'),url=URL.createObjectURL(new Blob([$('#artifact-content').value],{type:'text/plain'}));a.href=url;a.download='artifact.'+currentArtifact.format;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
bindForm('#agent-plan',async b=>{const p=await ws('/agent/plan',b),f=$('#agent-form');f.elements.name.value=p.name;f.elements.instructions.value=p.instructions;f.elements.research.checked=p.research;toast('Review the suggested agent, then create it.');});
bindForm('#automation-plan',async b=>{const p=await ws('/automation/plan',b),f=$('#automation-form');f.elements.name.value=p.name;f.elements.prompt.value=p.prompt;f.elements.interval.value=p.interval;$('#step-list').replaceChildren();for(const step of p.steps.length?p.steps:['ai']){addStep();$('#step-list').lastElementChild.querySelector('select').value=step;}toast('Review the suggested workflow, then save it.');});
const motion=$('#reduce-motion');motion.checked=localStorage.getItem('omni-reduce-motion')==='true';document.documentElement.dataset.reduceMotion=motion.checked;motion.addEventListener('change',()=>{document.documentElement.dataset.reduceMotion=motion.checked;localStorage.setItem('omni-reduce-motion',motion.checked);});
init();
