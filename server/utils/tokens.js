// Access tokens (short-lived JWT, returned in the response body and held in client memory) and
// refresh tokens (opaque random values, stored only as SHA-256 hashes, delivered as an httpOnly cookie).
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const ACCESS_TTL = () => process.env.JWT_ACCESS_EXPIRE || '15m';
const REFRESH_TTL_MS = () => (parseInt(process.env.REFRESH_TTL_DAYS, 10) || 7) * 24 * 60 * 60 * 1000;
const COOKIE_NAME = 'mwh_rt';
const CSRF_COOKIE = 'mwh_csrf';

const sha256 = (v) => crypto.createHash('sha256').update(v).digest('hex');
const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');

function signAccessToken(userId) {
  return jwt.sign({ id: String(userId), typ: 'access' }, process.env.JWT_SECRET, { expiresIn: ACCESS_TTL() });
}

function verifyAccessToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (decoded.typ !== 'access') throw new jwt.JsonWebTokenError('wrong token type');
  return decoded;
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== 'false',
    sameSite: 'Strict',
    path: '/api/auth',
    maxAge: REFRESH_TTL_MS(),
  };
}

// Readable (not httpOnly) cookie carrying the CSRF token so it survives page reloads. It is only
// useful together with the httpOnly refresh cookie, and the server checks it against a per-session hash.
function csrfCookieOptions() {
  return { httpOnly: false, secure: process.env.COOKIE_SECURE !== 'false', sameSite: 'Strict', path: '/', maxAge: REFRESH_TTL_MS() };
}

function serializeCookie(name, value, o) {
  let s = `${name}=${encodeURIComponent(value)}`;
  if (o.maxAge !== undefined) s += `; Max-Age=${Math.floor(o.maxAge / 1000)}`;
  if (o.path) s += `; Path=${o.path}`;
  if (o.httpOnly) s += '; HttpOnly';
  if (o.secure) s += '; Secure';
  if (o.sameSite) s += `; SameSite=${o.sameSite}`;
  return s;
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

module.exports = {
  COOKIE_NAME, CSRF_COOKIE, csrfCookieOptions, REFRESH_TTL_MS, sha256, randomToken, signAccessToken, verifyAccessToken,
  cookieOptions, serializeCookie, parseCookies,
};
