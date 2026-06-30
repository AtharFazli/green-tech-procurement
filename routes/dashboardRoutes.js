const router = require('express').Router();
const DashboardController = require('../controllers/DashboardController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');

// All dashboard endpoints require auth
router.get('/stats', auth, DashboardController.getStats);
router.get('/green', auth, DashboardController.getGreenMetrics);
router.get('/rfp-trend', auth, DashboardController.getRFPTrend);
router.get('/rfp-breakdown', auth, allow('buyer'), DashboardController.getRFPBreakdown);
router.get('/budget-comparison', auth, allow('buyer'), DashboardController.getBudgetComparison);
router.get('/top-vendors', auth, DashboardController.getTopVendors);
router.get('/activity-feed', auth, DashboardController.getActivityFeed);

module.exports = router;
