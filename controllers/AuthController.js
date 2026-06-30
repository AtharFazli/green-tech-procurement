const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');
const { secret, expiresIn } = require('../config/auth');
const apiResponse = require('../helpers/apiResponse');

const AuthController = {
  // POST /api/v1/auth/register
  async register(req, res, next) {
    try {
      const { email, password, name, role } = req.body;

      // Check existing
      const existing = UserModel.findByEmail(email);
      if (existing) {
        return apiResponse.validationError(res, [{ msg: 'Email already registered', param: 'email' }]);
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      // Create user
      const user = UserModel.create({ email, password_hash, name, role });

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        secret,
        { expiresIn }
      );

      // Set httpOnly cookie
      res.cookie('token', token, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'lax'
      });

      return apiResponse.created(res, {
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role }
      }, 'Registration successful');
    } catch (err) {
      next(err);
    }
  },

  // POST /api/v1/auth/login
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const user = UserModel.findByEmail(email);
      if (!user) {
        return apiResponse.unauthorized(res, 'Invalid email or password');
      }

      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) {
        return apiResponse.unauthorized(res, 'Invalid email or password');
      }

      // Update last_login
      UserModel.update(user.id, { last_login_at: new Date().toISOString() });

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        secret,
        { expiresIn }
      );

      // Set httpOnly cookie
      res.cookie('token', token, {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax'
      });

      return apiResponse.success(res, {
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role }
      }, 'Login successful');
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/auth/me
  async me(req, res, next) {
    try {
      const user = UserModel.findById(req.user.id);
      if (!user) return apiResponse.notFound(res, 'User not found');
      return apiResponse.success(res, {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = AuthController;
