import https from 'node:https';
import dns from 'node:dns/promises';
import net from 'node:net';
export function publicURL(value){
 const u=new URL(value); if(u.protocol!=='https:'||u.username||u.password||u.port||net.isIP(u.hostname.replace(/[\[\]]/g,''))||!u.hostname.includes('.')||u.hostname.endsWith('.local')||u.hostname.endsWith('.internal'))throw Error('Use a public HTTPS domain without credentials or a custom port.'); return u;
}
export function publicIPv4(ip){const [a,b,c]=ip.split('.').map(Number);return net.isIP(ip)===4&&!(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0||b===88&&c===99)||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19||b===51)||a===203&&b===0&&c===113);}
// IPv4-only, DNS pinned, no redirects, no ambient credentials.
export async function publicRequest(value,{method='GET',headers={},body,limit=1500000,signal}={}){
 const u=publicURL(value);const addresses=await dns.resolve4(u.hostname);if(!addresses.length||addresses.some(a=>!publicIPv4(a)))throw Error('Private or reserved network addresses are blocked.');
 return new Promise((resolve,reject)=>{const req=https.request(u,{method,headers,signal,agent:false,family:4,lookup:(host,opts,cb)=>opts.all?cb(null,[{address:addresses[0],family:4}]):cb(null,addresses[0],4)},res=>{if(res.statusCode<200||res.statusCode>=300){res.destroy();return reject(Error(`Remote HTTP ${res.statusCode}; redirects are not followed.`));}const chunks=[];let total=0;res.on('data',c=>{total+=c.length;if(total>limit)req.destroy(Error('Remote response too large.'));else chunks.push(c);});res.on('end',()=>resolve({buffer:Buffer.concat(chunks),type:res.headers['content-type']||''}));res.on('error',reject);});req.setTimeout(20000,()=>req.destroy(Error('Remote timeout.')));req.on('error',reject);req.end(body);});
}
export function cleanText(s){return String(s).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|quot|lt|gt);/g,' ').replace(/\s+/g,' ').trim();}
