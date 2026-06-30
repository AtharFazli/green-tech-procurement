const RFPModel = require('../models/RFPModel');
const RFPLineItemModel = require('../models/RFPLineItemModel');
const BidModel = require('../models/BidModel');
const ActivityLogModel = require('../models/ActivityLogModel');
const apiResponse = require('../helpers/apiResponse');
const { getPagination } = require('../helpers/pagination');

module.exports = {
  listMyRFPs(req, res, next) {
    try {
      const { page, limit } = getPagination(req.query);
      const result = RFPModel.findByBuyer(req.user.id, { page, limit, status: req.query.status });
      apiResponse.success(res, result);
    } catch (err) { next(err); }
  },

  listOpenRFPs(req, res, next) {
    try {
      const { page, limit } = getPagination(req.query);
      const result = RFPModel.findAllOpen({
        page, limit,
        is_green_rfp: req.query.is_green_rfp !== undefined ? req.query.is_green_rfp === 'true' : undefined,
        search: req.query.search
      });
      apiResponse.success(res, result);
    } catch (err) { next(err); }
  },

  getRFP(req, res, next) {
    try {
      const rfp = RFPModel.findById(req.params.id);
      if (!rfp) return apiResponse.notFound(res, 'RFP not found');
      const lineItems = RFPLineItemModel.findByRFP(req.params.id);
      let bids = null;
      // Include bids if viewer is buyer who owns this RFP, or if RFP is awarded
      if (req.user && rfp.buyer_id === req.user.id) {
        bids = BidModel.findByRFP(req.params.id);
      } else if (rfp.status === 'awarded') {
        bids = BidModel.findByRFP(req.params.id);
      }
      apiResponse.success(res, { ...rfp, line_items: lineItems, bids });
    } catch (err) { next(err); }
  },

  createRFP(req, res, next) {
    try {
      const { title, description, deadline, budget_min, budget_max, currency, sustainability_requirements, is_green_rfp, line_items } = req.body;
      const rfp = RFPModel.create({
        buyer_id: req.user.id, title, description, deadline, budget_min, budget_max, currency, sustainability_requirements, is_green_rfp
      });
      RFPLineItemModel.bulkCreate(rfp.id, line_items);
      ActivityLogModel.log(req.user.id, 'rfp_created', 'rfp', rfp.id, { title });
      const full = RFPModel.findById(rfp.id);
      full.line_items = RFPLineItemModel.findByRFP(rfp.id);
      apiResponse.created(res, full);
    } catch (err) { next(err); }
  },

  updateRFP(req, res, next) {
    try {
      const rfp = RFPModel.findById(req.params.id);
      if (!rfp) return apiResponse.notFound(res, 'RFP not found');
      if (rfp.buyer_id !== req.user.id) return apiResponse.forbidden(res, 'Not your RFP');
      if (rfp.status !== 'draft') return apiResponse.error(res, 'Can only edit draft RFPs', 400);

      const { title, description, deadline, budget_min, budget_max, currency, sustainability_requirements, is_green_rfp, line_items } = req.body;
      const updated = RFPModel.update(req.params.id, {
        title, description, deadline, budget_min, budget_max, currency, sustainability_requirements, is_green_rfp
      });
      if (line_items) {
        RFPLineItemModel.deleteByRFP(req.params.id);
        RFPLineItemModel.bulkCreate(req.params.id, line_items);
      }
      updated.line_items = RFPLineItemModel.findByRFP(req.params.id);
      ActivityLogModel.log(req.user.id, 'rfp_updated', 'rfp', updated.id, { title });
      apiResponse.success(res, updated);
    } catch (err) { next(err); }
  },

  publishRFP(req, res, next) {
    try {
      const rfp = RFPModel.findById(req.params.id);
      if (!rfp) return apiResponse.notFound(res, 'RFP not found');
      if (rfp.buyer_id !== req.user.id) return apiResponse.forbidden(res, 'Not your RFP');
      if (rfp.status !== 'draft') return apiResponse.error(res, 'RFP is not in draft status', 400);

      const updated = RFPModel.update(req.params.id, { status: 'open' });
      ActivityLogModel.log(req.user.id, 'rfp_published', 'rfp', updated.id, { title: updated.title });
      apiResponse.success(res, updated);
    } catch (err) { next(err); }
  },

  cancelRFP(req, res, next) {
    try {
      const rfp = RFPModel.findById(req.params.id);
      if (!rfp) return apiResponse.notFound(res, 'RFP not found');
      if (rfp.buyer_id !== req.user.id) return apiResponse.forbidden(res, 'Not your RFP');
      if (rfp.status === 'awarded' || rfp.status === 'cancelled') return apiResponse.error(res, 'Cannot cancel RFP in current status', 400);

      const updated = RFPModel.update(req.params.id, { status: 'cancelled' });
      ActivityLogModel.log(req.user.id, 'rfp_cancelled', 'rfp', updated.id, { title: updated.title });
      apiResponse.success(res, updated);
    } catch (err) { next(err); }
  },

  awardRFP(req, res, next) {
    try {
      const rfp = RFPModel.findById(req.params.id);
      if (!rfp) return apiResponse.notFound(res, 'RFP not found');
      if (rfp.buyer_id !== req.user.id) return apiResponse.forbidden(res, 'Not your RFP');
      if (rfp.status !== 'under_review') return apiResponse.error(res, 'RFP must be under review to award', 400);

      const { bid_id } = req.body;
      const bid = BidModel.findById(bid_id);
      if (!bid) return apiResponse.notFound(res, 'Bid not found');
      if (bid.rfp_id !== req.params.id) return apiResponse.error(res, 'Bid does not belong to this RFP', 400);

      const db = require('../config/db');
      const awardTransaction = db.transaction(() => {
        RFPModel.update(req.params.id, { status: 'awarded', awarded_bid_id: bid_id });
        BidModel.update(bid_id, { is_winner: 1 });
        // Reject all other bids for this RFP
        const otherBids = db.prepare('SELECT id FROM bids WHERE rfp_id = ? AND id != ?').all(req.params.id, bid_id);
        for (const ob of otherBids) {
          BidModel.update(ob.id, { status: 'rejected' });
        }
      });
      awardTransaction();

      ActivityLogModel.log(req.user.id, 'rfp_awarded', 'rfp', rfp.id, { title: rfp.title, winning_bid: bid_id, vendor_name: bid.vendor_name });
      const updated = RFPModel.findById(req.params.id);
      apiResponse.success(res, updated);
    } catch (err) { next(err); }
  }
};
