// Functional and privacy-behaviour tests for the platform modules.
const { startDb, stopDb, clearDb, startNlpStub, stubCalls, request, register, makeAdmin, auth, mongoose } = require('./helpers');

let app;
let u;
let models;

beforeAll(async () => {
  await startDb();
  await startNlpStub();
  app = require('../app');
  models = {
    Counselor: require('../models/Counselor'),
    Resource: require('../models/Resource'),
    MoodEntry: require('../models/MoodEntry'),
    AuditLog: require('../models/AuditLog'),
    User: require('../models/User'),
  };
});
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  stubCalls.length = 0;
  u = await register(app, { email: 'feat@example.com' });
});

const future = (days) => new Date(Date.now() + days * 86400000).toISOString();

describe('mood and journal', () => {
  test('logs a mood, updates the same-day entry and reports trends', async () => {
    const a = await request(app).post('/api/mood').set(auth(u.token)).send({ mood: 'okay', journal: 'ok day' });
    expect(a.status).toBe(201);
    expect(a.body.data.moodScore).toBe(3);
    await request(app).post('/api/mood').set(auth(u.token)).send({ mood: 'happy' });
    const h = await request(app).get('/api/mood/history').set(auth(u.token));
    expect(h.body.data).toHaveLength(1);
    expect(h.body.data[0].mood).toBe('happy');
    const t = await request(app).get('/api/mood/trends?period=week').set(auth(u.token));
    expect(t.status).toBe(200);
  });

  test('rejects an invalid mood and an over-long journal', async () => {
    expect((await request(app).post('/api/mood').set(auth(u.token)).send({ mood: 'ecstatic' })).status).toBe(400);
    expect((await request(app).post('/api/mood').set(auth(u.token)).send({ mood: 'sad', journal: 'x'.repeat(2001) })).status).toBe(400);
  });

  test('export returns decrypted entries', async () => {
    await request(app).post('/api/mood').set(auth(u.token)).send({ mood: 'sad', journal: 'export me' });
    const r = await request(app).get('/api/mood/export').set(auth(u.token));
    expect(r.status).toBe(200);
    expect(JSON.stringify(r.body)).toContain('export me');
  });
});

describe('gratitude notes', () => {
  test('create, list, update and delete', async () => {
    const c = await request(app).post('/api/gratitude').set(auth(u.token)).send({ content: 'good tea' });
    expect(c.status).toBe(201);
    const id = c.body.data._id;
    expect((await request(app).put(`/api/gratitude/${id}`).set(auth(u.token)).send({ content: 'great tea' })).body.data.content).toBe('great tea');
    expect((await request(app).get('/api/gratitude').set(auth(u.token))).body.data).toHaveLength(1);
    expect((await request(app).delete(`/api/gratitude/${id}`).set(auth(u.token))).status).toBe(200);
    expect((await request(app).get('/api/gratitude').set(auth(u.token))).body.data).toHaveLength(0);
  });
});

describe('counselling requests', () => {
  let counselor;
  beforeEach(async () => { counselor = await models.Counselor.create({ name: 'Dr Rao', specialization: 'anxiety' }); });

  test('lists counsellors, books, rejects double booking, reschedules and cancels', async () => {
    const list = await request(app).get('/api/counselors').set(auth(u.token));
    expect(list.body.data).toHaveLength(1);
    const when = future(3);
    const b = await request(app).post('/api/appointments').set(auth(u.token)).send({ counselorId: String(counselor._id), dateTime: when, notes: 'need to talk' });
    expect(b.status).toBe(201);
    const other = await register(app);
    const clash = await request(app).post('/api/appointments').set(auth(other.token)).send({ counselorId: String(counselor._id), dateTime: when });
    expect(clash.status).toBe(400);
    const id = b.body.data._id;
    const re = await request(app).put(`/api/appointments/${id}`).set(auth(u.token)).send({ dateTime: future(5) });
    expect(re.body.data.status).toBe('rescheduled');
    expect((await request(app).delete(`/api/appointments/${id}`).set(auth(u.token))).status).toBe(200);
  });

  test('validates date and note length', async () => {
    const base = { counselorId: String(counselor._id) };
    expect((await request(app).post('/api/appointments').set(auth(u.token)).send({ ...base, dateTime: 'tomorrow-ish' })).status).toBe(400);
    expect((await request(app).post('/api/appointments').set(auth(u.token)).send({ ...base, dateTime: future(2), notes: 'n'.repeat(1001) })).status).toBe(400);
    expect((await request(app).post('/api/appointments').set(auth(u.token)).send({ dateTime: future(2) })).status).toBe(400);
  });
});

describe('resources, forum and rewards', () => {
  test('resources list, filter and view counter', async () => {
    const r = await models.Resource.create({ title: 'Sleep guide', description: 'wind down', category: 'stress', type: 'article' });
    const all = await request(app).get('/api/resources').set(auth(u.token));
    expect(all.body.data).toHaveLength(1);
    expect((await request(app).get('/api/resources?category=anxiety').set(auth(u.token))).body.data).toHaveLength(0);
    const one = await request(app).get(`/api/resources/${r._id}`).set(auth(u.token));
    expect(one.body.data.views).toBe(1);
  });

  test('forum: post, reply, like toggle, report once', async () => {
    const p = await request(app).post('/api/forum').set(auth(u.token)).send({ title: 'Hi', body: 'Anyone else?', category: 'stress' });
    expect(p.status).toBe(201);
    const id = p.body.data._id;
    const other = await register(app);
    expect((await request(app).post(`/api/forum/${id}/reply`).set(auth(other.token)).send({ body: 'Me too' })).status).toBe(201);
    const l1 = await request(app).put(`/api/forum/${id}/like`).set(auth(other.token));
    expect(l1.body.likeCount).toBe(1);
    const l2 = await request(app).put(`/api/forum/${id}/like`).set(auth(other.token));
    expect(l2.body.likeCount).toBe(0);
    expect((await request(app).post(`/api/forum/${id}/report`).set(auth(other.token))).status).toBe(200);
    expect((await request(app).post(`/api/forum/${id}/report`).set(auth(other.token))).status).toBe(400);
    const get = await request(app).get(`/api/forum/${id}`).set(auth(u.token));
    expect(get.body.data.replies).toHaveLength(1);
    expect(JSON.stringify(get.body)).not.toContain('feat@example.com');
  });

  test('forum rejects an unknown category and empty title', async () => {
    expect((await request(app).post('/api/forum').set(auth(u.token)).send({ title: 'x', body: 'y', category: 'bogus' })).status).toBe(400);
    expect((await request(app).post('/api/forum').set(auth(u.token)).send({ title: '', body: 'y', category: 'general' })).status).toBe(400);
  });

  test('rewards endpoint returns points and weekly goals', async () => {
    await request(app).post('/api/mood').set(auth(u.token)).send({ mood: 'happy' });
    const r = await request(app).get('/api/gamification/me').set(auth(u.token));
    expect(r.status).toBe(200);
    expect(r.body.data.points).toBeGreaterThan(0);
    expect(r.body.data.weeklyGoals.moodLogs.current).toBe(1);
  });
});

describe('recommender: consent, crisis gate, availability and no query storage', () => {
  const rec = (token, text) => request(app).post('/api/recommend').set(auth(token)).send({ text });
  const grant = (token) => request(app).post('/api/auth/consent/recommender').set(auth(token));

  test('requires purpose-specific consent, which can be withdrawn', async () => {
    expect((await rec(u.token, 'exam stress')).status).toBe(403);
    expect((await grant(u.token)).status).toBe(200);
    const ok = await rec(u.token, 'I am stressed about my exam');
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('OK');
    expect(ok.body.results[0].category).toBe('exam_stress');
    await request(app).delete('/api/auth/consent/recommender').set(auth(u.token));
    expect((await rec(u.token, 'exam stress')).status).toBe(403);
  });

  test('self-harm language is intercepted before the NLP service is called', async () => {
    await grant(u.token);
    const res = await rec(u.token, 'I want to kill myself');
    expect(res.body.status).toBe('EMERGENCY');
    expect(res.body.results).toEqual([]);
    expect(res.body.helplines.some((h) => h.number === '14416')).toBe(true);
    expect(stubCalls).toHaveLength(0);
  });

  test('an EMERGENCY verdict from the NLP service is passed through and logged without text', async () => {
    await grant(u.token);
    const text = 'please end my pain tonight';
    const res = await rec(u.token, text);
    expect(res.body.status).toBe('EMERGENCY');
    const logs = await models.AuditLog.find({ action: 'recommender.crisis_flag' }).lean();
    expect(logs).toHaveLength(1);
    expect(JSON.stringify(logs)).not.toContain('pain tonight');
  });

  test('query text is never persisted anywhere in the database', async () => {
    await grant(u.token);
    const marker = 'zebra-quokka-exam-marker-7731';
    await rec(u.token, `my exam worry ${marker}`);
    for (const c of await mongoose.connection.db.collections()) {
      const docs = await c.find({}).toArray();
      expect(JSON.stringify(docs)).not.toContain(marker);
    }
  });

  test('degrades gracefully when the NLP service is unavailable', async () => {
    await grant(u.token);
    const saved = process.env.NLP_SERVICE_URL;
    process.env.NLP_SERVICE_URL = 'http://127.0.0.1:1';
    const res = await rec(u.token, 'trouble sleeping');
    process.env.NLP_SERVICE_URL = saved;
    expect(res.status).toBe(503);
    expect(res.body.status).toBe('UNAVAILABLE');
    expect(res.body.categories.length).toBeGreaterThan(0);
  });

  test('rejects empty and over-long input', async () => {
    await grant(u.token);
    expect((await rec(u.token, '   ')).status).toBe(400);
    expect((await rec(u.token, 'a'.repeat(1001))).status).toBe(400);
  });
});

describe('audit log', () => {
  test('records sign-in outcomes, consent and administrator access', async () => {
    await request(app).post('/api/auth/login').send({ email: 'feat@example.com', password: 'Passw0rd1' });
    await request(app).post('/api/auth/login').send({ email: 'feat@example.com', password: 'Wrong0000' });
    await request(app).post('/api/auth/consent/recommender').set(auth(u.token));
    const admin = await register(app, { email: 'adm@example.com' });
    await makeAdmin('adm@example.com');
    await request(app).get('/api/admin/users').set(auth(admin.token));
    await new Promise((r) => setTimeout(r, 150));
    const actions = (await models.AuditLog.find({}).lean()).map((a) => `${a.action}:${a.outcome}`);
    expect(actions).toEqual(expect.arrayContaining(['auth.login:success', 'auth.login:failure', 'consent.recommender_granted:success']));
    expect(actions.some((a) => a.startsWith('admin.GET'))).toBe(true);
  });

  test('never contains journal or note content', async () => {
    await request(app).post('/api/mood').set(auth(u.token)).send({ mood: 'sad', journal: 'unique-journal-text-5521' });
    const logs = JSON.stringify(await models.AuditLog.find({}).lean());
    expect(logs).not.toContain('unique-journal-text-5521');
  });
});

describe('data subject rights and retention', () => {
  test('export includes decrypted data and the account can be erased', async () => {
    await request(app).post('/api/mood').set(auth(u.token)).send({ mood: 'sad', journal: 'erase me please' });
    await request(app).post('/api/gratitude').set(auth(u.token)).send({ content: 'a note' });
    const exp = await request(app).get('/api/auth/export').set(auth(u.token));
    expect(exp.status).toBe(200);
    expect(JSON.stringify(exp.body)).toContain('erase me please');

    const del = await request(app).delete('/api/auth/account').set(auth(u.token));
    expect(del.status).toBe(200);
    expect(await models.User.countDocuments({ email: 'feat@example.com' })).toBe(0);
    expect(await models.MoodEntry.countDocuments({})).toBe(0);
    expect(await mongoose.connection.collection('gratitudenotes').countDocuments({})).toBe(0);
    expect(await mongoose.connection.collection('refreshtokens').countDocuments({})).toBe(0);
    expect((await request(app).get('/api/auth/me').set(auth(u.token))).status).toBe(401);
  });

  test('journal text older than the retention period is purged, scores are kept', async () => {
    const { purgeOldJournals } = require('../utils/retention');
    const uid = u.user.id;
    const old = await models.MoodEntry.create({ userId: uid, mood: 'sad', journal: 'old text', date: new Date(Date.now() - 200 * 86400000) });
    const recent = await models.MoodEntry.create({ userId: uid, mood: 'happy', journal: 'recent text', date: new Date(Date.now() - 10 * 86400000) });
    const purged = await purgeOldJournals();
    expect(purged).toBe(1);
    const oldRaw = await mongoose.connection.collection('moodentries').findOne({ _id: old._id });
    const recentRaw = await mongoose.connection.collection('moodentries').findOne({ _id: recent._id });
    expect(oldRaw.journal).toBeUndefined();
    expect(oldRaw.moodScore).toBe(2);
    expect(recentRaw.journal.startsWith('v1:')).toBe(true);
  });
});
