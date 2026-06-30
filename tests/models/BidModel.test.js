const UserModel = require('../../models/UserModel');
const VendorModel = require('../../models/VendorModel');
const RFPModel = require('../../models/RFPModel');
const RFPLineItemModel = require('../../models/RFPLineItemModel');
const BidModel = require('../../models/BidModel');
const BidLineItemModel = require('../../models/BidLineItemModel');

describe('BidModel', () => {
  let buyerUser;
  let vendorUser;
  let vendor;
  let rfp;
  let lineItems;
  let createdBid;

  beforeAll(() => {
    buyerUser = UserModel.create({
      email: 'bid-model-buyer@example.com',
      password_hash: '$2a$10$dummyhash',
      name: 'Bid Buyer',
      role: 'buyer'
    });

    vendorUser = UserModel.create({
      email: 'bid-model-vendor@example.com',
      password_hash: '$2a$10$dummyhash',
      name: 'Bid Vendor',
      role: 'vendor'
    });

    vendor = VendorModel.create({
      user_id: vendorUser.id,
      company_name: 'Bid Vendor Co'
    });

    rfp = RFPModel.create({
      buyer_id: buyerUser.id,
      title: 'Bid Test RFP',
      description: 'Testing bids',
      deadline: '2026-12-31T23:59:59.000Z',
      is_green_rfp: true
    });

    RFPModel.update(rfp.id, { status: 'open' });

    lineItems = RFPLineItemModel.bulkCreate(rfp.id, [
      { item_name: 'Item A', quantity: 10, unit: 'pcs', estimated_price: 50 },
      { item_name: 'Item B', quantity: 5, unit: 'kg', estimated_price: 100 }
    ]);
  });

  test('create bid', () => {
    createdBid = BidModel.create({
      rfp_id: rfp.id,
      vendor_id: vendor.id,
      total_amount: 1000,
      currency: 'USD',
      delivery_timeline_days: 30,
      sustainability_notes: 'Eco-friendly packaging',
      carbon_offset_included: true
    });

    expect(createdBid).toBeDefined();
    expect(createdBid.id).toBeDefined();
    expect(createdBid.rfp_id).toBe(rfp.id);
    expect(createdBid.vendor_id).toBe(vendor.id);
    expect(createdBid.total_amount).toBe(1000);
    expect(createdBid.status).toBe('submitted');
    expect(createdBid.carbon_offset_included).toBe(1);
  });

  test('findById joins vendor and RFP', () => {
    const found = BidModel.findById(createdBid.id);
    expect(found).toBeDefined();
    expect(found.vendor_name).toBe('Bid Vendor Co');
    expect(found.rfp_title).toBe('Bid Test RFP');
    expect(found.buyer_id).toBe(buyerUser.id);
  });

  test('findByRFP returns all bids for an RFP', () => {
    const bids = BidModel.findByRFP(rfp.id);
    expect(bids.length).toBeGreaterThanOrEqual(1);
    expect(bids[0].vendor_name).toBe('Bid Vendor Co');
  });

  test('findByVendor returns vendor bids', () => {
    const result = BidModel.findByVendor(vendor.id);
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data[0].rfp_title).toBe('Bid Test RFP');
  });

  test('findByBuyer returns bids for buyer RFPs', () => {
    const result = BidModel.findByBuyer(buyerUser.id);
    expect(result.data.length).toBeGreaterThanOrEqual(1);
    expect(result.data[0].vendor_name).toBe('Bid Vendor Co');
  });

  test('update changes status', () => {
    const updated = BidModel.update(createdBid.id, { status: 'under_review' });
    expect(updated.status).toBe('under_review');
  });
});
