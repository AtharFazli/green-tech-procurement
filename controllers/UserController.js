const UserModel = require('../models/UserModel');
const apiResponse = require('../helpers/apiResponse');

const UserController = {
  // GET /api/v1/users/:id
  getProfile(req, res, next) {
    try {
      // Only allow users to view their own profile unless admin
      if (req.user.id !== req.params.id && req.user.role !== 'admin') {
        return apiResponse.forbidden(res, 'Cannot view another user\'s profile');
      }

      const user = UserModel.findById(req.params.id);
      if (!user) {
        return apiResponse.notFound(res, 'User not found');
      }

      return apiResponse.success(res, {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatar_url,
        is_active: user.is_active,
        created_at: user.created_at
      });
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/v1/users/:id
  updateProfile(req, res, next) {
    try {
      if (req.user.id !== req.params.id && req.user.role !== 'admin') {
        return apiResponse.forbidden(res, 'Cannot update another user\'s profile');
      }

      const { name, avatar_url } = req.body;
      const fields = {};
      if (name !== undefined) fields.name = name;
      if (avatar_url !== undefined) fields.avatar_url = avatar_url;

      const user = UserModel.update(req.params.id, fields);
      if (!user) {
        return apiResponse.notFound(res, 'User not found');
      }

      return apiResponse.success(res, {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatar_url
      }, 'Profile updated');
    } catch (err) {
      next(err);
    }
  },

  // GET /api/v1/users (admin only)
  listUsers(req, res, next) {
    try {
      const { page, limit } = req.query;
      const { rows, total } = UserModel.findAll({
        page: parseInt(page) || 1,
        limit: Math.min(100, parseInt(limit) || 20),
        role: req.query.role
      });

      return apiResponse.success(res, {
        users: rows.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          is_active: u.is_active,
          created_at: u.created_at
        })),
        pagination: {
          page: parseInt(page) || 1,
          limit: Math.min(100, parseInt(limit) || 20),
          total,
          totalPages: Math.ceil(total / Math.min(100, parseInt(limit) || 20))
        }
      });
    } catch (err) {
      next(err);
    }
  }
};

module.exports = UserController;
