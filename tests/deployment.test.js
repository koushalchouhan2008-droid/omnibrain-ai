import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

test('Netlify build refuses missing/unreachable or non-API backends and writes API-first proxy for valid backend',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'omni-build-'));
  try{
    await fs.cp('web',path.join(dir,'web'),{recursive:true});
    const script=path.resolve('scripts/build.js');
    const env={...process.env};delete env.OMNI_BACKEND_URL;
    const run=(mock,backend)=>spawnSync(process.execPath,[...(mock?['--import','data:text/javascript,'+encodeURIComponent(mock)]:[]),script],{cwd:dir,env:{...env,...(backend?{OMNI_BACKEND_URL:backend}:{})},encoding:'utf8'});
    assert.notEqual(run(null,null).status,0);
    assert.notEqual(run(null,'http://backend.example').status,0);
    assert.notEqual(run(`globalThis.fetch=async()=>new Response('<html>not an API</html>')`,'https://backend.example').status,0);
    assert.notEqual(run(`globalThis.fetch=async()=>Response.json({ok:true,service:'OMNIBRAIN AI'})`,'https://backend.example').status,0);
    const result=run(`globalThis.fetch=async(u)=>new URL(u).pathname==='/api/health'?Response.json({ok:true,service:'OMNIBRAIN AI'}):Response.json({error:'Sign in'},{status:401})`,'https://backend.example');
    assert.equal(result.status,0,result.stderr);
    assert.equal(await fs.readFile(path.join(dir,'dist/_redirects'),'utf8'),'/api/* https://backend.example/api/:splat 200!\n/* /index.html 200\n');
    assert.match(await fs.readFile(path.join(dir,'dist/deployment.js'),'utf8'),/OMNI_PROXY=true/);
  }finally{await fs.rm(dir,{recursive:true,force:true});}
});
