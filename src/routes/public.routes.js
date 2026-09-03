const router = require('express').Router();
const ctrl   = require('../controllers/result.controller');

/**
 * Public, unauthenticated endpoints for candidates checking their own results.
 * app.js applies a stricter rate limiter to this router (5 req/min) because
 * these are the brute-force surface: guessable reg numbers + dates of birth.
 */
router.post('/results/check/token', ctrl.checkResultWithToken);
router.post('/results/check/dob',   ctrl.checkResultWithDOB);
router.get ('/results/:registrationNumber/print', ctrl.printResultSlip);

module.exports = router;
