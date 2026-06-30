const { validationResult } = require('express-validator');
const apiResponse = require('../helpers/apiResponse');

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return apiResponse.validationError(res, errors.array());
  }
  next();
}

module.exports = { validate };
