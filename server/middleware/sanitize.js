// Input hardening applied to every request before routing.
//  - NoSQL operator stripping: drops keys beginning with "$" or containing "." (and prototype keys).
//  - Markup stripping: removes HTML tags from string values (passwords are left untouched).
const SKIP_FIELDS = new Set(['password', 'newPassword', 'currentPassword']);
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const MAX_DEPTH = 6;

function clean(value, key, depth) {
  if (depth > MAX_DEPTH) return undefined;
  if (typeof value === 'string') {
    if (SKIP_FIELDS.has(key)) return value;
    // Only tag-like sequences ("<b", "</p>", "<!--") are removed, so text such as "5 < 7" is preserved.
    return value.replace(/<\/?[a-zA-Z!][^>]*(>|$)/g, '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  }
  if (Array.isArray(value)) return value.map((v) => clean(v, key, depth + 1)).filter((v) => v !== undefined);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('$') || k.includes('.') || FORBIDDEN_KEYS.has(k)) continue;
      const c = clean(v, k, depth + 1);
      if (c !== undefined) out[k] = c;
    }
    return out;
  }
  return value;
}

function sanitize(req, _res, next) {
  for (const part of ['body', 'query', 'params']) {
    if (req[part] && typeof req[part] === 'object') {
      const cleaned = clean(req[part], '', 0);
      if (part === 'query') {
        // Express 4 exposes req.query as a plain mutable object.
        Object.keys(req.query).forEach((k) => delete req.query[k]);
        Object.assign(req.query, cleaned);
      } else {
        req[part] = cleaned;
      }
    }
  }
  next();
}

module.exports = { sanitize, clean };
