const router = require('express').Router();
const ctrl   = require('../controllers/emailAdmin.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

router.use(protect, adminOnly);

router.get ('/logs',            ctrl.listEmailLogs);
router.get ('/stats',           ctrl.emailStats);
router.post('/retry',           ctrl.retryFailedNow);
router.post('/logs/:id/resend', ctrl.resendOne);

module.exports = router;
