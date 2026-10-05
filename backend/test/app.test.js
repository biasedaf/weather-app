const { test, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = require('../app');

let mongo;
const EMAIL = 'test@example.com';
const PASSWORD = 'secret123';

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

// --- Critical path: signup -> login ---

test('health endpoint responds ok', async () => {
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { status: 'ok' });
});

test('signup creates user, login works with correct password', async () => {
  const signup = await request(app)
    .post('/api/auth/signup')
    .send({ email: EMAIL, password: PASSWORD, name: 'Test' });
  assert.equal(signup.status, 201);
  assert.equal(signup.body.user.email, EMAIL);
  assert.equal(signup.body.user.password, undefined, 'password hash must not leak in signup response');

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: EMAIL, password: PASSWORD });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.email, EMAIL);
});

test('login rejects wrong password', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: EMAIL, password: 'wrong' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'Invalid password');
});

// --- Boundary / negative input ---

test('signup rejects missing credentials', async () => {
  const res = await request(app).post('/api/auth/signup').send({ email: EMAIL });
  assert.equal(res.status, 400);
});

test('login rejects unknown user', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'nobody@example.com', password: PASSWORD });
  assert.equal(res.status, 404);
});

test('login rejects password auth on SSO-only account', async () => {
  await request(app)
    .post('/api/login')
    .send({ googleId: 'g-123', email: 'google@example.com', name: 'Google User' });

  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'google@example.com', password: PASSWORD });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /Google/);
});

test('SSO upsert endpoint registers user without password', async () => {
  const res = await request(app)
    .post('/api/login')
    .send({ googleId: 'g-456', email: 'second@example.com', name: 'Second' });
  assert.equal(res.status, 200);
  assert.equal(res.body.user.googleId, 'g-456');
  assert.equal(res.body.user.password, null);
});

test('favorites reject missing fields and unknown users', async () => {
  const missing = await request(app)
    .post('/api/favorites')
    .send({ email: EMAIL });
  assert.equal(missing.status, 400);

  const unknown = await request(app)
    .post('/api/favorites')
    .send({ email: 'nobody@example.com', city: 'Tokyo' });
  assert.equal(unknown.status, 404);
});

test('history rejects missing fields', async () => {
  const res = await request(app)
    .post('/api/user/history')
    .send({ email: EMAIL });
  assert.equal(res.status, 400);
});

// --- Persistence / state ---

test('duplicate signup is rejected', async () => {
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ email: EMAIL, password: PASSWORD });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'User already exists');
});

test('favorites round-trip and dedupe', async () => {
  await request(app).post('/api/favorites').send({ email: EMAIL, city: 'Tokyo' });
  await request(app).post('/api/favorites').send({ email: EMAIL, city: 'Tokyo' });
  await request(app).post('/api/favorites').send({ email: EMAIL, city: 'Paris' });

  const res = await request(app).get(`/api/favorites/${EMAIL}`);
  assert.equal(res.status, 200);
  assert.deepEqual(res.body.favorites, ['Tokyo', 'Paris']);
});

test('search history appends and persists', async () => {
  await request(app).post('/api/user/history').send({ email: EMAIL, city: 'Tokyo' });
  await request(app).post('/api/user/history').send({ email: EMAIL, city: 'Paris' });

  const user = await mongoose.model('User').findOne({ email: EMAIL });
  assert.deepEqual(user.searchHistory, ['Tokyo', 'Paris']);
});
