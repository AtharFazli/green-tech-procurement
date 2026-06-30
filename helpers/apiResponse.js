function success(res, data, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}

function created(res, data, message = 'Created') {
  return res.status(201).json({
    success: true,
    message,
    data
  });
}

function error(res, message = 'Internal Server Error', statusCode = 500, errors = null) {
  const response = {
    success: false,
    message
  };
  if (errors) {
    response.errors = errors;
  }
  return res.status(statusCode).json(response);
}

function notFound(res, message = 'Not Found') {
  return res.status(404).json({
    success: false,
    message
  });
}

function unauthorized(res, message = 'Unauthorized') {
  return res.status(401).json({
    success: false,
    message
  });
}

function forbidden(res, message = 'Forbidden') {
  return res.status(403).json({
    success: false,
    message
  });
}

function validationError(res, errors, message = 'Validation Failed') {
  return res.status(422).json({
    success: false,
    message,
    errors
  });
}

module.exports = { success, created, error, notFound, unauthorized, forbidden, validationError };
