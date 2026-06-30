const DashboardModel = require('../models/DashboardModel');
const apiResponse = require('../helpers/apiResponse');
const ActivityLogModel = require('../models/ActivityLogModel');

module.exports = {
  // GET /api/v1/dashboard/stats
  getStats(req, res, next) {
    try {
      const { role, id } = req.user;
      let stats;

      if (role === 'buyer') {
        stats = DashboardModel.getBuyerStats(id);
      } else if (role === 'vendor') {
        stats = DashboardModel.getVendorStats(id);
      } else {
        stats = DashboardModel.getAdminStats();
      }

      apiResponse.success(res, { stats });
    } catch (err) { next(err); }
  },

  // GET /api/v1/dashboard/green
  getGreenMetrics(req, res, next) {
    try {
      const green = DashboardModel.getGreenStats(req.user.id, req.user.role);
      apiResponse.success(res, { green });
    } catch (err) { next(err); }
  },

  // GET /api/v1/dashboard/rfp-trend
  getRFPTrend(req, res, next) {
    try {
      const trend = DashboardModel.getRFPTrend(req.user.id, req.user.role);
      apiResponse.success(res, { trend });
    } catch (err) { next(err); }
  },

  // GET /api/v1/dashboard/rfp-breakdown (buyer only — enforced by route role check)
  getRFPBreakdown(req, res, next) {
    try {
      const breakdown = DashboardModel.getRFPStatusBreakdown(req.user.id);
      apiResponse.success(res, { breakdown });
    } catch (err) { next(err); }
  },

  // GET /api/v1/dashboard/budget-comparison (buyer only — enforced by route role check)
  getBudgetComparison(req, res, next) {
    try {
      const comparison = DashboardModel.getBudgetComparison(req.user.id);
      apiResponse.success(res, { comparison });
    } catch (err) { next(err); }
  },

  // GET /api/v1/dashboard/top-vendors
  getTopVendors(req, res, next) {
    try {
      const vendors = DashboardModel.getTopVendors(parseInt(req.query.limit) || 5);
      apiResponse.success(res, { vendors });
    } catch (err) { next(err); }
  },

  // GET /api/v1/dashboard/activity-feed
  getActivityFeed(req, res, next) {
    try {
      const activities = ActivityLogModel.findRecent(parseInt(req.query.limit) || 20);
      apiResponse.success(res, { activities });
    } catch (err) { next(err); }
  }
};
