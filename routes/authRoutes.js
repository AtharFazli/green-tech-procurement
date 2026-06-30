const router = require('express').Router();
const { body } = require('express-validator');
const AuthController = require('../controllers/AuthController');
const { validate } = require('../middleware/validate');
const auth = require('../middleware/auth');

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').trim().isLength({ min: 2 }),
  body('role').isIn(['buyer', 'vendor']),
  validate
], AuthController.register);

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate
], AuthController.login);

router.get('/me', auth, AuthController.me);

module.exports = router;
