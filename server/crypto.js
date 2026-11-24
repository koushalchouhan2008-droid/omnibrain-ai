import crypto from 'node:crypto';

export const id = () => crypto.randomUUID();
export const now = () => new Date().toISOString();

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

export function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || !stored.includes(':')) return false;
  const [salt, expected] = stored.split(':');
  const actual = Buffer.from(hashPassword(password, salt).split(':')[1], 'hex');
  const reference = Buffer.from(expected || '', 'hex');
  return actual.length === reference.length && crypto.timingSafeEqual(actual, reference);
}

export const hashToken = token => crypto.createHash('sha256').update(token).digest('hex');
export const newToken = () => crypto.randomBytes(32).toString('base64url');

export function encrypt(value, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const payload = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, payload]).toString('base64');
}
export function decrypt(sealed, key) {
  const data = Buffer.from(sealed, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, data.subarray(0, 12));
  decipher.setAuthTag(data.subarray(12, 28));
  return Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString('utf8');
}
