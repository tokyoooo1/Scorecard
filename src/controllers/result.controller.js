const resultService = require('../services/result.service');
const pdfService    = require('../services/pdf.service');
const api           = require('../utils/apiResponse');
const AppError      = require('../utils/AppError');
const eventBus      = require('../events/eventBus');
const EVENTS        = require('../events/events');

/**
 * Result controller.
 *
 * Method names here map onto result.service.js exactly as that file defines
 * them (`bulk`, `releaseResult`, `generateTokenBatch` …) — worth noting because
 * some read as abbreviated; they are matched deliberately, not guessed.
 */

// ── Admin: process a single result ────────────────────────────────
exports.processResult = async (req, res, next) => {
  try {
    const result = await resultService.processResult(req.body, req.user?.id);
    api.created(res, { result }, 'Result processed successfully');
  } catch (err) { next(err); }
};

// ── Admin: bulk upload ────────────────────────────────────────────
exports.bulkProcessResults = async (req, res, next) => {
  try {
    if (!Array.isArray(req.body.results) || !req.body.results.length) {
      return next(new AppError('A non-empty "results" array is required', 400));
    }
    const report = await resultService.bulk(req.body.results, req.user?.id);
    api.success(res, { report }, 'Bulk processing complete');
  } catch (err) { next(err); }
};

// ── Admin: release results ────────────────────────────────────────
exports.releaseResults = async (req, res, next) => {
  try {
    const report = await resultService.releaseResult(req.body, req.user?.id);
    api.success(res, { report }, `${report?.modifiedCount ?? 0} result(s) released`);
  } catch (err) { next(err); }
};

// ── Admin: withhold a result ──────────────────────────────────────
exports.withholdResult = async (req, res, next) => {
  try {
    const result = await resultService.withholdResult(req.params.id, req.body.reason, req.user?.id);
    api.success(res, { result }, 'Result withheld');
  } catch (err) { next(err); }
};

// ── Admin: query results ──────────────────────────────────────────
exports.queryResults = async (req, res, next) => {
  try {
    const { status, examYear, examCenter, minScore, maxScore, page = 1, limit = 20 } = req.query;
    const data = await resultService.queryResults({
      status, examCenter,
      examYear: examYear ? Number(examYear) : undefined,
      minScore: minScore != null ? Number(minScore) : undefined,
      maxScore: maxScore != null ? Number(maxScore) : undefined,
      page: Number(page),
      limit: Number(limit),
    });
    api.paginated(res, data);
  } catch (err) { next(err); }
};

// ── Admin: single result ──────────────────────────────────────────
exports.getResult = async (req, res, next) => {
  try {
    const result = await resultService.getResultById(req.params.id);
    api.success(res, { result });
  } catch (err) { next(err); }
};

// ── Admin: statistics ─────────────────────────────────────────────
exports.getResultStats = async (req, res, next) => {
  try {
    const stats = await resultService.getResultStats(
      req.query.year ? Number(req.query.year) : undefined
    );
    api.success(res, { stats });
  } catch (err) { next(err); }
};

// ── Admin: generate result-checking tokens ────────────────────────
exports.generateTokens = async (req, res, next) => {
  try {
    const { count = 100, examYear } = req.body;
    if (Number(count) > 10000) {
      return next(new AppError('Cannot generate more than 10,000 tokens at once', 400));
    }
    const batch = await resultService.generateTokenBatch(Number(count), req.user?.id, examYear);
    api.created(res, { batch }, `${batch?.count ?? 0} result checking tokens generated`);
  } catch (err) { next(err); }
};

// ── Public: check result with scratch-card token ──────────────────
exports.checkResultWithToken = async (req, res, next) => {
  try {
    const { registrationNumber, serial, pin } = req.body;
    if (!registrationNumber || !serial || !pin) {
      return next(new AppError('Registration number, serial, and PIN are required', 400));
    }
    const result = await resultService.checkResultWithToken(registrationNumber, serial, pin);
    eventBus.emitSafe(EVENTS.RESULT_CHECKED, { candidate: result.candidate, result });
    api.success(res, { result }, 'Result retrieved successfully');
  } catch (err) { next(err); }
};

// ── Public: check result with date of birth ───────────────────────
exports.checkResultWithDOB = async (req, res, next) => {
  try {
    const { registrationNumber, dateOfBirth } = req.body;
    if (!registrationNumber || !dateOfBirth) {
      return next(new AppError('Registration number and date of birth are required', 400));
    }
    const result = await resultService.checkResultWithDOB(registrationNumber, dateOfBirth);
    eventBus.emitSafe(EVENTS.RESULT_CHECKED, { candidate: result.candidate, result });
    api.success(res, { result }, 'Result retrieved successfully');
  } catch (err) { next(err); }
};

// ── Public: print result slip (PDF) ───────────────────────────────
exports.printResultSlip = async (req, res, next) => {
  try {
    const { registrationNumber } = req.params;
    const { method, serial, pin, dateOfBirth } = req.query;

    // Re-authenticate before handing over a PDF of someone's result.
    let result;
    if (method === 'token') {
      if (!serial || !pin) {
        return next(new AppError('serial and pin query params are required for method=token', 400));
      }
      result = await resultService.checkResultWithToken(registrationNumber, serial, pin);
    } else {
      if (!dateOfBirth) {
        return next(new AppError('dateOfBirth query param is required', 400));
      }
      result = await resultService.checkResultWithDOB(registrationNumber, dateOfBirth);
    }

    // Emit before the PDF stream commits the response — once pdfService starts
    // writing to res, nothing else may touch it.
    eventBus.emitSafe(EVENTS.RESULT_SLIP_PRINTED, { candidate: result.candidate, result });

    await resultService.trackPrint(result._id);
    await pdfService.generateResultSlip(result, res);
  } catch (err) { next(err); }
};

// ── Admin: print any result slip ──────────────────────────────────
exports.adminPrintResultSlip = async (req, res, next) => {
  try {
    const result = await resultService.getResultById(req.params.id);
    await resultService.trackPrint(result._id);
    await pdfService.generateResultSlip(result, res);
  } catch (err) { next(err); }
};
