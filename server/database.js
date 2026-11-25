import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { id, now, hashToken } from './crypto.js';

export function openDatabase(dbDir) {
  const db = new DatabaseSync(path.join(dbDir, 'omnibrain.sqlite'));
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
      password_hash TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
    CREATE TABLE IF NOT EXISTS credentials (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL, encrypted_key TEXT NOT NULL,
      model TEXT, verified_at TEXT, created_at TEXT NOT NULL,
      PRIMARY KEY(user_id, provider)
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, updated_at DESC);
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user','assistant')),
      content TEXT NOT NULL, meta TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_messages_convo ON messages(conversation_id, created_at);
    CREATE TABLE IF NOT EXISTS usage (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL, model TEXT NOT NULL, tokens_in INTEGER,
      tokens_out INTEGER, status TEXT NOT NULL, elapsed_ms INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_usage_user ON usage(user_id, created_at);
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY, user_id TEXT, event TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
    );
  `);
  return db;
}

export function createStore(db) {
  const get = (sql, ...args) => db.prepare(sql).get(...args);
  const all = (sql, ...args) => db.prepare(sql).all(...args);
  const run = (sql, ...args) => db.prepare(sql).run(...args);
  return {
    db,
    close: () => db.close(),
    createUser(email, name, passwordHash) {
      const uid = id();
      run('INSERT INTO users (id,email,name,password_hash,created_at) VALUES (?,?,?,?,?)', uid, email, name, passwordHash, now());
      return { id: uid, email, name };
    },
    findUserByEmail: email => get('SELECT * FROM users WHERE email=?', email),
    findUser: uid => get('SELECT id,email,name,created_at FROM users WHERE id=?', uid),
    createSession(uid, token, expires) {
      run('INSERT INTO sessions VALUES (?,?,?,?)', hashToken(token), uid, expires, now());
    },
    sessionUser(token) {
      if (!token) return undefined;
      return get('SELECT users.id,users.email,users.name FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?', hashToken(token), now());
    },
    deleteSession: token => run('DELETE FROM sessions WHERE token_hash=?', hashToken(token)),
    saveCredential(uid, provider, encryptedKey, model) {
      run(`INSERT INTO credentials(user_id,provider,encrypted_key,model,created_at) VALUES (?,?,?,?,?)
        ON CONFLICT(user_id,provider) DO UPDATE SET encrypted_key=excluded.encrypted_key, model=excluded.model, verified_at=NULL, created_at=excluded.created_at`, uid, provider, encryptedKey, model || null, now());
    },
    credential: (uid, provider) => get('SELECT * FROM credentials WHERE user_id=? AND provider=?', uid, provider),
    credentials: uid => all('SELECT provider,model,verified_at,created_at FROM credentials WHERE user_id=? ORDER BY provider', uid),
    verifyCredential: (uid, provider) => run('UPDATE credentials SET verified_at=? WHERE user_id=? AND provider=?', now(), uid, provider),
    removeCredential: (uid, provider) => run('DELETE FROM credentials WHERE user_id=? AND provider=?', uid, provider),
    createConversation(uid, title = 'New chat') {
      const cid = id(), timestamp = now();
      run('INSERT INTO conversations VALUES(?,?,?,?,?)', cid, uid, title, timestamp, timestamp);
      return { id: cid, title, created_at: timestamp, updated_at: timestamp };
    },
    conversations: uid => all('SELECT id,title,created_at,updated_at FROM conversations WHERE user_id=? ORDER BY updated_at DESC LIMIT 100', uid),
    conversation: (uid, cid) => get('SELECT * FROM conversations WHERE id=? AND user_id=?', cid, uid),
    deleteConversation: (uid, cid) => run('DELETE FROM conversations WHERE user_id=? AND id=?', uid, cid),
    messages: cid => all('SELECT id,role,content,meta,created_at FROM messages WHERE conversation_id=? ORDER BY created_at,rowid LIMIT 200', cid).map(x => ({...x, meta: JSON.parse(x.meta)})),
    addMessage(cid, role, content, meta = {}) {
      const msg = { id: id(), role, content, meta, created_at: now() };
      run('INSERT INTO messages VALUES (?,?,?,?,?,?)', msg.id, cid, role, content, JSON.stringify(meta), msg.created_at);
      run('UPDATE conversations SET updated_at=? WHERE id=?', now(), cid);
      return msg;
    },
    renameConversation(uid, cid, title) { run('UPDATE conversations SET title=?,updated_at=? WHERE id=? AND user_id=?', title, now(), cid, uid); },
    usage(uid, provider, model, input, output, status, elapsed) {
      run('INSERT INTO usage VALUES(?,?,?,?,?,?,?,?,?)', id(), uid, provider, model, input ?? null, output ?? null, status, elapsed, now());
    },
    usageSummary(uid) {
      return get(`SELECT COUNT(*) as calls, SUM(CASE WHEN status='success' THEN 1 ELSE 0 END) as successful,
        COALESCE(SUM(tokens_in),0) as input_tokens, COALESCE(SUM(tokens_out),0) as output_tokens
        FROM usage WHERE user_id=?`, uid);
    },
    usageRecent: uid => all('SELECT provider,model,tokens_in,tokens_out,status,elapsed_ms,created_at FROM usage WHERE user_id=? ORDER BY created_at DESC LIMIT 25', uid),
    audit(uid, event, details={}) {
      run('INSERT INTO audit_events VALUES(?,?,?,?,?)', id(), uid || null, event, JSON.stringify(details), now());
    }
  };
}
