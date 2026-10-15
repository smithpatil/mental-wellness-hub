// Authorisation matrix: every protected endpoint x {anonymous, owner, other user, admin}.
const { startDb, stopDb, clearDb, request, register, makeAdmin, auth, mongoose } = require('./helpers');

let app;
let actors; // { anon, owner, other, admin } -> token or null
let Counselor;

beforeAll(async () => {
  await startDb();
  app = require('../app');
  Counselor = require('../models/Counselor');
  // Users are created once (bcrypt cost 12 is deliberately slow); object data is reset per case.
  const owner = await register(app);
  const other = await register(app);
  const admin = await register(app, { email: 'admin@example.com' });
  await makeAdmin('admin@example.com');
  // the admin's role is read from the DB on each request, so the original token keeps working
  actors = { anon: null, owner: owner.token, other: other.token, admin: admin.token, _ownerId: owner.user.id };
});
afterAll(stopDb);

beforeEach(async () => {
  for (const c of ['gratitudenotes', 'appointments', 'forumposts', 'moodentries', 'counselors', 'auditlogs']) {
    await mongoose.connection.collection(c).deleteMany({});
  }
  // the toggle-status case may deactivate the owner; restore it
  await mongoose.connection.collection('users').updateMany({}, { $set: { isActive: true } });
});

const as = (r, who) => (actors[who] ? r.set(auth(actors[who])) : r);

// Creates fresh objects owned by "owner" for each case.
async function fixtures() {
  const counselor = await Counselor.create({ name: 'Dr Test', specialization: 'general' });
  const note = await request(app).post('/api/gratitude').set(auth(actors.owner)).send({ content: 'sun' });
  const appt = await request(app).post('/api/appointments').set(auth(actors.owner))
    .send({ counselorId: String(counselor._id), dateTime: new Date(Date.now() + 86400000 * (2 + Math.random() * 100)).toISOString(), notes: 'hello' });
  const post = await request(app).post('/api/forum').set(auth(actors.owner)).send({ title: 't', body: 'b', category: 'general' });
  return { counselorId: String(counselor._id), noteId: note.body.data._id, apptId: appt.body.data._id, postId: post.body.data._id };
}

// [name, method, path(f), body(f), expected status per actor]
const U = 'user'; // placeholder to keep the table readable
const rows = [
  ['GET /api/auth/me', 'get', () => '/api/auth/me', null, { anon: 401, owner: 200, other: 200, admin: 200 }],
  ['PUT /api/auth/profile', 'put', () => '/api/auth/profile', () => ({ name: 'New' }), { anon: 401, owner: 200, other: 200, admin: 200 }],
  ['GET /api/auth/export', 'get', () => '/api/auth/export', null, { anon: 401, owner: 200, other: 200, admin: 200 }],
  ['POST /api/mood', 'post', () => '/api/mood', () => ({ mood: 'happy', journal: 'x' }), { anon: 401, owner: 201, other: 201, admin: 201 }],
  ['GET /api/mood/history', 'get', () => '/api/mood/history', null, { anon: 401, owner: 200, other: 200, admin: 200 }],
  ['GET /api/mood/trends', 'get', () => '/api/mood/trends', null, { anon: 401, owner: 200, other: 200, admin: 200 }],
  ['GET /api/gratitude', 'get', () => '/api/gratitude', null, { anon: 401, owner: 200, other: 200, admin: 200 }],
  ['PUT /api/gratitude/:id (object ownership)', 'put', (f) => `/api/gratitude/${f.noteId}`, () => ({ content: 'edit' }), { anon: 401, owner: 200, other: 403, admin: 403 }],
  ['DELETE /api/gratitude/:id (object ownership)', 'delete', (f) => `/api/gratitude/${f.noteId}`, null, { anon: 401, owner: 200, other: 403, admin: 403 }],
  ['GET /api/counselors', 'get', () => '/api/counselors', null, { anon: 401, owner: 200, other: 200, admin: 200 }],
  ['GET /api/appointments', 'get', () => '/api/appointments', null, { anon: 401, owner: 200, other: 200, admin: 200 }],
  ['PUT /api/appointments/:id (object ownership)', 'put', (f) => `/api/appointments/${f.apptId}`, () => ({ dateTime: new Date(Date.now() + 5 * 86400000).toISOString() }), { anon: 401, owner: 200, other: 403, admin: 403 }],
  ['DELETE /api/appointments/:id (object ownership)', 'delete', (f) => `/api/appointments/${f.apptId}`, null, { anon: 401, owner: 200, other: 403, admin: 403 }],
  ['GET /api/resources', 'get', () => '/api/resources', null, { anon: 401, owner: 200, other: 200, admin: 200 }],
  ['GET /api/forum', 'get', () => '/api/forum', null, { anon: 401, owner: 200, other: 200, admin: 200 }],
  ['GET /api/forum/:id', 'get', (f) => `/api/forum/${f.postId}`, null, { anon: 401, owner: 200, other: 200, admin: 200 }],
  ['POST /api/forum/:id/report', 'post', (f) => `/api/forum/${f.postId}/report`, () => ({}), { anon: 401, owner: 200, other: 200, admin: 200 }],
  ['GET /api/gamification/me', 'get', () => '/api/gamification/me', null, { anon: 401, owner: 200, other: 200, admin: 200 }],
  ['POST /api/chat (no message)', 'post', () => '/api/chat', () => ({}), { anon: 401, owner: 400, other: 400, admin: 400 }],
  ['POST /api/recommend (no consent)', 'post', () => '/api/recommend', () => ({ text: 'exam stress' }), { anon: 401, owner: 403, other: 403, admin: 403 }],
  ['POST /api/auth/consent/recommender', 'post', () => '/api/auth/consent/recommender', () => ({}), { anon: 401, owner: 200, other: 200, admin: 200 }],
  // administrator-only
  ['GET /api/admin/users', 'get', () => '/api/admin/users', null, { anon: 401, owner: 403, other: 403, admin: 200 }],
  ['GET /api/admin/counselors', 'get', () => '/api/admin/counselors', null, { anon: 401, owner: 403, other: 403, admin: 200 }],
  ['POST /api/admin/counselors', 'post', () => '/api/admin/counselors', () => ({ name: 'New C', specialization: 'general' }), { anon: 401, owner: 403, other: 403, admin: 201 }],
  ['GET /api/admin/appointments', 'get', () => '/api/admin/appointments', null, { anon: 401, owner: 403, other: 403, admin: 200 }],
  ['GET /api/admin/analytics', 'get', () => '/api/admin/analytics', null, { anon: 401, owner: 403, other: 403, admin: 200 }],
  ['GET /api/admin/forum/reported', 'get', () => '/api/admin/forum/reported', null, { anon: 401, owner: 403, other: 403, admin: 200 }],
  ['DELETE /api/admin/forum/:id', 'delete', (f) => `/api/admin/forum/${f.postId}`, null, { anon: 401, owner: 403, other: 403, admin: 200 }],
  ['PUT /api/admin/users/:id/status', 'put', () => `/api/admin/users/${actors._ownerId}/status`, () => ({}), { anon: 401, owner: 403, other: 403, admin: 200 }],
];

const cases = [];
rows.forEach(([name, method, path, body, exp]) => {
  ['anon', 'owner', 'other', 'admin'].forEach((who) => cases.push([`${name} as ${who}`, name, method, path, body, who, exp[who]]));
});

describe('authorisation matrix', () => {
  test.each(cases)('%s', async (_label, _name, method, path, body, who, expected) => {
    const f = await fixtures();
    let r = request(app)[method](path(f));
    r = as(r, who);
    if (body) r = r.send(body(f));
    const res = await r;
    expect(res.status).toBe(expected);
  });

  test('matrix size', () => {
    expect(cases.length).toBe(rows.length * 4);
  });
});

describe('data isolation', () => {
  test('a user only ever sees their own mood entries, notes and appointments', async () => {
    const f = await fixtures();
    await request(app).post('/api/mood').set(auth(actors.owner)).send({ mood: 'sad', journal: 'private owner text' });
    for (const p of ['/api/mood/history', '/api/gratitude', '/api/appointments']) {
      const res = await request(app).get(p).set(auth(actors.other));
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(JSON.stringify(res.body)).not.toContain('private owner text');
    }
    const own = await request(app).get('/api/appointments').set(auth(actors.owner));
    expect(own.body.data).toHaveLength(1);
    expect(f.apptId).toBeTruthy();
  });

  test('the admin appointment list is the only cross-user view and requires the admin role', async () => {
    await fixtures();
    const asUser = await request(app).get('/api/admin/appointments').set(auth(actors.owner));
    const asAdmin = await request(app).get('/api/admin/appointments').set(auth(actors.admin));
    expect(asUser.status).toBe(403);
    expect(asAdmin.body.data.length).toBeGreaterThan(0);
  });

  test('admin user list never exposes password hashes', async () => {
    const res = await request(app).get('/api/admin/users').set(auth(actors.admin));
    expect(JSON.stringify(res.body)).not.toMatch(/\$2[aby]\$/);
  });
});
