const ActivityLogModel = require('../models/ActivityLogModel');
const apiResponse = require('../helpers/apiResponse');

module.exports = {
  getRecent(req, res, next) {
    try {
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const activities = ActivityLogModel.findRecent(limit);
      apiResponse.success(res, { data: activities });
    } catch (err) { next(err); }
  }
};
