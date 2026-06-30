const request = require('supertest');
const UserModel = require('../../models/UserModel');
const VendorModel = require('../../models/VendorModel');
const ProductCategoryModel = require('../../models/ProductCategoryModel');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET='test-secret-key';
process.env.JWT_EXPIRES_IN = '7d';

const server = require('../../server');

describe('ProductController', () => {
  let app;
  let vendorToken;
  let vendorUser;
  let otherVendorToken;
  let otherVendorUser;
  let category;
  let createdProductId;

  beforeAll(async () => {
    app = server;

    const jwt = require('jsonwebtoken');

    // Vendor 1
    vendorUser = UserModel.create({
      email: 'prod-ctrl-vendor@example.com',
      password_hash: '$2a$10$dummyhash',
      name: 'Product Vendor',
      role: 'vendor'
    });
    vendorToken = jwt.sign({ id: vendorUser.id, email: vendorUser.email, role: 'vendor' }, process.env.JWT_SECRET, { expiresIn: '7d' });

    VendorModel.create({
      user_id: vendorUser.id,
      company_name: 'Product Vendor Co'
    });

    // Vendor 2 (other)
    otherVendorUser = UserModel.create({
      email: 'other-prod-vendor@example.com',
      password_hash: '$2a$10$dummyhash',
      name: 'Other Vendor',
      role: 'vendor'
    });
    otherVendorToken = jwt.sign({ id: otherVendorUser.id, email: otherVendorUser.email, role: 'vendor' }, process.env.JWT_SECRET, { expiresIn: '7d' });

    VendorModel.create({
      user_id: otherVendorUser.id,
      company_name: 'Other Vendor Co'
    });

    category = ProductCategoryModel.create({
      name: 'Test Category',
      slug: 'test-category'
    });
  });

  afterAll(() => {
    if (app && app.close) app.close();
  });

  describe('POST /api/v1/products/me', () => {
    test('auth vendor can create product (201)', async () => {
      const res = await request(app)
        .post('/api/v1/products/me')
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({
          name: 'Eco Widget',
          slug: 'eco-widget',
          unit: 'piece',
          base_price: 49.99,
          category_id: category.id,
          is_green_certified: true,
          carbon_footprint_kg: 10
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Eco Widget');
      expect(res.body.data.is_green_certified).toBe(1);
      createdProductId = res.body.data.id;
    });
  });

  describe('GET /api/v1/products', () => {
    test('public can browse products (200)', async () => {
      const res = await request(app)
        .get('/api/v1/products');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.data.length).toBeGreaterThanOrEqual(1);
    });

    test('filter by is_green_certified=true returns only green products', async () => {
      const res = await request(app)
        .get('/api/v1/products?is_green_certified=true');

      expect(res.status).toBe(200);
      res.body.data.data.forEach(p => {
        expect(p.is_green_certified).toBe(1);
      });
    });
  });

  describe('PUT /api/v1/products/me/:id', () => {
    test('other vendor gets 403 when updating wrong vendor product', async () => {
      const res = await request(app)
        .put(`/api/v1/products/me/${createdProductId}`)
        .set('Authorization', `Bearer ${otherVendorToken}`)
        .send({ name: 'Hacked Name' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/products/me/:id', () => {
    test('auth vendor can delete own product (200)', async () => {
      const res = await request(app)
        .delete(`/api/v1/products/me/${createdProductId}`)
        .set('Authorization', `Bearer ${vendorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
