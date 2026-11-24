import { getConfig } from './config.js';
import { openDatabase, createStore } from './database.js';
import { createApp } from './app.js';

const config=getConfig();
const store=createStore(openDatabase(config.dbDir));
const {server,runs}=createApp({config,store});
server.listen(config.port,config.host,()=>{
  console.log(`OMNIBRAIN AI running at http://${config.host}:${config.port}`);
  if(!config.production) console.log('Development mode: encrypted credentials are stored in the local data/ directory.');
});

function close() {
  for (const run of runs.values()) run.controller.abort();
  server.close(()=>{store.close();process.exit(0);});
  setTimeout(()=>process.exit(1),5000).unref();
}
process.on('SIGINT',close);
process.on('SIGTERM',close);
