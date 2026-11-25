import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the actual auth controller and API helper with a minimal DOM and mocked network.
// This is a frontend logic regression test, not a browser rendering test.
function authFixture(){
  const nodes=new Map();
  const get=id=>{if(!nodes.has(id))nodes.set(id,{value:'',textContent:'',disabled:false,events:{},classList:{toggle() {},add(){}},addEventListener(type,fn){this.events[type]=fn;}});return nodes.get(id);};
  const calls=[];let health=404, signedIn=false;
  const context=vm.createContext({document:{querySelector:get},window:{OMNI_PROXY:false},AbortSignal,Response,fetch:async(url,options)=>{calls.push({url,method:options.method});if(url==='/api/health')return health===200?Response.json({ok:true,service:'OMNIBRAIN AI'}):new Response('<html>not found</html>',{status:health});if(url==='/api/v1/me')return signedIn?Response.json({user:{id:'u1',name:'Test'}}):Response.json({error:'Sign in'},{status:401});if(url==='/api/v1/auth/register'){signedIn=true;return Response.json({user:{id:'u1',name:'Test'}},{status:201});}throw Error('Unexpected URL '+url);}});
  const src=fs.readFileSync('web/app.js','utf8');
  const api=src.slice(0,src.indexOf('async function queuedFetch'));
  const auth=src.slice(src.indexOf('function authScreen('),src.indexOf('async function initializeWorkspace()'));
  const init=src.slice(src.indexOf('async function init()'),src.indexOf('async function fetchProviders()'));
  vm.runInContext(api+auth+'async function initializeWorkspace(){}\n'+init,context);
  return {get,calls,run:code=>vm.runInContext(code,context),connect:()=>{health=200;}};
}
test('auth UI blocks signup on missing backend, allows retry, verifies session after registration',async()=>{
  const f=authFixture();await f.run('init()');assert.equal(f.get('#auth-submit').disabled,true);assert.match(f.get('#auth-status').textContent,/API route not found/);
  await f.get('#auth-form').events.submit({preventDefault(){}});assert.equal(f.calls.filter(c=>c.method==='POST').length,0);
  f.connect();await f.run('init()');assert.equal(f.get('#auth-submit').disabled,false);assert.equal(f.get('#auth-status').textContent,'Backend connected.');
  f.run("chooseAuth('register')");f.get('#auth-email').value='test@example.com';f.get('#auth-password').value='test-password-1234';f.get('#auth-name').value='Test';await f.get('#auth-form').events.submit({preventDefault(){}});
  assert.equal(f.get('#auth-error').textContent,'');assert.equal(f.get('#auth-password').value,'');assert.equal(f.run('state.user.id'),'u1');assert.deepEqual(f.calls.slice(-3).map(c=>c.url),['/api/health','/api/v1/auth/register','/api/v1/me']);
});
