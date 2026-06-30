const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '7d';

const server = require('../../server');
const UserModel = require('../../models/UserModel');
const VendorModel = require('../../models/VendorModel');
const RFPModel = require('../../models/RFPModel');
const RFPLineItemModel = require('../../models/RFPLineItemModel');

describe('RFPController', () => {
  let app;
  const jwt = require('jsonwebtoken');
  let buyerToken;
  let buyerUser;
  let vendorToken;
  let vendorUser;
  let vendor;
  let createdRFPId;

  beforeAll(async () => {
    app = server;

    buyerUser = UserModel.create({
      email: 'rfp-ctrl-buyer@example.com',
      password_hash: '$2a$10$dummyhash',
      name: 'RFP Controller Buyer',
      role: 'buyer'
    });
    buyerToken = jwt.sign({ id: buyerUser.id, email: buyerUser.email, role: 'buyer' }, process.env.JWT_SECRET, { expiresIn: '7d' });

    vendorUser = UserModel.create({
      email: 'rfp-ctrl-vendor@example.com',
      password_hash: '$2a$10$dummyhash',
      name: 'RFP Controller Vendor',
      role: 'vendor'
    });
    vendorToken = jwt.sign({ id: vendorUser.id, email: vendorUser.email, role: 'vendor' }, process.env.JWT_SECRET, { expiresIn: '7d' });

    vendor = VendorModel.create({
      user_id: vendorUser.id,
      company_name: 'RFP Controller Vendor Co'
    });
  });

  afterAll(() => {
    if (app && app.close) app.close();
  });

  describe('POST /api/v1/rfps', () => {
    test('auth buyer can create RFP (201)', async () => {
      const res = await request(app)
        .post('/api/v1/rfps')
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          title: 'Test RFP for Controller',
          description: 'Controller test',
          deadline: '2026-12-31T23:59:59.000Z',
          is_green_rfp: true,
          line_items: [
            { item_name: 'Solar Panel', quantity: 10, unit: 'pcs', estimated_price: 500 }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Test RFP for Controller');
      expect(res.body.data.line_items).toBeDefined();
      expect(res.body.data.line_items.length).toBe(1);
      createdRFPId = res.body.data.id;
    });

    test('auth vendor gets 403', async () => {
      const res = await request(app)
        .post('/api/v1/rfps')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          title: 'Vendor RFP',
          deadline: '2026-12-31T23:59:59.000Z',
          line_items: [{ item_name: 'Item', quantity: 1, unit: 'pcs' }]
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/rfps', () => {
    test('public returns only open RFPs', async () => {
      const res = await request(app)
        .get('/api/v1/rfps');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Our RFP is draft, so it should not appear
      const found = res.body.data.data.filter(r => r.id === createdRFPId);
      expect(found.length).toBe(0);
    });
  });

  describe('PUT /api/v1/rfps/:id', () => {
    test('own buyer can update RFP (200)', async () => {
      const res = await request(app)
        .put(`/api/v1/rfps/${createdRFPId}`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({
          title: 'Updated RFP Title',
          budget_max: 10000
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Updated RFP Title');
    });
  });

  describe('PATCH /api/v1/rfps/:id/publish', () => {
    test('publish draft (200)', async () => {
      const res = await request(app)
        .patch(`/api/v1/rfps/${createdRFPId}/publish`)
        .set('Authorization', `Bearer ${buyerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('open');
    });
  });
});
