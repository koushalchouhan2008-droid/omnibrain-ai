#!/usr/bin/env node
/** Starts the local OMNIBRAIN AI web server and opens the right local browser URL.
 * No external dependencies; does not host a public website.
 */
import { spawn } from 'node:child_process';
import net from 'node:net';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const versions = process.versions.node.split('.').map(Number);
if (!(versions[0] > 22 || (versions[0] === 22 && versions[1] >= 13))) {
  console.error(`\nERROR: Node.js ${process.version} is installed, but OMNIBRAIN AI needs Node.js v22.13.0 or later.`);
  console.error('Install the current Node.js LTS from https://nodejs.org/ and start again.\n');
  process.exit(1);
}
const host = '127.0.0.1';
const basePort = Number(process.env.PORT || 3000);
if (!Number.isInteger(basePort) || basePort < 1024 || basePort > 65525) {
  console.error('Invalid PORT. Use a number between 1024 and 65525.');
  process.exit(1);
}

async function respondsAsOmnibrain(port) {
  try {
    const response = await fetch(`http://${host}:${port}/api/health`, { signal: AbortSignal.timeout(500) });
    return response.ok && (await response.json()).service === 'OMNIBRAIN AI';
  } catch { return false; }
}
async function isFree(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen({ port, host, exclusive: true }, () => server.close(() => resolve(true)));
  });
}
async function choosePort() {
  if (await respondsAsOmnibrain(basePort)) return {port:basePort,alreadyRunning:true};
  for (let port=basePort; port<=basePort+9; port++) {
    if (await isFree(port)) return {port,alreadyRunning:false};
  }
  throw new Error(`Ports ${basePort}–${basePort+9} are unavailable. Close other programs or set a free PORT.`);
}
function openBrowser(url) {
  try {
    let command, args;
    if (process.platform === 'win32') {
      command = 'cmd.exe'; args = ['/d','/s','/c',`start "" "${url}"`];
    } else if (process.platform === 'darwin') {
      command = 'open'; args = [url];
    } else {
      command = 'xdg-open'; args = [url];
    }
    const browser = spawn(command,args,{ detached:true, stdio:'ignore', windowsHide:true });
    browser.on('error',()=>console.log('Automatic browser opening unavailable. Copy the URL above into your browser.'));
    browser.unref();
  } catch { console.log('Open the URL in your browser manually.'); }
}
let child;
function shutdown() {
  if (child && !child.killed) child.kill('SIGINT');
  else process.exit(0);
}
process.on('SIGINT',shutdown);
process.on('SIGTERM',shutdown);

try {
  const {port,alreadyRunning}=await choosePort();
  const url=`http://${host}:${port}`;
  if (alreadyRunning) {
    console.log(`\nOMNIBRAIN AI is already running at ${url}`);
    openBrowser(url);
  } else {
    if (port!==basePort) console.log(`Port ${basePort} was busy. Using ${port} instead.`);
    console.log(`\nStarting OMNIBRAIN AI…`);
    child=spawn(process.execPath,['server/index.js'],{
      cwd:root,
      env:{...process.env, PORT:String(port), HOST:host},
      stdio:'inherit',
    });
    let exitCode=null;
    child.on('error',error=>{ console.error(`Server failed to start: ${error.message}`); exitCode=1; });
    child.on('exit',code=>{ exitCode=code ?? 1; });
    let ready=false;
    for(let attempts=0;attempts<50;attempts++) {
      if (exitCode!==null) break;
      if (await respondsAsOmnibrain(port)) {ready=true;break;}
      await new Promise(r=>setTimeout(r,160));
    }
    if (!ready) {
      console.error('\nERROR: The application could not start. Read the message above.');
      console.error('Check Node.js version, folder permissions and antivirus. You can send this error screenshot for help.');
      if (exitCode===null) shutdown();
      process.exitCode=1;
    } else {
      console.log(`\nSUCCESS! Open in the SAME COMPUTER browser: ${url}`);
      console.log('This is a local web app, not a public internet URL.');
      console.log('Keep this window open while using the app; press Ctrl+C to stop.\n');
      openBrowser(url);
      await new Promise(resolve=>child.once('exit',resolve));
    }
  }
} catch(error) {
  console.error(`Startup error: ${error.message}`);
  process.exitCode=1;
}
