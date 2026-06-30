const BidModel = require('../models/BidModel');
const BidLineItemModel = require('../models/BidLineItemModel');
const RFPModel = require('../models/RFPModel');
const VendorModel = require('../models/VendorModel');
const ActivityLogModel = require('../models/ActivityLogModel');
const apiResponse = require('../helpers/apiResponse');
const { getPagination } = require('../helpers/pagination');
const db = require('../config/db');

module.exports = {
  submitBid(req, res, next) {
    try {
      const { rfpId } = req.params;
      const rfp = RFPModel.findById(rfpId);
      if (!rfp) return apiResponse.notFound(res, 'RFP not found');
      if (rfp.status !== 'open') return apiResponse.error(res, 'RFP is not open for bids', 400);

      // Check deadline
      if (new Date(rfp.deadline) < new Date()) return apiResponse.error(res, 'RFP deadline has passed', 400);

      // Get vendor profile
      const vendor = VendorModel.findByUserId(req.user.id);
      if (!vendor) return apiResponse.error(res, 'Vendor profile not found. Complete your vendor profile first.', 400);

      // Check unique bid constraint
      const existing = db.prepare('SELECT id FROM bids WHERE rfp_id = ? AND vendor_id = ?').get(rfpId, vendor.id);
      if (existing) return apiResponse.error(res, 'You have already submitted a bid for this RFP', 422);

      const { total_amount, currency, delivery_timeline_days, sustainability_notes, carbon_offset_included, notes, line_items } = req.body;

      const submitTransaction = db.transaction(() => {
        const bid = BidModel.create({
          rfp_id: rfpId, vendor_id: vendor.id, total_amount, currency, delivery_timeline_days, sustainability_notes, carbon_offset_included, notes
        });
        BidLineItemModel.bulkCreate(bid.id, line_items);
        return bid;
      });
      const bid = submitTransaction();

      ActivityLogModel.log(req.user.id, 'bid_submitted', 'bid', bid.id, { rfp_title: rfp.title, total_amount });
      const full = BidModel.findById(bid.id);
      full.line_items = BidLineItemModel.findByBid(bid.id);
      apiResponse.created(res, full);
    } catch (err) {
      // Handle UNIQUE constraint gracefully
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return apiResponse.error(res, 'You have already submitted a bid for this RFP', 422);
      }
      next(err);
    }
  },

  listMyBids(req, res, next) {
    try {
      const { page, limit } = getPagination(req.query);
      const vendor = VendorModel.findByUserId(req.user.id);
      if (!vendor) return apiResponse.success(res, { data: [], pagination: { page, limit, total: 0, totalPages: 0 } });
      const result = BidModel.findByVendor(vendor.id, { page, limit });
      apiResponse.success(res, result);
    } catch (err) { next(err); }
  },

  listRFPBids(req, res, next) {
    try {
      const rfp = RFPModel.findById(req.params.rfpId);
      if (!rfp) return apiResponse.notFound(res, 'RFP not found');
      // Buyer who owns RFP can see all bids
      if (rfp.buyer_id !== req.user.id) return apiResponse.forbidden(res, 'Not your RFP');
      const bids = BidModel.findByRFP(req.params.rfpId);
      apiResponse.success(res, { data: bids });
    } catch (err) { next(err); }
  },

  getBid(req, res, next) {
    try {
      const bid = BidModel.findById(req.params.id);
      if (!bid) return apiResponse.notFound(res, 'Bid not found');

      // Check access: buyer who owns RFP, or vendor who submitted
      const vendor = VendorModel.findByUserId(req.user.id);
      const isOwnVendor = vendor && bid.vendor_id === vendor.id;
      const isBuyer = bid.buyer_id === req.user.id;

      if (!isOwnVendor && !isBuyer) return apiResponse.forbidden(res, 'Access denied');

      const lineItems = BidLineItemModel.findByBid(req.params.id);
      apiResponse.success(res, { ...bid, line_items: lineItems });
    } catch (err) { next(err); }
  },

  updateBidStatus(req, res, next) {
    try {
      const bid = BidModel.findById(req.params.id);
      if (!bid) return apiResponse.notFound(res, 'Bid not found');

      const rfp = RFPModel.findById(bid.rfp_id);
      if (!rfp) return apiResponse.notFound(res, 'RFP not found');
      if (rfp.buyer_id !== req.user.id) return apiResponse.forbidden(res, 'Not your RFP');

      const { status } = req.body;
      const allowedStatuses = ['under_review', 'accepted', 'rejected'];
      if (!allowedStatuses.includes(status)) return apiResponse.error(res, 'Invalid status', 400);

      const updated = BidModel.update(req.params.id, { status });

      // If moving to under_review, also update RFP to under_review
      if (status === 'under_review' && rfp.status === 'open') {
        RFPModel.update(bid.rfp_id, { status: 'under_review' });
      }

      ActivityLogModel.log(req.user.id, 'bid_status_changed', 'bid', bid.id, { old_status: bid.status, new_status: status });
      apiResponse.success(res, updated);
    } catch (err) { next(err); }
  }
};
