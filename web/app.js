const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const state = {
  user:null, providers:[], conversations:[], conversationId:null,
  models:new Set(), search:false, view:'chat', busy:false, runId:null,
  controller:null, authMode:'login', credentialProvider:null,
};

function html(tag,cls,text) {
  const el=document.createElement(tag);
  if(cls) el.className=cls;
  if(text!==undefined) el.textContent=String(text);
  return el;
}
async function api(path,options={}) {
  const method=options.method||'GET';
  const response=await fetch(path,{method,credentials:'same-origin',headers:options.body?{'Content-Type':'application/json'}:{},body:options.body?JSON.stringify(options.body):undefined});
  let result={};
  try {result=await response.json();} catch {}
  if(!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
  return result;
}
let toastTimer;
function toast(message) {
  const element=$('#toast');element.textContent=message;element.classList.remove('hidden');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>element.classList.add('hidden'),4500);
}
function setTheme(theme) {
  const selected=theme==='light'?'light':'dark';
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
$('#auth-form').addEventListener('submit',async(event)=>{
  event.preventDefault();
  const button=$('#auth-submit');button.disabled=true;$('#auth-error').textContent='';
  const body={email:$('#auth-email').value,password:$('#auth-password').value};
  if(state.authMode==='register') body.name=$('#auth-name').value;
  try {
    const response=await api(`/api/v1/auth/${state.authMode==='register'?'register':'login'}`,{method:'POST',body});
    state.user=response.user;authScreen(false);$('#auth-password').value='';
    await initializeWorkspace();
  } catch(error) {$('#auth-error').textContent=error.message;}
  finally {button.disabled=false;}
});
async function initializeWorkspace() {
  $('#user-avatar').textContent=(state.user.name||'U').slice(0,1).toUpperCase();
  $('#account-name').textContent=state.user.name;
  $('#account-email').textContent=state.user.email;
  await Promise.all([fetchProviders(),fetchConversations()]);
  showView('chat');
}
async function init() {
  try {
    const {user}=await api('/api/v1/me');state.user=user;
    authScreen(false);await initializeWorkspace();
  } catch {chooseAuth('login');authScreen(true);}
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
  for(const p of state.providers) {
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
  $('#credential-key').value='';$('#credential-model').value=p.model||'';
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
  if(state.search)chips.append(html('span','selection-chip','Brave search'));
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
$('#mode').addEventListener('change',()=>{renderChips();toast($('#mode').value==='ultimate'?'Ultimate Brain uses two or more connected models and may increase API costs.':'Model selection mode changed.');});

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
  $('#view-heading').textContent=({chat:'AI Chat',connections:'Connections',usage:'Activity & usage',settings:'Settings'})[view];
  if(view==='usage')fetchUsage();
  if(view==='connections')fetchProviders().catch(e=>toast(e.message));
}
$$('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
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
  const mode=$('#mode').value;
  const selected=[...state.models].filter(id=>state.providers.some(p=>p.id===id&&p.connected));
  if(mode==='manual'&&!selected.length)return toast('Choose a connected model using the + button.');
  if(mode==='ultimate'&&state.providers.filter(p=>p.category==='ai'&&p.connected).length<2)return toast('Ultimate Brain requires at least two connected AI providers.');
  if(!state.providers.some(p=>p.category==='ai'&&p.connected))return toast('Connect an AI provider in Connections first.');
  if(state.search&&!state.providers.some(p=>p.id==='brave'&&p.connected))return toast('Connect Brave Search to use web research.');
  state.busy=true;state.controller=new AbortController();updateSend();
  $('#stop-button').classList.remove('hidden');$('#send-button').classList.add('hidden');
  $('#prompt').value='';renderChips();
  addMessage('user',prompt);const output=addMessage('assistant','');output.text.textContent='Connecting to selected providers…';
  $('#run-status').textContent='Preparing request…';
  let done=false, streamed=false;
  try {
    const response=await fetch('/api/v1/chat/stream',{
      method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:state.controller.signal,
      body:JSON.stringify({conversationId:state.conversationId,message:prompt,mode,providers:selected,search:state.search})
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
init();
