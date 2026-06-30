const router = require('express').Router();
const { body } = require('express-validator');
const VendorController = require('../controllers/VendorController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');

// Protected — vendor only
router.get('/profile', auth, allow('vendor'), VendorController.getMyProfile);
router.post('/profile', auth, allow('vendor'), [
  body('company_name').trim().isLength({ min: 2 }),
  validate
], VendorController.createProfile);
router.put('/profile', auth, allow('vendor'), VendorController.updateProfile);

// Public
router.get('/', VendorController.listVendors);
router.get('/:id', VendorController.getVendor);

module.exports = router;
