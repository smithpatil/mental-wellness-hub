process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'unit-test-secret';
const crypto = require('crypto');
const { encrypt, decrypt, isEncrypted } = require('../utils/fieldCrypto');
const { clean } = require('../middleware/sanitize');
const { parseCookies, serializeCookie, sha256 } = require('../utils/tokens');

describe('AES-256-GCM field encryption', () => {
  test('round-trips unicode text', () => {
    const t = 'आज मैं थोड़ा चिंतित हूँ, but okay 🙂';
    const c = encrypt(t, 'F');
    expect(isEncrypted(c)).toBe(true);
    expect(c).not.toContain('चिंतित');
    expect(decrypt(c, 'F')).toBe(t);
  });

  test('uses a fresh IV, so equal plaintexts give different ciphertexts', () => {
    expect(encrypt('same', 'F')).not.toBe(encrypt('same', 'F'));
  });

  test('detects tampering with the ciphertext or the associated data', () => {
    const c = encrypt('secret journal', 'MoodEntry.journal');
    const parts = c.split(':');
    const ct = Buffer.from(parts[3], 'base64');
    ct[0] ^= 1;
    parts[3] = ct.toString('base64');
    expect(() => decrypt(parts.join(':'), 'MoodEntry.journal')).toThrow();
    expect(() => decrypt(c, 'Appointment.notes')).toThrow(); // wrong field context
  });

  test('is idempotent and passes through empty values and legacy plaintext', () => {
    const c = encrypt('x', 'F');
    expect(encrypt(c, 'F')).toBe(c);
    expect(encrypt('', 'F')).toBe('');
    expect(encrypt(undefined)).toBeUndefined();
    expect(decrypt('legacy plaintext')).toBe('legacy plaintext');
  });

  test('requires an explicit key in production and validates its length', () => {
    const env = { ...process.env };
    process.env.NODE_ENV = 'production';
    delete process.env.FIELD_ENCRYPTION_KEY;
    expect(() => encrypt('x')).toThrow(/required/);
    process.env.FIELD_ENCRYPTION_KEY = Buffer.from('short').toString('base64');
    expect(() => encrypt('x')).toThrow(/32 bytes/);
    process.env.FIELD_ENCRYPTION_KEY = crypto.randomBytes(32).toString('base64');
    expect(decrypt(encrypt('ok'))).toBe('ok');
    Object.assign(process.env, env);
    delete process.env.FIELD_ENCRYPTION_KEY;
  });
});

describe('input sanitiser', () => {
  test('strips NoSQL operators and dotted/prototype keys', () => {
    const out = clean({ email: { $gt: '' }, a: { 'b.c': 1, ok: 2 }, __proto__: { x: 1 }, constructor: 1 }, '', 0);
    expect(out.email).toEqual({});
    expect(out.a).toEqual({ ok: 2 });
    expect(Object.keys(out)).not.toContain('constructor');
  });

  test('strips markup but keeps comparison text and leaves passwords alone', () => {
    expect(clean({ t: '<script>alert(1)</script>hi' }, '', 0).t).toBe('alert(1)hi');
    expect(clean({ t: 'I slept < 5 hours and > 3 times' }, '', 0).t).toBe('I slept < 5 hours and > 3 times');
    expect(clean({ password: 'a<b>c' }, '', 0).password).toBe('a<b>c');
  });
});

describe('cookie helpers', () => {
  test('parse and serialise', () => {
    expect(parseCookies('a=1; mwh_rt=abc%3D')).toEqual({ a: '1', mwh_rt: 'abc=' });
    const s = serializeCookie('mwh_rt', 'v', { httpOnly: true, secure: true, sameSite: 'Strict', path: '/api/auth', maxAge: 1000 });
    expect(s).toBe('mwh_rt=v; Max-Age=1; Path=/api/auth; HttpOnly; Secure; SameSite=Strict');
    expect(sha256('a')).toHaveLength(64);
  });
});
