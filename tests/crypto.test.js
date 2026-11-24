import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {hashPassword,verifyPassword,encrypt,decrypt,hashToken} from '../server/crypto.js';

test('passwords are salted, verified and never stored plaintext',()=>{
  const a=hashPassword('a long secret password!');
  const b=hashPassword('a long secret password!');
  assert.notEqual(a,b);
  assert.equal(verifyPassword('a long secret password!',a),true);
  assert.equal(verifyPassword('incorrect password',a),false);
  assert.equal(verifyPassword('something','invalid'),false);
  assert.ok(!a.includes('long secret'));
});

test('secrets are encrypted with AES-256-GCM and reject tampering',()=>{
  const key=randomBytes(32),text='sk-super-secret-123';
  const sealed=encrypt(text,key);
  assert.ok(!sealed.includes(text));
  assert.equal(decrypt(sealed,key),text);
  const damaged=Buffer.from(sealed,'base64');damaged[damaged.length-1]^=0x10;
  assert.throws(()=>decrypt(damaged.toString('base64'),key));
});

test('session token hashes do not expose original token',()=>{
  assert.equal(hashToken('abc').length,64);
  assert.notEqual(hashToken('abc'),'abc');
});
