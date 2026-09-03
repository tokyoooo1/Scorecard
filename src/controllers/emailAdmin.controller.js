const EmailLog     = require('../models/EmailLog.model');
const emailService = require('../services/email.service');
const api          = require('../utils/apiResponse');
const AppError     = require('../utils/AppError');

/**
 * Admin visibility into the email subsystem.
 *
 * Email sending is fire-and-forget, so without these endpoints a failed
 * notification is invisible: "did the candidate ever get their registration
 * number?" would be unanswerable. These make the async subsystem observable
 * and manually recoverable.
 */

exports.listEmailLogs = async (req, res, next) => {
  try {
    const { status, template, to, page = 1, limit = 30 } = req.query;
    const filter = {};
    if (status)   filter.status   = status;
    if (template) filter.template = template;
    if (to)       filter.to       = new RegExp(to, 'i');

    const [data, total] = await Promise.all([
      EmailLog.find(filter)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit)),
      EmailLog.countDocuments(filter),
    ]);

    api.paginated(res, { data, total, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
};

exports.emailStats = async (req, res, next) => {
  try {
    const [byStatus, byTemplate, last24h] = await Promise.all([
      EmailLog.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      EmailLog.aggregate([
        { $group: { _id: '$template', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      EmailLog.countDocuments({ createdAt: { $gte: new Date(Date.now() - 864e5) } }),
    ]);
    api.success(res, { stats: { byStatus, byTemplate, last24h } });
  } catch (err) { next(err); }
};

/** Force a retry sweep now instead of waiting for the scheduled interval. */
exports.retryFailedNow = async (req, res, next) => {
  try {
    const result = await emailService.retryFailed(Number(req.body?.batchSize) || 50);
    api.success(res, { result }, 'Retry sweep complete');
  } catch (err) { next(err); }
};

/** Resend one specific email — e.g. a candidate says it never arrived. */
exports.resendOne = async (req, res, next) => {
  try {
    const log = await EmailLog.findById(req.params.id).select('+renderContext');
    if (!log) return next(new AppError('Email log not found', 404));

    // Reset the row so the retry sweep picks it up again.
    log.status   = 'failed';
    log.attempts = 0;
    await log.save();

    await emailService.retryFailed(1);
    api.success(res, {}, 'Resend triggered');
  } catch (err) { next(err); }
};
