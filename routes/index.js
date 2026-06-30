const router = require('express').Router();

router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
// Future: router.use('/vendors', require('./vendorRoutes'));
// Future: router.use('/products', require('./productRoutes'));
// Future: router.use('/rfps', require('./rfpRoutes'));
// Future: router.use('/bids', require('./bidRoutes'));
// Future: router.use('/dashboard', require('./dashboardRoutes'));

module.exports = router;
