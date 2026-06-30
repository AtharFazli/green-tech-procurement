const router = require('express').Router();

router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/vendors', require('./vendorRoutes'));
router.use('/products', require('./productRoutes'));
router.use('/categories', require('./categoryRoutes'));
router.use('/rfps', require('./rfpRoutes'));
router.use('/bids', require('./bidRoutes'));
router.use('/activities', require('./activityRoutes'));

module.exports = router;
