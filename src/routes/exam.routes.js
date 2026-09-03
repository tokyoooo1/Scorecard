const router = require('express').Router();
const examctrl = require('../controllers/exam.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');

router.post('/',          protect, adminOnly, examctrl.createCenter  );
router.get('/',           examctrl.getCenters);
router.get('/stats',      protect, adminOnly, examctrl.getCenterStats);
router.get('/:code',           examctrl.getCenterByCode);
router.patch('/:id',           protect, adminOnly, examctrl.updateCenter);

module.exports = router;