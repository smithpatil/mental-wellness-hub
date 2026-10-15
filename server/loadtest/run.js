// Closed-loop load test of the full stack on one machine:
//   Express API (this repo)  +  in-memory MongoDB  +  Python FastAPI NLP service (single uvicorn worker).
// N virtual users each loop: pick an operation, send it, wait a think time, repeat, for DURATION seconds.
//   usage: node loadtest/run.js 50,100,200 [durationSec=30] [thinkMs=1000]
// Rate limits are raised for the run because all virtual users share one source IP.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'loadtest-secret';
process.env.COOKIE_SECURE = 'false';
process.env.RATE_LIMIT_MAX = '10000000';
process.env.RECOMMEND_RATE_MAX = '10000000';
process.env.AUTH_RATE_MAX = '100000';
process.env.REFRESH_RATE_MAX = '100000';

const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const levels = (process.argv[2] || '50,100,200').split(',').map(Number);
const DURATION = (Number(process.argv[3]) || 30) * 1000;
const THINK = Number(process.argv[4]) || 1000;
const NLP_DIR = path.join(__dirname, '..', '..', 'nlp-service');
const NLP_PORT = 8011;
const NLP_WORKERS = Number(process.env.NLP_WORKERS) || 1;

const QUERIES = [
  'I am stressed about my exam tomorrow', 'cannot sleep at night my mind races', 'I feel lonely in a new city',
  'I keep procrastinating on my assignment', 'worried about everything lately', 'how to calm down quickly',
  'my phone keeps distracting me while I study', 'I feel low and unmotivated', 'nervous about speaking in class',
  'padhte time dhyaan bhatak jaata hai',
];

const pct = (arr, p) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1)]; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(url, tries = 120) {
  for (let i = 0; i < tries; i += 1) {
    try { const r = await fetch(url); if (r.ok) return; } catch { /* retry */ }
    await sleep(500);
  }
  throw new Error(`timeout waiting for ${url}`);
}

function req(agent, port, method, p, token, body) {
  return new Promise((resolve) => {
    const t0 = process.hrtime.bigint();
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({
      agent, host: '127.0.0.1', port, method, path: p, timeout: 15000,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}) },
    }, (res) => {
      res.resume();
      res.on('end', () => resolve({ ms: Number(process.hrtime.bigint() - t0) / 1e6, status: res.statusCode }));
    });
    r.on('timeout', () => { r.destroy(); resolve({ ms: 15000, status: 0 }); });
    r.on('error', () => resolve({ ms: Number(process.hrtime.bigint() - t0) / 1e6, status: 0 }));
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  const mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'mwh_load' });

  const py = path.join(NLP_DIR, '.venv', 'Scripts', 'python.exe');
  const nlp = spawn(py, ['-m', 'uvicorn', 'app.main:app', '--port', String(NLP_PORT), '--workers', String(NLP_WORKERS), '--log-level', 'warning'], { cwd: NLP_DIR, stdio: 'ignore' });
  await waitFor(`http://127.0.0.1:${NLP_PORT}/health`, 240);
  process.env.NLP_SERVICE_URL = `http://127.0.0.1:${NLP_PORT}`;

  const app = require('../app');
  const server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  const port = server.address().port;
  const agent = new http.Agent({ keepAlive: true, maxSockets: Infinity });

  // seed data + one account per virtual user (bcrypt cost 12 is slow, so create a pool and reuse it)
  const Resource = require('../models/Resource');
  const corpus = JSON.parse(fs.readFileSync(path.join(NLP_DIR, 'data', 'corpus.json'), 'utf8'));
  await Resource.insertMany(corpus.map((r) => ({ corpusId: r.id, title: r.title, description: r.description, category: r.category, type: r.type, tags: r.tags })));
  const POOL = Math.max(...levels);
  const tokens = [];
  const t0 = Date.now();
  for (let i = 0; i < POOL; i += 1) {
    const email = `lt${i}@example.com`;
    const res = await fetch(`http://127.0.0.1:${port}/api/auth/signup`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Load ${i}`, email, password: 'Passw0rd1', consent: true }),
    });
    const j = await res.json();
    tokens.push(j.token);
  }
  await mongoose.connection.collection('users').updateMany({}, { $set: { 'consent.recommender': { version: 'x', at: new Date() } } });
  console.log(`seeded ${POOL} users in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const report = [];
  for (const n of levels) {
    const stats = { api: [], recommend: [] };
    const errors = { api: 0, recommend: 0 };
    const statuses = {};
    const end = Date.now() + DURATION;

    const user = async (idx) => {
      const token = tokens[idx];
      await sleep(Math.random() * THINK); // de-synchronise
      while (Date.now() < end) {
        const roll = Math.random();
        let kind; let r;
        if (roll < 0.3) {
          kind = 'recommend';
          r = await req(agent, port, 'POST', '/api/recommend', token, { text: QUERIES[Math.floor(Math.random() * QUERIES.length)] });
        } else {
          kind = 'api';
          const p = ['/api/resources', '/api/mood/history', '/api/gamification/me', '/api/counselors'][Math.floor(Math.random() * 4)];
          r = await req(agent, port, 'GET', p, token);
        }
        stats[kind].push(r.ms);
        statuses[r.status] = (statuses[r.status] || 0) + 1;
        if (r.status < 200 || r.status >= 300) errors[kind] += 1;
        await sleep(THINK * (0.5 + Math.random()));
      }
    };
    await Promise.all(Array.from({ length: n }, (_, i) => user(i)));

    const all = [...stats.api, ...stats.recommend];
    const total = all.length;
    const row = {
      users: n, requests: total, rps: +(total / (DURATION / 1000)).toFixed(1),
      api: { n: stats.api.length, p50: pct(stats.api, 50), p95: pct(stats.api, 95), p99: pct(stats.api, 99) },
      recommend: { n: stats.recommend.length, p50: pct(stats.recommend, 50), p95: pct(stats.recommend, 95), p99: pct(stats.recommend, 99) },
      error_rate_pct: +((100 * (errors.api + errors.recommend)) / total).toFixed(2),
      statuses,
    };
    ['api', 'recommend'].forEach((k) => ['p50', 'p95', 'p99'].forEach((m) => { row[k][m] = row[k][m] === null ? null : +row[k][m].toFixed(1); }));
    report.push(row);
    console.log(JSON.stringify(row));
    await sleep(2000);
  }

  const out = { when: new Date().toISOString(), durationSec: DURATION / 1000, thinkMs: THINK, nlpWorkers: NLP_WORKERS, report };
  fs.mkdirSync(path.join(__dirname, 'results'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'results', `load${process.env.LOAD_TAG || ''}.json`), JSON.stringify(out, null, 2));

  agent.destroy();
  server.close();
  nlp.kill();
  await mongoose.disconnect();
  await mongod.stop();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
