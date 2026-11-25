import fs from 'node:fs/promises';
const raw=process.env.OMNI_BACKEND_URL;
if(!raw)throw Error('Set OMNI_BACKEND_URL to your persistent HTTPS backend before building for Netlify. For local use run npm start.');
const u=new URL(raw);if(u.protocol!=='https:'||u.username||u.password||u.pathname!=='/'||u.search||u.hash||u.port)throw Error('OMNI_BACKEND_URL must be an HTTPS origin, without paths or credentials.');
// Never publish a frontend with an unverified API destination. No user data is sent.
try {
  const health=await fetch(new URL('/api/health',u),{redirect:'error',signal:AbortSignal.timeout(20000),headers:{Accept:'application/json'}});
  const data=await health.json();
  if(!health.ok||data.ok!==true||data.service!=='OMNIBRAIN AI')throw Error('Unexpected health response.');
  const auth=await fetch(new URL('/api/v1/me',u),{redirect:'error',signal:AbortSignal.timeout(20000),headers:{Accept:'application/json'}});
  if(auth.status!==401||typeof (await auth.json()).error!=='string')throw Error('Account API unavailable.');
} catch(error) {throw Error(`Backend check failed at ${u.origin}. Deploy and start the Node API first, then retry the Netlify build. (${error.message})`);}
await fs.rm('dist',{recursive:true,force:true});await fs.cp('web','dist',{recursive:true});await fs.writeFile('dist/deployment.js','window.OMNI_PROXY=true;\n');
// Order matters: forward all API methods before serving any static fallback.
await fs.writeFile('dist/_redirects',`/api/* ${u.origin}/api/:splat 200!\n/* /index.html 200\n`);
console.log('Netlify static build ready in dist/. Verified backend: '+u.origin);
