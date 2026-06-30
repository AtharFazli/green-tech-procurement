const request = require('supertest');

// Setup test server
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '7d';

const server = require('../../server');

describe('AuthController', () => {
  let app;

  beforeAll(() => {
    app = server;
  });

  afterAll(() => {
    // Close server
    if (app && app.close) {
      app.close();
    }
  });

  describe('POST /api/v1/auth/register', () => {
    const newUser = {
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User',
      role: 'buyer'
    };

    test('should register successfully (201)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(newUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe(newUser.email);
      expect(res.body.data.user.name).toBe(newUser.name);
      expect(res.body.data.user.role).toBe(newUser.role);
    });

    test('should reject duplicate email (422)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(newUser);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    test('should reject invalid data (422)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: '12',
          name: 'A',
          role: 'invalid'
        });

      expect(res.status).toBe(422);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    test('should login successfully (200)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'newuser@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('newuser@example.com');
    });

    test('should reject wrong password (401)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'newuser@example.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('should reject non-existent user (401)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nobody@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    let token;

    beforeAll(async () => {
      // Login to get token
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'newuser@example.com',
          password: 'password123'
        });
      token = res.body.data.token;
    });

    test('should return user with valid token (200)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('newuser@example.com');
    });

    test('should reject without token (401)', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me');

      expect(res.status).toBe(401);
    });
  });
});
