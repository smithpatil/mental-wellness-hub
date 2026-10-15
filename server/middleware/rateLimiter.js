const rateLimit = require('express-rate-limit');

const num = (v, d) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d);
const json429 = { success: false, message: 'Too many requests, please try again later.' };

// General API limiter (per IP).
const limiter = rateLimit({
  windowMs: num(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  max: num(process.env.RATE_LIMIT_MAX, 300),
  message: json429,
  standardHeaders: true,
  legacyHeaders: false,
});

// Credential endpoints: 5 failed attempts per 15 minutes per IP + target email.
// Successful requests do not count against the budget.
const authLimiter = rateLimit({
  windowMs: num(process.env.AUTH_RATE_WINDOW_MS, 15 * 60 * 1000),
  max: num(process.env.AUTH_RATE_MAX, 5),
  message: json429,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${req.ip}|${String((req.body && req.body.email) || '').toLowerCase().slice(0, 100)}`,
});

// Refresh is called silently by the client, so it gets its own, looser budget.
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: num(process.env.REFRESH_RATE_MAX, 60),
  message: json429,
  standardHeaders: true,
  legacyHeaders: false,
});

// Recommendation endpoint (calls the NLP service): per user budget.
const recommendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: num(process.env.RECOMMEND_RATE_MAX, 30),
  message: json429,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user && String(req.user._id)) || req.ip,
});

module.exports = { limiter, authLimiter, refreshLimiter, recommendLimiter };
