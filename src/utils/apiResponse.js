const success = (res, data = {}, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, ...data });

const created = (res, data = {}, message = 'Created successfully') =>
  success(res, data, message, 201);

const error = (res, message = 'An error occurred', statusCode = 400, errors = null) =>
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
  });

const paginated = (res, { data, total, page, limit }, message = 'Success') =>
  res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total,
      page:       parseInt(page),
      limit:      parseInt(limit),
      totalPages: Math.ceil(total / limit),
      hasNext:    page * limit < total,
      hasPrev:    page > 1,
    },
  });

/**
 * Aliases used by payment.controller.js.
 *
 * Note the argument order differs from `success`/`error` above: the payment
 * controller was written against (res, statusCode, message, data). Rather than
 * rewrite ~16 call sites, we expose helpers with that exact signature. Both
 * styles emit the identical JSON envelope.
 */
const sendSuccess = (res, statusCode = 200, message = 'Success', data = {}) =>
  res.status(statusCode).json({ success: true, message, data });

const sendError = (res, message = 'An error occurred', statusCode = 400, errors = null) =>
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
  });

module.exports = { success, created, error, paginated, sendSuccess, sendError };
