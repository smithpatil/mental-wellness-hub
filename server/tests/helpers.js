// Shared test harness: in-memory MongoDB, a stub NLP service, and small API helpers.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-automated-tests-only';
process.env.COOKIE_SECURE = 'false';
process.env.CLIENT_URL = 'http://localhost:5173';
if (!process.env.AUTH_RATE_MAX) process.env.AUTH_RATE_MAX = '1000';
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX || '100000';
process.env.RECOMMEND_RATE_MAX = process.env.RECOMMEND_RATE_MAX || '1000';
process.env.REFRESH_RATE_MAX = process.env.REFRESH_RATE_MAX || '1000';

const http = require('http');
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let stub;
const stubCalls = [];

async function startDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'mwh_test' });
}

async function stopDb() {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
  if (stub) await new Promise((r) => stub.close(r));
}

async function clearDb() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

// Stub NLP service: OK result for text containing "exam", EMERGENCY for a fixed phrase, else CATEGORY_BROWSE.
function startNlpStub() {
  return new Promise((resolve) => {
    stub = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        const { text } = JSON.parse(body || '{}');
        stubCalls.push(text);
        res.setHeader('Content-Type', 'application/json');
        if (/exam/i.test(text)) {
          res.end(JSON.stringify({ status: 'OK', confidence: 0.9, results: [{ id: 'R001', title: 'The Night-Before Reset Plan', category: 'exam_stress', score: 0.9, why: { matched_terms: ['exam'] } }] }));
        } else if (/please end my pain tonight/i.test(text)) {
          res.end(JSON.stringify({ status: 'EMERGENCY', results: [] }));
        } else {
          res.end(JSON.stringify({ status: 'CATEGORY_BROWSE', results: [], categories: ['sleep'] }));
        }
      });
    });
    stub.listen(0, '127.0.0.1', () => {
      process.env.NLP_SERVICE_URL = `http://127.0.0.1:${stub.address().port}`;
      resolve();
    });
  });
}

const cookieFrom = (res) => {
  const sc = res.headers['set-cookie'];
  if (!sc) return null;
  const c = Array.isArray(sc) ? sc.find((x) => x.startsWith('mwh_rt=')) : sc;
  return c ? c.split(';')[0] : null;
};

let counter = 0;
async function register(app, overrides = {}) {
  counter += 1;
  const body = { name: 'Test User', email: `user${counter}_${Date.now()}@example.com`, password: 'Passw0rd1', consent: true, ...overrides };
  const res = await request(app).post('/api/auth/signup').send(body);
  return { res, body, token: res.body.token, csrf: res.body.csrfToken, cookie: cookieFrom(res), user: res.body.user };
}

async function makeAdmin(email) {
  const User = require('../models/User');
  await User.updateOne({ email: email.toLowerCase() }, { role: 'admin' });
}

const auth = (t) => ({ Authorization: `Bearer ${t}` });

module.exports = { startDb, stopDb, clearDb, startNlpStub, stubCalls, request, register, makeAdmin, auth, cookieFrom, mongoose };
