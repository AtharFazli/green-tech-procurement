const apiResponse = require('../helpers/apiResponse');

function errorHandler(err, req, res, next) {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal Server Error'
    : err.message;
  apiResponse.error(res, message, statusCode);
}

module.exports = errorHandler;
