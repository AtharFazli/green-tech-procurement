const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '7d';

const server = require('../../server');
const UserModel = require('../../models/UserModel');
const VendorModel = require('../../models/VendorModel');
const RFPModel = require('../../models/RFPModel');
const RFPLineItemModel = require('../../models/RFPLineItemModel');

describe('BidController', () => {
  let app;
  const jwt = require('jsonwebtoken');
  let buyerToken;
  let buyerUser;
  let vendorToken;
  let vendorUser;
  let vendor;
  let rfpId;
  let lineItems;

  beforeAll(async () => {
    app = server;

    buyerUser = UserModel.create({
      email: 'bid-ctrl-buyer@example.com',
      password_hash: '$2a$10$dummyhash',
      name: 'Bid Ctrl Buyer',
      role: 'buyer'
    });
    buyerToken = jwt.sign({ id: buyerUser.id, email: buyerUser.email, role: 'buyer' }, process.env.JWT_SECRET, { expiresIn: '7d' });

    vendorUser = UserModel.create({
      email: 'bid-ctrl-vendor@example.com',
      password_hash: '$2a$10$dummyhash',
      name: 'Bid Ctrl Vendor',
      role: 'vendor'
    });
    vendorToken = jwt.sign({ id: vendorUser.id, email: vendorUser.email, role: 'vendor' }, process.env.JWT_SECRET, { expiresIn: '7d' });

    vendor = VendorModel.create({
      user_id: vendorUser.id,
      company_name: 'Bid Ctrl Vendor Co'
    });

    // Create an open RFP for bidding
    const rfp = RFPModel.create({
      buyer_id: buyerUser.id,
      title: 'Bid Ctrl RFP',
      description: 'Testing bid submission',
      deadline: '2026-12-31T23:59:59.000Z',
      is_green_rfp: true
    });
    rfpId = rfp.id;
    RFPModel.update(rfpId, { status: 'open' });

    lineItems = RFPLineItemModel.bulkCreate(rfpId, [
      { item_name: 'Controller Item A', quantity: 5, unit: 'pcs', estimated_price: 100 }
    ]);
  });

  afterAll(() => {
    if (app && app.close) app.close();
  });

  describe('POST /api/v1/bids/rfps/:rfpId/bids', () => {
    test('auth vendor can submit bid (201)', async () => {
      const res = await request(app)
        .post(`/api/v1/bids/rfps/${rfpId}/bids`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          total_amount: 600,
          delivery_timeline_days: 14,
          sustainability_notes: 'Green packaging',
          carbon_offset_included: true,
          line_items: [
            { rfp_line_item_id: lineItems[0].id, unit_price: 120, quantity: 5 }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.total_amount).toBe(600);
      expect(res.body.data.line_items).toBeDefined();
      expect(res.body.data.line_items.length).toBe(1);
    });

    test('duplicate bid returns 422', async () => {
      const res = await request(app)
        .post(`/api/v1/bids/rfps/${rfpId}/bids`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          total_amount: 700,
          line_items: [
            { rfp_line_item_id: lineItems[0].id, unit_price: 140, quantity: 5 }
          ]
        });

      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/v1/bids/me', () => {
    test('auth vendor can list own bids (200)', async () => {
      const res = await request(app)
        .get('/api/v1/bids/me')
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PATCH /api/v1/bids/:id/status', () => {
    test('buyer can update bid status (200)', async () => {
      // Get the bid ID first
      const bidsRes = await request(app)
        .get(`/api/v1/bids/rfps/${rfpId}/bids`)
        .set('Authorization', `Bearer ${buyerToken}`);

      const bidId = bidsRes.body.data.data[0].id;

      const res = await request(app)
        .patch(`/api/v1/bids/${bidId}/status`)
        .set('Authorization', `Bearer ${buyerToken}`)
        .send({ status: 'under_review' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('under_review');
    });
  });
});
