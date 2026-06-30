const router = require('express').Router();
const { body } = require('express-validator');
const BidController = require('../controllers/BidController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');

// Vendor's own bids
router.get('/me', auth, allow('vendor'), BidController.listMyBids);

// Submit bid (nested under RFP)
router.post('/rfps/:rfpId/bids', auth, allow('vendor'), [
  body('total_amount').isFloat({ min: 0.01 }),
  body('line_items').isArray({ min: 1 }),
  validate
], BidController.submitBid);

// View bids for an RFP (buyer reviewing)
router.get('/rfps/:rfpId/bids', auth, BidController.listRFPBids);

// Single bid
router.get('/:id', auth, BidController.getBid);

// Status update (buyer)
router.patch('/:id/status', auth, allow('buyer'), BidController.updateBidStatus);

module.exports = router;
