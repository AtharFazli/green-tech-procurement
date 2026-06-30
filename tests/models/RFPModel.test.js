const UserModel = require('../../models/UserModel');
const VendorModel = require('../../models/VendorModel');
const RFPModel = require('../../models/RFPModel');

describe('RFPModel', () => {
  let buyerUser;
  let createdRFP;

  beforeAll(() => {
    buyerUser = UserModel.create({
      email: 'rfp-model-buyer@example.com',
      password_hash: '$2a$10$dummyhash',
      name: 'RFP Buyer',
      role: 'buyer'
    });
  });

  test('create RFP with all fields', () => {
    createdRFP = RFPModel.create({
      buyer_id: buyerUser.id,
      title: 'Green Office Supplies',
      description: 'Need eco-friendly office supplies',
      deadline: '2026-12-31T23:59:59.000Z',
      budget_min: 1000,
      budget_max: 5000,
      currency: 'USD',
      sustainability_requirements: 'Must be carbon neutral',
      is_green_rfp: true
    });

    expect(createdRFP).toBeDefined();
    expect(createdRFP.id).toBeDefined();
    expect(createdRFP.title).toBe('Green Office Supplies');
    expect(createdRFP.buyer_id).toBe(buyerUser.id);
    expect(createdRFP.status).toBe('draft');
    expect(createdRFP.is_green_rfp).toBe(1);
    expect(createdRFP.budget_min).toBe(1000);
    expect(createdRFP.budget_max).toBe(5000);
  });

  test('findById joins buyer name', () => {
    const found = RFPModel.findById(createdRFP.id);
    expect(found).toBeDefined();
    expect(found.buyer_name).toBe('RFP Buyer');
    expect(found.title).toBe('Green Office Supplies');
  });

  test('findByBuyer returns buyer RFPs with pagination', () => {
    const result = RFPModel.findByBuyer(buyerUser.id, { page: 1, limit: 10 });
    expect(result.data).toBeDefined();
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.pagination.total).toBeGreaterThanOrEqual(1);
    expect(result.data[0].buyer_name).toBe('RFP Buyer');
  });

  test('findAllOpen returns only status=open', () => {
    // Our RFP is draft, so it shouldn't appear
    const result = RFPModel.findAllOpen({ page: 1, limit: 10 });
    const found = result.data.filter(r => r.id === createdRFP.id);
    expect(found.length).toBe(0);
  });

  test('update changes fields', () => {
    const updated = RFPModel.update(createdRFP.id, { title: 'Updated RFP Title', budget_max: 6000 });
    expect(updated.title).toBe('Updated RFP Title');
    expect(updated.budget_max).toBe(6000);
  });
});
