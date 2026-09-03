const { RESULT_STATUS } = require("../config/constants");
const CandidateModel = require("../models/Candidate.model");
const ResultModel = require("../models/Result.model");
const AppError = require("../utils/AppError");
const { generateResultToken } = require("../utils/generateRegNumber")

class ResultService {
    async processResult (data, adminId) {
        const { registrationNumber, subjectScores, examDate, attended } = data;

        const candidate = await CandidateModel.findOne({
            registrationNumber: registrationNumber.toUpperCase(),
        });

        if(!candidate){
            throw new AppError(`Candidate ${registrationNumber} not found`, 404);
        }

        const registeredSubjects = CandidateModel.subjects || [];
        for (const score of subjectScores){
            if (!registeredSubjects.includes(score.subject)) {
                throw new AppError(
                    `Subject "${score.subject}" was not registered by candidate ${registrationNumber}`, 400
                );
            }
        }

        const existing = await ResultModel.findOne({
            registrationNumber: registrationNumber.toUpperCase(),
            examYear: candidate.examYear
        });

        if (existing){
            Object.assign(existing, {
                subjectScores,
                examDate,
                attended,
                status:         RESULT_STATUS.PROCESSED,
                processedBy:    adminId,
                processedAt:    new Date(),
            });

            await existing.save();
            return existing
        }

        const result = await ResultModel.create({
            candidate:          candidate._id,
            registrationNumber: candidate.registrationNumber,
            examYear:           candidate.examYear,
            examType:           candidate.examType,
            examCenter:         candidate.examCenter,
            examCenterCode:     candidate.examCenterCode,
            subjectScores,
            examDate,
            attended:           attend ?? true,
            status:             RESULT_STATUS.PROCESSED,
            processedBy:        adminId,
            processedAt:        new Date(),

        });

        return result;

    }

    async bulk (resultArray, adminId){
        const processed = [];
        const failed = [];

        for (const data of resultArray){
            try{
                const result = await this.processResult(data, adminId);
                processed.push({registrationNumber: data.registrationNumber, id: result._id});

            }catch(err){
                failed.push({registrationNumber: data.registrationNumber, error: err.message});
            }
        }

        return {
            total:              resultArray.length,
            processedCount:     processed.length,
            failedCount:        failed.length,
            processed,
            failed
        };
    }


    async releaseResult (filter, adminId){
        const query = {
            status:     RESULT_STATUS.PROCESSED,
            examYear: filter.examYear || parseInt(process.env.EXAM_YEAR),
        };

        if (filter.examCenterCode) query.examCenterCode = filter.examCenterCode;
        if (filter.registration?.length){
            query.registrationNumber = { $in: filter.registrationNumber};
        }

        const result = await ResultModel.updateMany(
            query,
            {
                $set:  {
                    status:  RESULT_STATUS.RELEASED,
                    releasedBy: adminId,
                    releasedAt:   new Date()
                },
            });

            return  {modifiedCount: result.modifiedCount}
        }

     // ── Withhold a result ──────────────────────────────────────────
  async withholdResult (resultId, reason, adminId) {
    const result = await Result.findByIdAndUpdate(
      resultId,
      {
        status:         RESULT_STATUS.WITHHELD,
        withheldReason: reason,
        processedBy:    adminId,
      },
      { new: true }
    );
    if (!result) throw new AppError('Result not found', 404);
    return result;
  }

  // ── Check result (public — token + reg number method) ─────────
  async checkResultWithToken (registrationNumber, serial, pin) {
    const regNum = registrationNumber.toUpperCase().trim();

    // Find the token
    const token = await ResultToken.findOne({
      serial:   serial.toUpperCase().trim(),
      examYear: parseInt(process.env.EXAM_YEAR),
    }).select('+pin');

    if (!token)           throw new AppError('Invalid token serial number', 400);
    if (token.isVoided)   throw new AppError('This token has been voided', 400);
    if (token.isUsed && token.usedForReg !== regNum) {
      throw new AppError('This token has already been used for a different candidate', 400);
    }

    // Verify PIN
    const pinMatch = await bcrypt.compare(pin, token.pin);
    if (!pinMatch) throw new AppError('Invalid PIN', 400);

    // Fetch result
    const result = await this.getReleasedResult(regNum);

    // Mark token used (if first use)
    if (!token.isUsed) {
      const candidate = await Candidate.findOne({ registrationNumber: regNum });
      await ResultToken.findByIdAndUpdate(token._id, {
        isUsed:     true,
        usedBy:     candidate?._id,
        usedAt:     new Date(),
        usedForReg: regNum,
      });
    }

    // Track view
    await Result.findByIdAndUpdate(result._id, {
      $inc: { resultViewCount: 1 },
      checkingTokenUsed:   true,
      checkingTokenUsedAt: new Date(),
      lastViewedAt:        new Date(),
    });

    return result;
  }

  // ── Check result (public — DOB method as fallback) ────────────
  async checkResultWithDOB (registrationNumber, dateOfBirth) {
    const regNum = registrationNumber.toUpperCase().trim();

    const candidate = await Candidate.findOne({ registrationNumber: regNum });
    if (!candidate) throw new AppError('Registration number not found', 404);

    const dobMatch =
      new Date(candidate.dateOfBirth).toDateString() ===
      new Date(dateOfBirth).toDateString();

    if (!dobMatch) throw new AppError('Date of birth does not match our records', 400);

    const result = await this.getReleasedResult(regNum);

    await Result.findByIdAndUpdate(result._id, {
      $inc: { resultViewCount: 1 },
      lastViewedAt: new Date(),
    });

    return result;
  }

  // ── Fetch a released result with candidate details ─────────────
  async getReleasedResult (registrationNumber) {
    const result = await Result.findOne({
      registrationNumber: registrationNumber.toUpperCase(),
      status: RESULT_STATUS.RELEASED,
    }).populate('candidate', '-password -emailVerifyToken')
      .populate('examCenter', 'name centerCode state address');

    if (!result) {
      // Check if it exists but is withheld/pending
      const anyResult = await Result.findOne({ registrationNumber: registrationNumber.toUpperCase() });
      if (anyResult?.status === RESULT_STATUS.WITHHELD) {
        throw new AppError('Your result has been withheld. Please contact JAMB for assistance.', 403);
      }
      if (anyResult?.status === RESULT_STATUS.PENDING || anyResult?.status === RESULT_STATUS.PROCESSED) {
        throw new AppError('Results for this exam year have not been released yet.', 403);
      }
      throw new AppError('Result not found for this registration number', 404);
    }

    return result;
  }

  // ── Admin: get result by ID ────────────────────────────────────
  async getResultById (id) {
    const result = await Result.findById(id)
      .populate('candidate', '-password')
      .populate('examCenter')
      .populate('processedBy', 'fullName email')
      .populate('releasedBy',  'fullName email');
    if (!result) throw new AppError('Result not found', 404);
    return result;
  }

  // ── Admin: query results ───────────────────────────────────────
  async queryResults ({ status, examYear, examCenter, minScore, maxScore, page = 1, limit = 20 }) {
    const filter = { examYear: examYear || parseInt(process.env.EXAM_YEAR) };
    if (status)     filter.status         = status;
    if (examCenter) filter.examCenterCode = examCenter;
    if (minScore != null || maxScore != null) {
      filter.aggregateScore = {};
      if (minScore != null) filter.aggregateScore.$gte = minScore;
      if (maxScore != null) filter.aggregateScore.$lte = maxScore;
    }

    const [data, total] = await Promise.all([
      Result.find(filter)
        .populate('candidate', 'firstName lastName stateOfOrigin gender')
        .populate('examCenter', 'name centerCode')
        .sort({ aggregateScore: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Result.countDocuments(filter),
    ]);

    return { data, total, page, limit };
  }

  // ── Statistics ─────────────────────────────────────────────────
  async getResultStats (examYear) {
    const year = examYear || parseInt(process.env.EXAM_YEAR);

    const [statusBreakdown, gradeBreakdown, scoreDistribution, topScorers] =
      await Promise.all([
        Result.aggregate([
          { $match: { examYear: year } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        Result.aggregate([
          { $match: { examYear: year, status: RESULT_STATUS.RELEASED } },
          { $group: { _id: '$grade', count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]),
        Result.aggregate([
          { $match: { examYear: year, status: RESULT_STATUS.RELEASED } },
          { $group: {
            _id:      null,
            avgScore: { $avg: '$aggregateScore' },
            maxScore: { $max: '$aggregateScore' },
            minScore: { $min: '$aggregateScore' },
            total:    { $sum: 1 },
            passed:   { $sum: { $cond: [{ $gte: ['$aggregateScore', 140] }, 1, 0] } },
          }},
        ]),
        Result.find({ examYear: year, status: RESULT_STATUS.RELEASED })
          .sort({ aggregateScore: -1 })
          .limit(10)
          .populate('candidate', 'firstName lastName stateOfOrigin'),
      ]);

    return { statusBreakdown, gradeBreakdown, scoreDistribution: scoreDistribution[0], topScorers };
  }

  // ── Generate result checking tokens (scratch cards) ───────────
  async generateTokenBatch (count, adminId, examYear) {
    const year    = examYear || parseInt(process.env.EXAM_YEAR);
    const batchId = `BATCH-${Date.now()}`;
    const tokens  = [];

    for (let i = 0; i < count; i++) {
      const { serial, pin } = generateResultToken();
      const hashedPin = await bcrypt.hash(pin, 10);
      tokens.push({
        serial,
        pin:         hashedPin,
        examYear:    year,
        batchId,
        generatedBy: adminId,
        // Return plain pin ONCE — never stored in plain text again
        _plainPin:   pin,
      });
    }

    // Save to DB (without plain pins)
    const toSave = tokens.map(({ _plainPin, ...rest }) => rest);
    await ResultToken.insertMany(toSave);

    // Return with plain pins for admin to distribute
    return {
      batchId,
      count:  tokens.length,
      tokens: tokens.map(({ serial, _plainPin }) => ({ serial, pin: _plainPin })),
    };
  }

  // ── Track print ────────────────────────────────────────────────
  async trackPrint (resultId) {
    await Result.findByIdAndUpdate(resultId, {
      $inc: { printCount: 1 },
      lastPrintedAt: new Date(),
    });
  }
    }

module.exports = new ResultService()