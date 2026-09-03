const router = require('express').Router();
const ctrl   = require('../controllers/result.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

// Every route here is admin-only.
router.post ('/',              protect, adminOnly, ctrl.processResult);
router.post ('/bulk',          protect, adminOnly, ctrl.bulkProcessResults);
router.post ('/release',       protect, adminOnly, ctrl.releaseResults);
router.post ('/tokens/generate', protect, adminOnly, ctrl.generateTokens);

// NOTE: '/stats' must be declared BEFORE '/:id', otherwise Express matches
// "stats" as an :id and the stats endpoint becomes unreachable.
router.get  ('/stats',         protect, adminOnly, ctrl.getResultStats);
router.get  ('/',              protect, adminOnly, ctrl.queryResults);
router.get  ('/:id',           protect, adminOnly, ctrl.getResult);
router.get  ('/:id/print',     protect, adminOnly, ctrl.adminPrintResultSlip);
router.patch('/:id/withhold',  protect, adminOnly, ctrl.withholdResult);

module.exports = router;
