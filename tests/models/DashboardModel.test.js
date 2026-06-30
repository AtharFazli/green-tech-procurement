const DashboardModel = require('../../models/DashboardModel');
const db = require('../../config/db');
const { generateUUID } = require('../../helpers/uuid');

let buyerId, vendorUserId, vendorId, rfpId, bidId;

beforeAll(() => {
  buyerId = 'dash-buyer-' + generateUUID().substring(0, 8);
  vendorUserId = 'dash-vendor-user-' + generateUUID().substring(0, 8);
  vendorId = 'dash-vendor-' + generateUUID().substring(0, 8);
  rfpId = 'dash-rfp-' + generateUUID().substring(0, 8);
  bidId = 'dash-bid-' + generateUUID().substring(0, 8);

  // Create buyer user
  db.prepare(`INSERT OR IGNORE INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`).run(buyerId, 'Dash Test Buyer', `dashbuyer${buyerId}@test.com`, '$2b$10$dummyhash', 'buyer');
  // Create vendor user
  db.prepare(`INSERT OR IGNORE INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`).run(vendorUserId, 'Dash Test Vendor', `dashvendor${vendorUserId}@test.com`, '$2b$10$dummyhash', 'vendor');
  // Create vendor profile
  db.prepare(`INSERT OR IGNORE INTO vendors (id, user_id, company_name, sustainability_score, is_approved) VALUES (?, ?, ?, ?, ?)`).run(vendorId, vendorUserId, 'DashGreenCo', 90, 1);
  // Create products
  db.prepare(`INSERT OR IGNORE INTO products (id, vendor_id, name, slug, unit, base_price, is_green_certified, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run('dash-prod-1', vendorId, 'Solar Panel', 'solar-panel-dash', 'pcs', 500, 1, 'active');
  db.prepare(`INSERT OR IGNORE INTO products (id, vendor_id, name, slug, unit, base_price, is_green_certified, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run('dash-prod-2', vendorId, 'Battery', 'battery-dash', 'pcs', 200, 0, 'active');
  // Create RFPs
  db.prepare(`INSERT OR IGNORE INTO rfps (id, buyer_id, title, status, is_green_rfp, deadline) VALUES (?, ?, ?, ?, ?, ?)`).run(rfpId, buyerId, 'Dashboard Solar RFP', 'open', 1, '2026-12-31T23:59:59.000Z');
  db.prepare(`INSERT OR IGNORE INTO rfps (id, buyer_id, title, status, is_green_rfp, deadline) VALUES (?, ?, ?, ?, ?, ?)`).run('dash-rfp-2', buyerId, 'Dashboard Office RFP', 'draft', 0, '2026-06-30T23:59:59.000Z');
  // Create a bid
  db.prepare(`INSERT OR IGNORE INTO bids (id, rfp_id, vendor_id, status, total_amount, is_winner) VALUES (?, ?, ?, ?, ?, ?)`).run(bidId, rfpId, vendorId, 'submitted', 4800, 0);
  // Create an activity log entry
  db.prepare(`INSERT OR IGNORE INTO activity_logs (id, user_id, action, entity_type, entity_id, metadata) VALUES (?, ?, ?, ?, ?, ?)`).run('dash-act-1', buyerId, 'rfp_created', 'rfp', rfpId, '{}');
});

describe('DashboardModel', () => {
  test('getBuyerStats returns correct counts', () => {
    const stats = DashboardModel.getBuyerStats(buyerId);
    expect(stats.totalRfps).toBe(2);
    expect(stats.activeRfps).toBe(1);
    expect(stats.completedRfps).toBe(0);
    expect(stats.totalBids).toBe(1);
  });

  test('getGreenStats for buyer returns green metrics', () => {
    const green = DashboardModel.getGreenStats(buyerId, 'buyer');
    expect(green.greenRfps).toBe(1);
    expect(green.totalRfps).toBe(2);
    expect(green.greenAwarded).toBe(0);
  });

  test('getGreenStats for vendor returns product metrics', () => {
    const green = DashboardModel.getGreenStats(vendorUserId, 'vendor');
    expect(green.greenProducts).toBe(1);
    expect(green.totalProducts).toBe(2);
  });

  test('getGreenStats for admin returns platform metrics', () => {
    const green = DashboardModel.getGreenStats(null, 'admin');
    expect(green.greenRfps).toBeGreaterThanOrEqual(1);
    expect(green.totalRfps).toBeGreaterThanOrEqual(2);
    expect(green.greenProducts).toBeGreaterThanOrEqual(1);
    expect(green.totalProducts).toBeGreaterThanOrEqual(2);
  });

  test('getRFPStatusBreakdown returns grouped counts', () => {
    const breakdown = DashboardModel.getRFPStatusBreakdown(buyerId);
    expect(breakdown.length).toBeGreaterThanOrEqual(2);
    const openItem = breakdown.find(b => b.status === 'open');
    expect(openItem).toBeDefined();
    expect(openItem.count).toBe(1);
  });

  test('getRFPTrend returns array', () => {
    const trend = DashboardModel.getRFPTrend(buyerId, 'buyer');
    expect(Array.isArray(trend)).toBe(true);
  });

  test('getTopVendors returns ranked vendors', () => {
    const vendors = DashboardModel.getTopVendors(5);
    expect(vendors.length).toBeGreaterThanOrEqual(1);
    expect(vendors[0].company_name).toBe('DashGreenCo');
  });

  test('getBudgetComparison returns awarded RFPs', () => {
    const comparison = DashboardModel.getBudgetComparison(buyerId);
    expect(Array.isArray(comparison)).toBe(true);
  });

  test('getVendorStats returns vendor metrics', () => {
    const stats = DashboardModel.getVendorStats(vendorUserId);
    expect(stats.totalBids).toBe(1);
    expect(stats.totalProducts).toBe(2);
    expect(stats.greenProducts).toBe(1);
    expect(stats.winRate).toBe(0);
  });

  test('getVendorStats returns null for non-vendor user', () => {
    const stats = DashboardModel.getVendorStats(buyerId);
    expect(stats).toBeNull();
  });

  test('getAdminStats returns platform totals', () => {
    const stats = DashboardModel.getAdminStats();
    expect(stats.totalUsers).toBeGreaterThanOrEqual(2);
    expect(stats.totalVendors).toBeGreaterThanOrEqual(1);
    expect(stats.totalProducts).toBeGreaterThanOrEqual(2);
    expect(stats.totalRfps).toBeGreaterThanOrEqual(2);
    expect(stats.totalBids).toBeGreaterThanOrEqual(1);
  });
});
