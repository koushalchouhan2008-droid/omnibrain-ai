-- Schema snapshot; migrations are applied on startup by server/database.js and server/workspace.js.
PRAGMA foreign_keys=ON;
CREATE TABLE users (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
      password_hash TEXT NOT NULL, created_at TEXT NOT NULL
    );
CREATE TABLE sessions (
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL, created_at TEXT NOT NULL
    );
CREATE TABLE credentials (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL, encrypted_key TEXT NOT NULL,
      model TEXT, verified_at TEXT, created_at TEXT NOT NULL,
      PRIMARY KEY(user_id, provider)
    );
CREATE TABLE conversations (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
CREATE TABLE messages (
      id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('user','assistant')),
      content TEXT NOT NULL, meta TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
    );
CREATE TABLE usage (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL, model TEXT NOT NULL, tokens_in INTEGER,
      tokens_out INTEGER, status TEXT NOT NULL, elapsed_ms INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
CREATE TABLE audit_events (
      id TEXT PRIMARY KEY, user_id TEXT, event TEXT NOT NULL,
      details TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
    );
CREATE TABLE workspace_items (id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,kind TEXT NOT NULL,data TEXT NOT NULL,secret TEXT,created TEXT NOT NULL);
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_conversations_user ON conversations(user_id, updated_at DESC);
CREATE INDEX idx_messages_convo ON messages(conversation_id, created_at);
CREATE INDEX idx_usage_user ON usage(user_id, created_at);
CREATE INDEX ws_owner ON workspace_items(user_id,kind);