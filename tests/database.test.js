import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {openDatabase,createStore} from '../server/database.js';

test('sqlite persists conversations and isolates users',()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'omnibrain-db-'));
  let store=createStore(openDatabase(temp));
  try {
    const userA=store.createUser('a@test.com','Alex','hash-a');
    const userB=store.createUser('b@test.com','Bela','hash-b');
    const chat=store.createConversation(userA.id,'Hello');
    store.addMessage(chat.id,'user','hello');
    store.addMessage(chat.id,'assistant','world',{providers:['openai']});
    assert.equal(store.conversations(userA.id).length,1);
    assert.equal(store.conversations(userB.id).length,0);
    assert.equal(store.conversation(userB.id,chat.id),undefined);
    assert.deepEqual(store.messages(chat.id).map(x=>x.content),['hello','world']);
    store.saveCredential(userA.id,'openai','encrypted-value','gpt-4.1-mini');
    assert.equal(store.credentials(userB.id).length,0);
    store.usage(userA.id,'openai','gpt-4.1-mini',100,200,'success',500);
    assert.equal(store.usageSummary(userA.id).calls,1);
    assert.equal(store.usageSummary(userA.id).output_tokens,200);
    store.close();
    store=createStore(openDatabase(temp));
    assert.equal(store.messages(chat.id).length,2);
    assert.equal(store.credential(userA.id,'openai').encrypted_key,'encrypted-value');
    store.deleteConversation(userA.id,chat.id);
    assert.equal(store.messages(chat.id).length,0);
  } finally {store.close();fs.rmSync(temp,{force:true,recursive:true});}
});
