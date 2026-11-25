import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export function loadEnv(file = path.resolve(process.cwd(), '.env')) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const equals = line.indexOf('=');
    if (equals < 1) continue;
    const key = line.slice(0, equals).trim();
    const value = line.slice(equals + 1).trim().replace(/^['"]|['"]$/g, '');
    if (/^[A-Z][A-Z0-9_]*$/.test(key) && process.env[key] === undefined) process.env[key] = value;
  }
}

export function getConfig(overrides = {}) {
  loadEnv();
  const root = path.resolve(process.cwd());
  const dbDir = path.resolve(process.env.DB_DIR || path.join(root, 'data'));
  fs.mkdirSync(dbDir, { recursive: true, mode: 0o700 });
  const production = process.env.NODE_ENV === 'production';
  let secret = process.env.APP_ENCRYPTION_KEY;
  if (!secret && !production) {
    const secretPath = path.join(dbDir, '.development-key');
    if (fs.existsSync(secretPath)) secret = fs.readFileSync(secretPath, 'utf8').trim();
    else {
      secret = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(secretPath, secret, { mode: 0o600 });
    }
  }
  if (!/^[0-9a-f]{64}$/i.test(secret || '')) {
    throw new Error('APP_ENCRYPTION_KEY must be 64 hex characters (required in production).');
  }
  return {
    port: Number(process.env.PORT || 3000),
    host: process.env.HOST || '127.0.0.1',
    production,
    dbDir,
    secret: Buffer.from(secret, 'hex'),
    origin: process.env.ORIGIN || '',
    timeout: Math.min(120000, Math.max(5000, Number(process.env.AI_CALL_TIMEOUT_MS || 45000))),
    maxModels: Math.min(20, Math.max(1, Number(process.env.MAX_AI_MODELS || 8))),
    webDir: path.resolve(root, 'web'),
    ...overrides,
  };
}
