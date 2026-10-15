const jwt = require('jsonwebtoken');
const { startDb, stopDb, clearDb, request, register, auth, cookieFrom, mongoose } = require('./helpers');

jest.mock('../utils/sendEmail', () => jest.fn().mockResolvedValue());

let app;
beforeAll(async () => {
  await startDb();
  app = require('../app');
});
afterAll(stopDb);
beforeEach(clearDb);

describe('registration', () => {
  test('creates an account, returns an access token and sets a hardened refresh cookie', async () => {
    const r = await register(app);
    expect(r.res.status).toBe(201);
    expect(r.token).toBeTruthy();
    expect(r.csrf).toBeTruthy();
    const sc = r.res.headers['set-cookie'][0];
    expect(sc).toMatch(/^mwh_rt=/);
    expect(sc).toMatch(/HttpOnly/);
    expect(sc).toMatch(/SameSite=Strict/);
    expect(sc).toMatch(/Path=\/api\/auth/);
    // the CSRF token cookie is readable by the client but still SameSite=Strict
    const csrfCookie = r.res.headers['set-cookie'].find((c) => c.startsWith('mwh_csrf='));
    expect(csrfCookie).toBeTruthy();
    expect(csrfCookie).not.toMatch(/HttpOnly/);
    expect(csrfCookie).toMatch(/SameSite=Strict/);
  });

  test('rejects signup without consent', async () => {
    const r = await register(app, { consent: false });
    expect(r.res.status).toBe(400);
  });

  test('ignores a self-assigned admin role (privilege escalation)', async () => {
    const r = await register(app, { role: 'admin' });
    expect(r.res.status).toBe(201);
    expect(r.user.role).toBe('user');
    const adminRoute = await request(app).get('/api/admin/users').set(auth(r.token));
    expect(adminRoute.status).toBe(403);
  });

  test('rejects weak passwords and duplicate emails', async () => {
    expect((await register(app, { password: 'abc' })).res.status).toBe(400);
    expect((await register(app, { password: 'abcdefgh' })).res.status).toBe(400);
    const first = await register(app, { email: 'dup@example.com' });
    expect(first.res.status).toBe(201);
    expect((await register(app, { email: 'dup@example.com' })).res.status).toBe(400);
  });

  test('stores passwords as bcrypt hashes with cost factor 12', async () => {
    const r = await register(app, { email: 'hash@example.com' });
    const raw = await mongoose.connection.collection('users').findOne({ email: 'hash@example.com' });
    expect(raw.password).toMatch(/^\$2[aby]\$12\$/);
    expect(raw.password).not.toContain(r.body.password);
  });
});

describe('login', () => {
  test('succeeds with valid credentials', async () => {
    const r = await register(app, { email: 'login@example.com' });
    const res = await request(app).post('/api/auth/login').send({ email: 'login@example.com', password: r.body.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(cookieFrom(res)).toBeTruthy();
  });

  test('gives the same error for a wrong password and an unknown email', async () => {
    await register(app, { email: 'known@example.com' });
    const a = await request(app).post('/api/auth/login').send({ email: 'known@example.com', password: 'WrongPass9' });
    const b = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'WrongPass9' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.message).toBe(b.body.message);
  });

  test('locks the account after 5 consecutive failures', async () => {
    const r = await register(app, { email: 'lock@example.com' });
    for (let i = 0; i < 5; i += 1) {
      await request(app).post('/api/auth/login').send({ email: 'lock@example.com', password: 'WrongPass9' });
    }
    const res = await request(app).post('/api/auth/login').send({ email: 'lock@example.com', password: r.body.password });
    expect(res.status).toBe(423);
  });

  test('forgot-password does not reveal whether an account exists', async () => {
    await register(app, { email: 'exists@example.com' });
    const a = await request(app).post('/api/auth/forgot-password').send({ email: 'exists@example.com' });
    const b = await request(app).post('/api/auth/forgot-password').send({ email: 'ghost@example.com' });
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(a.body.message).toBe(b.body.message);
  });
});

describe('access token expiry', () => {
  test('access tokens live 15 minutes', async () => {
    const r = await register(app);
    const d = jwt.decode(r.token);
    expect(d.exp - d.iat).toBe(15 * 60);
  });

  test('an expired access token is rejected', async () => {
    const r = await register(app);
    const expired = jwt.sign({ id: r.user.id, typ: 'access' }, process.env.JWT_SECRET, { expiresIn: -10 });
    const res = await request(app).get('/api/auth/me').set(auth(expired));
    expect(res.status).toBe(401);
  });

  test('a token of the wrong type, or signed with another key, is rejected', async () => {
    const r = await register(app);
    const wrongTyp = jwt.sign({ id: r.user.id, typ: 'refresh' }, process.env.JWT_SECRET, { expiresIn: 60 });
    const wrongKey = jwt.sign({ id: r.user.id, typ: 'access' }, 'another-secret', { expiresIn: 60 });
    expect((await request(app).get('/api/auth/me').set(auth(wrongTyp))).status).toBe(401);
    expect((await request(app).get('/api/auth/me').set(auth(wrongKey))).status).toBe(401);
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
  });
});

describe('refresh token rotation, CSRF and revocation', () => {
  test('rotates the refresh token and issues a new access token', async () => {
    const r = await register(app);
    const res = await request(app).post('/api/auth/refresh').set('Cookie', r.cookie).set('X-CSRF-Token', r.csrf);
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    const next = cookieFrom(res);
    expect(next).toBeTruthy();
    expect(next).not.toBe(r.cookie);
    expect(res.body.csrfToken).not.toBe(r.csrf);
  });

  test('re-using a rotated refresh token is rejected and revokes the whole session family', async () => {
    const r = await register(app);
    const first = await request(app).post('/api/auth/refresh').set('Cookie', r.cookie).set('X-CSRF-Token', r.csrf);
    const newCookie = cookieFrom(first);
    const newCsrf = first.body.csrfToken;
    // attacker replays the OLD cookie
    const replay = await request(app).post('/api/auth/refresh').set('Cookie', r.cookie).set('X-CSRF-Token', r.csrf);
    expect(replay.status).toBe(401);
    // the legitimate (new) token in the same family is now revoked too
    const after = await request(app).post('/api/auth/refresh').set('Cookie', newCookie).set('X-CSRF-Token', newCsrf);
    expect(after.status).toBe(401);
  });

  test('refresh without a CSRF token, or with a wrong one, is forbidden (forged request)', async () => {
    const r = await register(app);
    expect((await request(app).post('/api/auth/refresh').set('Cookie', r.cookie)).status).toBe(403);
    expect((await request(app).post('/api/auth/refresh').set('Cookie', r.cookie).set('X-CSRF-Token', 'forged')).status).toBe(403);
  });

  test('refresh without a cookie is unauthorised', async () => {
    expect((await request(app).post('/api/auth/refresh').set('X-CSRF-Token', 'x')).status).toBe(401);
  });

  test('logout revokes the session', async () => {
    const r = await register(app);
    const out = await request(app).post('/api/auth/logout').set('Cookie', r.cookie).set('X-CSRF-Token', r.csrf);
    expect(out.status).toBe(200);
    const res = await request(app).post('/api/auth/refresh').set('Cookie', r.cookie).set('X-CSRF-Token', r.csrf);
    expect(res.status).toBe(401);
  });

  test('logout with a bad CSRF token does not revoke', async () => {
    const r = await register(app);
    const out = await request(app).post('/api/auth/logout').set('Cookie', r.cookie).set('X-CSRF-Token', 'bad');
    expect(out.status).toBe(403);
    const ok = await request(app).post('/api/auth/refresh').set('Cookie', r.cookie).set('X-CSRF-Token', r.csrf);
    expect(ok.status).toBe(200);
  });

  test('an expired refresh token is rejected', async () => {
    const r = await register(app);
    await mongoose.connection.collection('refreshtokens').updateMany({}, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await request(app).post('/api/auth/refresh').set('Cookie', r.cookie).set('X-CSRF-Token', r.csrf);
    expect(res.status).toBe(401);
  });

  test('a password reset ends all existing sessions', async () => {
    const User = require('../models/User');
    const r = await register(app, { email: 'reset@example.com' });
    const user = await User.findOne({ email: 'reset@example.com' });
    const raw = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });
    const reset = await request(app).put(`/api/auth/reset-password/${raw}`).send({ password: 'NewPassw0rd2' });
    expect(reset.status).toBe(200);
    const res = await request(app).post('/api/auth/refresh').set('Cookie', r.cookie).set('X-CSRF-Token', r.csrf);
    expect(res.status).toBe(401);
    const login = await request(app).post('/api/auth/login').send({ email: 'reset@example.com', password: 'NewPassw0rd2' });
    expect(login.status).toBe(200);
  });

  test('a deactivated account cannot refresh', async () => {
    const r = await register(app);
    await mongoose.connection.collection('users').updateMany({}, { $set: { isActive: false } });
    const res = await request(app).post('/api/auth/refresh').set('Cookie', r.cookie).set('X-CSRF-Token', r.csrf);
    expect(res.status).toBe(401);
  });
});
