const apiResponse = require('../helpers/apiResponse');

function allow(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return apiResponse.forbidden(res, 'Insufficient permissions');
    }
    next();
  };
}

module.exports = { allow };
