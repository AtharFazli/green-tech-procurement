const request = require('supertest');

// These are already set by tests/setup.js, but ensure they're present
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRES_IN = '7d';

const app = require('../../server');

let buyerToken, vendorToken;
let buyerId, vendorUserId;

beforeAll(async () => {
  // Register buyer
  const buyerRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Dash Ctrl Buyer',
    email: 'dash-ctrl-buyer@test.com',
    password: 'Password123!',
    role: 'buyer'
  });
  buyerToken = buyerRes.body.data.token;
  buyerId = buyerRes.body.data.user.id;

  // Register vendor
  const vendorRes = await request(app).post('/api/v1/auth/register').send({
    name: 'Dash Ctrl Vendor',
    email: 'dash-ctrl-vendor@test.com',
    password: 'Password123!',
    role: 'vendor'
  });
  vendorToken = vendorRes.body.data.token;
  vendorUserId = vendorRes.body.data.user.id;
});

describe('DashboardController', () => {
  test('GET /api/v1/dashboard/stats returns buyer stats (200)', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/stats')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.stats).toBeDefined();
  });

  test('GET /api/v1/dashboard/stats returns vendor stats (200)', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/stats')
      .set('Authorization', `Bearer ${vendorToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.stats).toBeDefined();
  });

  test('GET /api/v1/dashboard/green returns green metrics (200)', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/green')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.green).toBeDefined();
  });

  test('GET /api/v1/dashboard/rfp-trend returns trend (200)', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/rfp-trend')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.data.trend)).toBe(true);
  });

  test('GET /api/v1/dashboard/rfp-breakdown returns breakdown for buyer (200)', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/rfp-breakdown')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.breakdown).toBeDefined();
  });

  test('GET /api/v1/dashboard/rfp-breakdown returns 403 for vendor', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/rfp-breakdown')
      .set('Authorization', `Bearer ${vendorToken}`);
    expect(res.statusCode).toBe(403);
  });

  test('GET /api/v1/dashboard/budget-comparison returns data for buyer (200)', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/budget-comparison')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(res.statusCode).toBe(200);
  });

  test('GET /api/v1/dashboard/budget-comparison returns 403 for vendor', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/budget-comparison')
      .set('Authorization', `Bearer ${vendorToken}`);
    expect(res.statusCode).toBe(403);
  });

  test('GET /api/v1/dashboard/top-vendors returns vendor list (200)', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/top-vendors')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.vendors).toBeDefined();
  });

  test('GET /api/v1/dashboard/activity-feed returns activities (200)', async () => {
    const res = await request(app)
      .get('/api/v1/dashboard/activity-feed')
      .set('Authorization', `Bearer ${buyerToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.activities).toBeDefined();
  });

  test('GET /api/v1/dashboard/stats returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/dashboard/stats');
    expect(res.statusCode).toBe(401);
  });

  test('GET /api/v1/dashboard/green returns 401 without auth', async () => {
    const res = await request(app).get('/api/v1/dashboard/green');
    expect(res.statusCode).toBe(401);
  });
});
