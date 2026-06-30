const router = require('express').Router();
const { body } = require('express-validator');
const RFPController = require('../controllers/RFPController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');

// Buyer's own RFPs
router.get('/me', auth, allow('buyer'), RFPController.listMyRFPs);

// Public — open RFPs
router.get('/', RFPController.listOpenRFPs);
router.get('/:id', RFPController.getRFP);

// Buyer CRUD
router.post('/', auth, allow('buyer'), [
  body('title').trim().isLength({ min: 3 }),
  body('deadline').isISO8601(),
  body('line_items').isArray({ min: 1 }),
  validate
], RFPController.createRFP);

router.put('/:id', auth, allow('buyer'), RFPController.updateRFP);

// Status transitions
router.patch('/:id/publish', auth, allow('buyer'), RFPController.publishRFP);
router.patch('/:id/cancel', auth, allow('buyer'), RFPController.cancelRFP);

// Award
router.post('/:id/award', auth, allow('buyer'), [
  body('bid_id').isString().notEmpty(),
  validate
], RFPController.awardRFP);

module.exports = router;
