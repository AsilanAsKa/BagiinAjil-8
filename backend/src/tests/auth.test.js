const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../app');
const { User } = require('../models/User');

let mongoServer;

const donorPayload = {
  name: 'Test Donor',
  phone: '+97699112233',
  email: 'donor@example.com',
  password: 'StrongPass123',
  role: 'donor'
};

async function registerUser(overrides = {}) {
  return request(app)
    .post('/api/auth/register')
    .send({
      ...donorPayload,
      ...overrides
    });
}

async function verifiedLogin(overrides = {}) {
  const registerResponse = await registerUser(overrides);
  const payload = {
    ...donorPayload,
    ...overrides
  };

  await request(app).post('/api/auth/verify-otp').send({
    identifier: payload.email,
    otp: registerResponse.body.devOtp
  });

  return request(app).post('/api/auth/login').send({
    identifier: payload.email,
    password: payload.password
  });
}

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_ACCESS_SECRET = 'test_access_secret';
  process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

beforeEach(async () => {
  await User.deleteMany({});
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Authentication and authorization module', () => {
  test('register success', async () => {
    const response = await registerUser();

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe(donorPayload.email);
    expect(response.body.user.role).toBe('donor');
    expect(response.body.user.password).toBeUndefined();
    expect(response.body.devOtp).toMatch(/^\d{6}$/);
  });

  test('duplicate email', async () => {
    await registerUser();
    const response = await registerUser({ phone: '+97699112234' });

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/already registered/i);
  });

  test('invalid phone', async () => {
    const response = await registerUser({ phone: '123' });

    expect(response.status).toBe(400);
    expect(response.body.errors[0].field).toBe('phone');
  });

  test('OTP verify success', async () => {
    const registerResponse = await registerUser();
    const response = await request(app).post('/api/auth/verify-otp').send({
      identifier: donorPayload.email,
      otp: registerResponse.body.devOtp
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toMatch(/verified/i);
    expect(response.body.user.isVerified).toBe(true);
  });

  test('OTP expired', async () => {
    const registerResponse = await registerUser();
    await User.updateOne(
      { email: donorPayload.email },
      { $set: { 'otp.expiresAt': new Date(Date.now() - 1000) } }
    );

    const response = await request(app).post('/api/auth/verify-otp').send({
      identifier: donorPayload.email,
      otp: registerResponse.body.devOtp
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/expired/i);
  });

  test('OTP 3 failed attempts', async () => {
    await registerUser();

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const response = await request(app).post('/api/auth/verify-otp').send({
        identifier: donorPayload.email,
        otp: '000000'
      });
      expect(response.status).toBe(400);
    }

    const lockedResponse = await request(app).post('/api/auth/verify-otp').send({
      identifier: donorPayload.email,
      otp: '000000'
    });

    expect(lockedResponse.status).toBe(423);
    expect(lockedResponse.body.message).toMatch(/locked/i);
  });

  test('login success', async () => {
    const response = await verifiedLogin();

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBeTruthy();
    expect(response.body.refreshToken).toBeTruthy();
    expect(response.body.user.email).toBe(donorPayload.email);
  });

  test('wrong password', async () => {
    await registerUser();
    const user = await User.findOne({ email: donorPayload.email }).select('+otp.codeHash');
    user.isVerified = true;
    user.otp = undefined;
    await user.save();

    const response = await request(app).post('/api/auth/login').send({
      identifier: donorPayload.email,
      password: 'WrongPass123'
    });

    expect(response.status).toBe(401);
  });

  test('access protected route without token', async () => {
    const response = await request(app).get('/api/users/me');

    expect(response.status).toBe(401);
  });

  test('admin route blocked for non-admin', async () => {
    const loginResponse = await verifiedLogin();

    const response = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`);

    expect(response.status).toBe(403);
  });

  test('refresh token rotates and invalidates old token', async () => {
    const loginResponse = await verifiedLogin();

    const refreshResponse = await request(app).post('/api/auth/refresh').send({
      refreshToken: loginResponse.body.refreshToken
    });

    expect(refreshResponse.status).toBe(200);
    expect(refreshResponse.body.refreshToken).toBeTruthy();
    expect(refreshResponse.body.refreshToken).not.toBe(loginResponse.body.refreshToken);

    const reusedResponse = await request(app).post('/api/auth/refresh').send({
      refreshToken: loginResponse.body.refreshToken
    });

    expect(reusedResponse.status).toBe(401);
  });

  test('logout invalidates refresh token', async () => {
    const loginResponse = await verifiedLogin();

    const logoutResponse = await request(app).post('/api/auth/logout').send({
      refreshToken: loginResponse.body.refreshToken
    });

    expect(logoutResponse.status).toBe(200);

    const refreshResponse = await request(app).post('/api/auth/refresh').send({
      refreshToken: loginResponse.body.refreshToken
    });

    expect(refreshResponse.status).toBe(401);
  });
});
