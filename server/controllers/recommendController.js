// Proxy to the Python NLP service, with defence-in-depth:
//   1. consent check (done in the route)
//   2. Node-side crisis lexicon gate, so a self-harm query is intercepted even if the NLP service is down
//   3. NLP service (crisis semantic stage + hybrid retrieval + low-confidence fallback)
// Query text is processed in memory only. It is never written to the database or to logs;
// crisis events are audit-logged WITHOUT the text.
const fs = require('fs');
const path = require('path');
const audit = require('../utils/audit');

const HELPLINES = [
  { name: 'Tele-MANAS (Govt. of India)', number: '14416', desc: '24/7, free, multiple languages' },
  { name: 'KIRAN Mental Health', number: '1800-599-0019', desc: '24/7 toll-free' },
  { name: 'Emergency services', number: '112', desc: 'Immediate danger' },
];
const CATEGORIES = ['exam_stress', 'sleep', 'anxiety', 'low_mood', 'loneliness', 'time_management', 'relaxation', 'focus'];

function loadLexicon() {
  const candidates = [
    process.env.CRISIS_LEXICON_PATH,
    path.join(__dirname, '..', '..', 'nlp-service', 'data', 'crisis_lexicon.json'),
  ].filter(Boolean);
  for (const p of candidates) {
    try {
      return JSON.parse(fs.readFileSync(p, 'utf8')).map((s) => new RegExp(s, 'i'));
    } catch { /* try next */ }
  }
  return [/\bkill(?:ing)? myself\b/i, /\bsuicid\w*\b/i, /\bwant(?:ed)? to die\b/i, /\bend(?:ing)? my (?:own )?life\b/i, /\bself[- ]?harm\w*\b/i];
}
const LEXICON = loadLexicon();
const lexiconHit = (text) => LEXICON.some((re) => re.test(text.replace(/’/g, "'")));

async function callNlp(text) {
  const base = process.env.NLP_SERVICE_URL || 'http://127.0.0.1:8001';
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.NLP_SERVICE_KEY) headers['X-Internal-Key'] = process.env.NLP_SERVICE_KEY;
  const r = await fetch(`${base}/recommend`, {
    method: 'POST', headers, body: JSON.stringify({ text }), signal: AbortSignal.timeout(5000),
  });
  if (!r.ok) throw new Error(`nlp ${r.status}`);
  return r.json();
}

// @route POST /api/recommend   { text }
exports.recommend = async (req, res, next) => {
  try {
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (!text) return res.status(400).json({ success: false, message: 'Please describe how you are feeling.' });
    if (text.length > 1000) return res.status(400).json({ success: false, message: 'Please keep your description under 1000 characters.' });

    if (lexiconHit(text)) {
      await audit(req, 'recommender.crisis_flag', { meta: { stage: 'node-lexicon' } });
      return res.json({ success: true, status: 'EMERGENCY', results: [], helplines: HELPLINES });
    }

    let out;
    try {
      out = await callNlp(text);
    } catch (err) {
      return res.status(503).json({
        success: false, status: 'UNAVAILABLE', categories: CATEGORIES,
        message: 'Suggestions are temporarily unavailable. You can browse resources by category.',
      });
    }
    if (out.status === 'EMERGENCY') await audit(req, 'recommender.crisis_flag', { meta: { stage: 'nlp-service' } });
    res.json({ success: true, ...out });
  } catch (error) {
    next(error);
  }
};

exports.lexiconHit = lexiconHit;
