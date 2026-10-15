const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const errorHandler = require('./middleware/errorHandler');
const { limiter } = require('./middleware/rateLimiter');
const { sanitize } = require('./middleware/sanitize');

const app = express();
if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : process.env.TRUST_PROXY);
app.disable('x-powered-by');

// Security headers. This service only returns JSON, so the CSP forbids everything else.
app.use(
  helmet({
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"] } },
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginResourcePolicy: { policy: 'same-site' },
  })
);
// Exact-match CORS: other origins receive no Access-Control-Allow-Origin header at all.
const ALLOWED_ORIGIN = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({ origin: (origin, cb) => cb(null, !origin || origin === ALLOWED_ORIGIN), credentials: true }));
app.use(limiter);
app.use(express.json({ limit: '100kb' }));
app.use(sanitize);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/mood', require('./routes/mood'));
app.use('/api/gratitude', require('./routes/gratitude'));
app.use('/api/counselors', require('./routes/counselors'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/forum', require('./routes/forum'));
app.use('/api/gamification', require('./routes/gamification'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/chat', require('./routes/chatbot'));
app.use('/api/recommend', require('./routes/recommend'));

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Mental Wellness API is running', timestamp: new Date() });
});

app.use((req, res) => res.status(404).json({ success: false, message: 'Not found' }));
app.use(errorHandler);

module.exports = app;
