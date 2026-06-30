const router = require('express').Router();
const { body } = require('express-validator');
const ProductController = require('../controllers/ProductController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');

// Vendor's own product management
router.get('/me', auth, allow('vendor'), ProductController.getMyProducts);
router.post('/me', auth, allow('vendor'), [
  body('name').trim().isLength({ min: 2 }),
  body('slug').trim().isLength({ min: 2 }),
  body('unit').trim().notEmpty(),
  body('base_price').isFloat({ min: 0 }),
  validate
], ProductController.createProduct);
router.put('/me/:id', auth, allow('vendor'), ProductController.updateProduct);
router.delete('/me/:id', auth, allow('vendor'), ProductController.deleteProduct);

// Public browse
router.get('/', ProductController.listProducts);
router.get('/:id', ProductController.getProduct);

module.exports = router;
