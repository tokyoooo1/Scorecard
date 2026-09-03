const router     = require('express').Router();
const User       = require('../models/User.model');
const Candidate  = require('../models/Candidate.model');
const Result     = require('../models/Result.model');
const ExamCenter = require('../models/ExamCenter.model');
const api        = require('../utils/apiResponse');
const AppError   = require('../utils/AppError');
const { protect, adminOnly } = require('../middleware/auth.middleware');

// Everything below requires an authenticated admin.
router.use(protect, adminOnly);

// ── Dashboard overview ────────────────────────────────────────────
router.get('/dashboard', async (req, res, next) => {
  try {
    const year = Number(req.query.year) || Number(process.env.EXAM_YEAR) || new Date().getFullYear();

    const [
      totalCandidates, completedReg, totalResults,
      releasedResults, totalCenters, recentRegistrations,
    ] = await Promise.all([
      Candidate.countDocuments({ examYear: year }),
      Candidate.countDocuments({ examYear: year, registrationStatus: 'complete' }),
      Result.countDocuments({ examYear: year }),
      Result.countDocuments({ examYear: year, status: 'released' }),
      ExamCenter.countDocuments({ isActive: true }),
      Candidate.find({ examYear: year })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('firstName lastName registrationNumber registrationStatus stateOfOrigin createdAt'),
    ]);

    api.success(res, {
      dashboard: {
        examYear: year,
        candidates: {
          total: totalCandidates,
          completed: completedReg,
          pending: totalCandidates - completedReg,
        },
        results: {
          total: totalResults,
          released: releasedResults,
          pending: totalResults - releasedResults,
        },
        totalActiveCenters: totalCenters,
        recentRegistrations,
      },
    });
  } catch (err) { next(err); }
});

// ── User management ───────────────────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    api.success(res, { users });
  } catch (err) { next(err); }
});

router.patch('/users/:id/toggle-active', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError('User not found', 404));
    user.isActive = !user.isActive;
    await user.save();
    api.success(res, { user }, `User ${user.isActive ? 'activated' : 'deactivated'}`);
  } catch (err) { next(err); }
});

module.exports = router;
