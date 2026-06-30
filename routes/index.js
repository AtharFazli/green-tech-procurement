const router = require('express').Router();

router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/vendors', require('./vendorRoutes'));
router.use('/products', require('./productRoutes'));
router.use('/categories', require('./categoryRoutes'));
// Future: router.use('/rfps', require('./rfpRoutes'));
// Future: router.use('/bids', require('./bidRoutes'));
// Future: router.use('/dashboard', require('./dashboardRoutes'));

module.exports = router;
