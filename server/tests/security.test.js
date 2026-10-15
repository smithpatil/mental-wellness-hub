// Payload and configuration tests for the controls in Table II of the paper.
const { startDb, stopDb, clearDb, request, register, auth, mongoose } = require('./helpers');

let app;
let user;
let Counselor;

beforeAll(async () => {
  await startDb();
  app = require('../app');
  Counselor = require('../models/Counselor');
});
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  user = await register(app, { email: 'sec@example.com' });
});

describe('NoSQL injection', () => {
  test.each([
    [{ email: { $gt: '' }, password: 'x1x1x1' }],
    [{ email: { $ne: null }, password: { $ne: null } }],
    [{ email: 'sec@example.com', password: { $gt: '' } }],
    [{ email: 'sec@example.com', password: { $regex: '.*' } }],
    [{ $where: 'sleep(1000)', email: 'sec@example.com', password: 'x1x1x1' }],
  ])('login payload %j never authenticates', async (payload) => {
    const res = await request(app).post('/api/auth/login').send(payload);
    expect([400, 401]).toContain(res.status);
    expect(res.body.token).toBeUndefined();
  });

  test('operators in query strings are stripped', async () => {
    await request(app).post('/api/forum').set(auth(user.token)).send({ title: 'a', body: 'b', category: 'stress' });
    await request(app).post('/api/forum').set(auth(user.token)).send({ title: 'c', body: 'd', category: 'sleep' });
    const res = await request(app).get('/api/forum?category[$ne]=stress').set(auth(user.token));
    expect(res.status).not.toBe(500);
    if (res.status === 200) expect(res.body.data.every((p) => p.category === 'sleep') || res.body.data.length === 0).toBe(true);
    const res2 = await request(app).get('/api/resources?search[$where]=1').set(auth(user.token));
    expect(res2.status).not.toBe(500);
  });

  test('prototype pollution keys are ignored', async () => {
    const res = await request(app).put('/api/auth/profile').set(auth(user.token))
      .set('Content-Type', 'application/json').send('{"name":"x","__proto__":{"isAdmin":true},"constructor":{"prototype":{"isAdmin":true}}}');
    expect(res.status).toBe(200);
    expect({}.isAdmin).toBeUndefined();
  });
});

describe('cross-site scripting', () => {
  const payloads = ['<script>alert(1)</script>Hello', '<img src=x onerror=alert(1)>', '"><svg onload=alert(1)>', '<a href="javascript:alert(1)">x</a>'];

  test.each(payloads)('forum post containing %s is stored without markup', async (p) => {
    const res = await request(app).post('/api/forum').set(auth(user.token)).send({ title: `T ${p}`, body: `B ${p}`, category: 'general' });
    expect(res.status).toBe(201);
    const raw = await mongoose.connection.collection('forumposts').findOne({});
    expect(raw.title + raw.body).not.toMatch(/<\s*(script|img|svg|a)\b/i);
  });

  test('journal and gratitude text are stripped of markup', async () => {
    await request(app).post('/api/mood').set(auth(user.token)).send({ mood: 'happy', journal: '<script>x</script>fine day' });
    const h = await request(app).get('/api/mood/history').set(auth(user.token));
    expect(JSON.stringify(h.body)).not.toContain('<script');
    expect(JSON.stringify(h.body)).toContain('fine day');
    await request(app).post('/api/gratitude').set(auth(user.token)).send({ content: '<img src=x onerror=alert(1)>thanks' });
    const g = await request(app).get('/api/gratitude').set(auth(user.token));
    expect(JSON.stringify(g.body)).not.toContain('<img');
  });

  test('legitimate comparison text is preserved', async () => {
    await request(app).post('/api/mood').set(auth(user.token)).send({ mood: 'okay', journal: 'slept < 5 hours' });
    const h = await request(app).get('/api/mood/history').set(auth(user.token));
    expect(JSON.stringify(h.body)).toContain('slept < 5 hours');
  });
});

describe('response headers and transport policy', () => {
  test('security headers are present and the framework is not disclosed', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-security-policy']).toMatch(/default-src 'none'/);
    expect(res.headers['content-security-policy']).toMatch(/frame-ancestors 'none'/);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toMatch(/max-age=/);
    expect(res.headers['referrer-policy']).toBe('no-referrer');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  test('CORS only allows the configured client origin', async () => {
    const evil = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
    const ok = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  test('oversized bodies are rejected', async () => {
    const res = await request(app).post('/api/gratitude').set(auth(user.token)).send({ content: 'a'.repeat(300 * 1024) });
    expect(res.status).toBe(413);
  });

  test('errors do not leak stack traces or file paths', async () => {
    const res = await request(app).get('/api/gratitude/not-an-object-id').set(auth(user.token));
    expect(JSON.stringify(res.body)).not.toMatch(/node_modules|\.js:\d+|at \w+/);
    const bad = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad json');
    expect(bad.status).toBe(400);
    expect(JSON.stringify(bad.body)).not.toMatch(/node_modules|\.js:\d+/);
  });
});

describe('mass assignment', () => {
  test('profile update cannot change role, points or active flag', async () => {
    const res = await request(app).put('/api/auth/profile').set(auth(user.token))
      .send({ name: 'Changed', role: 'admin', points: 99999, isActive: false, email: 'other@example.com' });
    expect(res.status).toBe(200);
    const raw = await mongoose.connection.collection('users').findOne({ email: 'sec@example.com' });
    expect(raw.role).toBe('user');
    expect(raw.points).toBe(0);
    expect(raw.isActive).toBe(true);
    expect(raw.name).toBe('Changed');
  });
});

describe('data exposure: storage inspection', () => {
  test('journal text is encrypted at rest and decrypted for its owner', async () => {
    const secret = 'my very private worry about the results';
    await request(app).post('/api/mood').set(auth(user.token)).send({ mood: 'sad', journal: secret });
    const raw = await mongoose.connection.collection('moodentries').findOne({});
    expect(raw.journal.startsWith('v1:')).toBe(true);
    expect(raw.journal).not.toContain('private worry');
    const api = await request(app).get('/api/mood/history').set(auth(user.token));
    expect(api.body.data[0].journal).toBe(secret);
  });

  test('counselling request notes are encrypted at rest', async () => {
    const c = await Counselor.create({ name: 'Dr X', specialization: 'general' });
    const note = 'I have been feeling very low since the exams';
    const res = await request(app).post('/api/appointments').set(auth(user.token))
      .send({ counselorId: String(c._id), dateTime: new Date(Date.now() + 3 * 86400000).toISOString(), notes: note });
    expect(res.status).toBe(201);
    const raw = await mongoose.connection.collection('appointments').findOne({});
    expect(raw.notes.startsWith('v1:')).toBe(true);
    expect(raw.notes).not.toContain('feeling very low');
    const list = await request(app).get('/api/appointments').set(auth(user.token));
    expect(list.body.data[0].notes).toBe(note);
  });

  test('refresh tokens are stored only as hashes', async () => {
    const raw = await mongoose.connection.collection('refreshtokens').findOne({});
    const cookieValue = decodeURIComponent(user.cookie.split('=')[1]);
    expect(raw.tokenHash).not.toBe(cookieValue);
    expect(JSON.stringify(raw)).not.toContain(cookieValue);
  });

  test('password hashes and reset tokens are never returned by the API', async () => {
    const me = await request(app).get('/api/auth/me').set(auth(user.token));
    expect(JSON.stringify(me.body)).not.toMatch(/\$2[aby]\$|resetPasswordToken/);
    const exp = await request(app).get('/api/auth/export').set(auth(user.token));
    expect(JSON.stringify(exp.body)).not.toMatch(/\$2[aby]\$/);
  });
});
