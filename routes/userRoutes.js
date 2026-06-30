const router = require('express').Router();
const UserController = require('../controllers/UserController');
const auth = require('../middleware/auth');
const { allow } = require('../middleware/roleCheck');

router.get('/:id', auth, UserController.getProfile);
router.put('/:id', auth, UserController.updateProfile);
router.get('/', auth, allow('admin'), UserController.listUsers);

module.exports = router;
