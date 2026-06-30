const jwt = require('jsonwebtoken');
const { secret } = require('../config/auth');
const apiResponse = require('../helpers/apiResponse');

module.exports = (req, res, next) => {
  let token = null;

  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // Check cookie
  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return apiResponse.unauthorized(res, 'No token provided');
  }

  try {
    const decoded = jwt.verify(token, secret);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch (err) {
    return apiResponse.unauthorized(res, 'Invalid or expired token');
  }
};
