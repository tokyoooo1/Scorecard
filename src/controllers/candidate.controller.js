const candidateService = require("../services/candidate.service");
const pdfService = require("../services/pdf.service");
const api       = require('../utils/apiResponse');
const AppError = require("../utils/AppError");

///initiat reg
exports.initiateRegistration = async (req, res, next) => {
    try{
        const candidate = await candidateService.initiateRegistration(req.body);
        api.created(res, {candidate}, 'Registration initited. Please complete the remaining step.');
    }catch(err){
        next(err);
    }
};

///step2
exports.updateAcademicInfo = async (req, res, next) => {
    try {
        const candidate = await candidateService.updateAcademicInfo(req.params.profileCode, req.body);
        api.success(res, {candidate}, 'Academic Information updated');
    } catch (error) {
        next(error)   
    }
}

//step 3

exports.assignExamCenter = async (req, res, next)=>{
    try {
        const candidate = await candidateService.assignExamCenter(req.params.id, req.body.centerCode);
        api.success(res, {candidate}, 'Exam ceter assigned')
    } catch (err) {
        console.error(err);
    }
}

//step 4
exports.uploadPassportPhoto = async (req, res, next) => {
    try {
        if(!req.file) return next(new Error('Please upload a passport photograph'));
        // if(!req.file) return next(new AppError('Please upload a passport photograph', 400));
        const photoData = {
            url:        req.file.path,
            filename:   req.file.filename,
        };

        const candidate = await candidateService.updatePassportPhoto(req.params.id, photoData);
        api.success(res, {candidate}, 'Passport photo uploaded')
    } catch (err) {
          console.error(err);

    }
    
}


// ── Step 5: Finalize + get reg number ─────────────────────────
exports.finalizeRegistration = async (req, res, next) => {
  try {
    const candidate = await candidateService.finalizeRegistration(req.params.id);
    api.success(res, { candidate }, `Registration complete. Your registration number is ${candidate.registrationNumber}`);
  } catch (err) { next(err); }
};

// ── Get candidate profile ──────────────────────────────────────
exports.getCandidate = async (req, res, next) => {
  try {
    const candidate = await candidateService.findById(req.params.id);
    api.success(res, { candidate });
  } catch (err) { next(err); }
};

exports.getCandidateByRegNumber = async (req, res, next) => {
  try {
    const candidate = await candidateService.findByRegNumber(req.params.regNumber);
    api.success(res, { candidate });
  } catch (err) { next(err); }
};

// ── Search / list ──────────────────────────────────────────────
exports.searchCandidates = async (req, res, next) => {
  try {
    const { query, state, status, year, page = 1, limit = 20 } = req.query;
    const result = await candidateService.search({ query, state, status, year: Number(year), page: Number(page), limit: Number(limit) });
    api.paginated(res, result);
  } catch (err) { next(err); }
};

// ── Stats ──────────────────────────────────────────────────────
exports.getRegistrationStats = async (req, res, next) => {
  try {
    const stats = await candidateService.getStats(Number(req.query.year));
    api.success(res, { stats }, 'Registration statistics retrieved');
  } catch (err) { next(err); }
};

// ── Print examination slip ─────────────────────────────────────
exports.printExaminationSlip = async (req, res, next) => {
  try {
    const candidate = await candidateService.findByRegNumber(req.params.regNumber);
    if (candidate.registrationStatus !== 'complete' && candidate.registrationStatus !== 'verified') {
      return next(new AppError('Registration must be complete before printing the exam slip', 400));
    }
    await pdfService.generateExaminationSlip(candidate, res);
  } catch (err) { next(err); }
};

// ── Admin: update any field ─────────────────────────────────────
exports.adminUpdateCandidate = async (req, res, next) => {
  try {
    const Candidate = require('../models/Candidate.model');
    // Prevent changing sensitive fields directly
    const forbidden = ['registrationNumber', 'password', 'profileCode'];
    forbidden.forEach((f) => delete req.body[f]);

    const candidate = await Candidate.findByIdAndUpdate(req.params.id, req.body, {
      new: true, runValidators: true,
    });
    if (!candidate) return next(new AppError('Candidate not found', 404));
    api.success(res, { candidate }, 'Candidate updated');
  } catch (err) { next(err); }
};
