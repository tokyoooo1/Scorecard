const AppError = require('../utils/AppError');

/** Any request that matches no route lands here and becomes a 404 AppError. */
const notFound = (req, res, next) =>
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));

module.exports = { notFound };
