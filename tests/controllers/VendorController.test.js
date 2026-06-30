const request = require('supertest');
const UserModel = require('../../models/UserModel');
const VendorModel = require('../../models/VendorModel');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET='test-secret-key';
process.env.JWT_EXPIRES_IN = '7d';

const server = require('../../server');

describe('VendorController', () => {
  let app;
  let vendorToken;
  let vendorUser;
  let buyerToken;

  beforeAll(async () => {
    app = server;

    // Create a vendor user
    vendorUser = UserModel.create({
      email: 'vendor-ctrl@example.com',
      password_hash: '$2a$10$dummyhash',
      name: 'Vendor Controller',
      role: 'vendor'
    });

    // Create a buyer user
    const buyerUser = UserModel.create({
      email: 'buyer-ctrl@example.com',
      password_hash: '$2a$10$dummyhash',
      name: 'Buyer Controller',
      role: 'buyer'
    });

    // Get tokens via login
    const jwt = require('jsonwebtoken');
    vendorToken = jwt.sign({ id: vendorUser.id, email: vendorUser.email, role: 'vendor' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    buyerToken = jwt.sign({ id: buyerUser.id, email: buyerUser.email, role: 'buyer' }, process.env.JWT_SECRET, { expiresIn: '7d' });
  });

  afterAll(() => {
    if (app && app.close) app.close();
  });

  describe('POST /api/v1/vendors/profile', () => {
    test('auth vendor can create profile (201)', async () => {
      const res = await request(app)
        .post('/api/v1/vendors/profile')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          company_name: 'My Green Company',
          description: 'We sell green products',
          country: 'US'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.company_name).toBe('My Green Company');
    });

    test('duplicate profile returns 422', async () => {
      const res = await request(app)
        .post('/api/v1/vendors/profile')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          company_name: 'Another Company'
        });

      expect(res.status).toBe(422);
    });

    test('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/v1/vendors/profile')
        .send({ company_name: 'No Auth Company' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/vendors/profile', () => {
    test('auth vendor can get profile (200)', async () => {
      const res = await request(app)
        .get('/api/v1/vendors/profile')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.company_name).toBe('My Green Company');
    });
  });

  describe('PUT /api/v1/vendors/profile', () => {
    test('auth vendor can update profile (200)', async () => {
      const res = await request(app)
        .put('/api/v1/vendors/profile')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          description: 'Updated description'
        });

      expect(res.status).toBe(200);
      expect(res.body.data.description).toBe('Updated description');
    });
  });

  describe('GET /api/v1/vendors', () => {
    test('public can list vendors (200)', async () => {
      const res = await request(app)
        .get('/api/v1/vendors');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
