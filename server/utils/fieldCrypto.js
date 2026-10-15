// Field-level AES-256-GCM encryption for sensitive free text (journals, counselling notes).
// Format: v1:<iv b64>:<tag b64>:<ciphertext b64>. The key lives in the environment, not the database.
const crypto = require('crypto');

const PREFIX = 'v1:';

function getKey() {
  const b64 = process.env.FIELD_ENCRYPTION_KEY;
  if (b64) {
    const key = Buffer.from(b64, 'base64');
    if (key.length !== 32) throw new Error('FIELD_ENCRYPTION_KEY must be 32 bytes, base64 encoded');
    return key;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FIELD_ENCRYPTION_KEY is required in production');
  }
  // Development/test convenience only: derive a key from the JWT secret.
  return crypto.createHash('sha256').update(`dev-only-field-key:${process.env.JWT_SECRET || 'dev'}`).digest();
}

function encrypt(plain, aad = '') {
  if (plain === undefined || plain === null || plain === '') return plain;
  const value = String(plain);
  if (value.startsWith(PREFIX)) return value; // already encrypted
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getKey(), iv);
  if (aad) cipher.setAAD(Buffer.from(aad));
  const ct = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
}

function decrypt(value, aad = '') {
  if (typeof value !== 'string' || !value.startsWith(PREFIX)) return value;
  const [ivB64, tagB64, ctB64] = value.slice(PREFIX.length).split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', getKey(), Buffer.from(ivB64, 'base64'));
  if (aad) decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
}

const isEncrypted = (v) => typeof v === 'string' && v.startsWith(PREFIX);

module.exports = { encrypt, decrypt, isEncrypted };
