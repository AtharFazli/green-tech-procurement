const router = require('express').Router();
const { body } = require('express-validator');
const ProductCategoryController = require('../controllers/ProductCategoryController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');
const { validate } = require('../middleware/validate');

// Public
router.get('/', ProductCategoryController.listCategories);
router.get('/:id', ProductCategoryController.getCategory);

// Admin only
router.post('/', auth, allow('admin'), [
  body('name').trim().isLength({ min: 2 }),
  body('slug').trim().isLength({ min: 2 }),
  validate
], ProductCategoryController.createCategory);
router.put('/:id', auth, allow('admin'), ProductCategoryController.updateCategory);
router.delete('/:id', auth, allow('admin'), ProductCategoryController.deleteCategory);

module.exports = router;
