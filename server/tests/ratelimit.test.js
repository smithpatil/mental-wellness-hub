// Brute-force control: 5 failed attempts per 15 minutes per IP + account.
process.env.AUTH_RATE_MAX = '5';
const { startDb, stopDb, clearDb, request, register } = require('./helpers');

let app;
beforeAll(async () => {
  await startDb();
  app = require('../app');
});
afterAll(stopDb);
beforeEach(clearDb);

test('the 6th failed login within the window is rate limited (429)', async () => {
  await register(app, { email: 'rl@example.com' });
  const statuses = [];
  for (let i = 0; i < 6; i += 1) {
    const r = await request(app).post('/api/auth/login').send({ email: 'rl@example.com', password: 'Wrong0000' });
    statuses.push(r.status);
  }
  expect(statuses.slice(0, 5).every((s) => s === 401 || s === 423)).toBe(true);
  expect(statuses[5]).toBe(429);
});

test('the limit is per account: another email is not blocked', async () => {
  await register(app, { email: 'a@example.com' });
  await register(app, { email: 'b@example.com' });
  for (let i = 0; i < 6; i += 1) {
    await request(app).post('/api/auth/login').send({ email: 'a@example.com', password: 'Wrong0000' });
  }
  const ok = await request(app).post('/api/auth/login').send({ email: 'b@example.com', password: 'Passw0rd1' });
  expect(ok.status).toBe(200);
});

test('successful logins do not consume the failure budget', async () => {
  await register(app, { email: 'ok@example.com' });
  for (let i = 0; i < 8; i += 1) {
    const r = await request(app).post('/api/auth/login').send({ email: 'ok@example.com', password: 'Passw0rd1' });
    expect(r.status).toBe(200);
  }
});
