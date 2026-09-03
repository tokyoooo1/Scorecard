const mongoose = require('mongoose');
const { MAX_AGGREGATE_SCORE, RESULT_STATUS, GRADE_BOUNDARIES, MINIMUM_PASS_SCORE } = require('../config/constants');

const subjectScoreSchema  = new mongoose.Schema({
    subject:  {type: String, require: true, trim: true},
    rawScore: {type:Number, require: true, min: 0, max: 100},
    scaledScore: { type: Number, min: 0, max: 100}, // after scaling
    grade:      String,
    remark:     String,
}, {_id: false});

const resultSchema = new mongoose.Schema({
    candidate:   {
        type:   mongoose.Schema.Types.ObjectId,
        ref:    'Candidate',
        required: true,
    },

    registrationNumber:  {
        type: String,
        required:  true,
        uppercase: true,
        trim:      true,
    },

    examYear: {
        type:   Number,
        required: true,
    },

    examType: {
        type:    String,
        required:   true,
    },

    examCenter: {
        type: mongoose.Schema.Types.ObjectId,
        ref:  'ExamCenter',
    },

    examCenterCode: String,
    subjectScores: {
        type:       [subjectScoreSchema],
        validate: {
            validator: (arr) => arr.length === 4,
            message: 'Exactly 4 subject scores are required',
        },
    },

    aggregateScore: {
        type: Number,
        min:   0,
        max:   MAX_AGGREGATE_SCORE,
    },
    grade:   String,
    remarks:   String,

    status:  {
        type:   String,
        enum:   Object.values(RESULT_STATUS),
        default:RESULT_STATUS.PENDING,
    },

    withheldReason:  String,
    cancelledReason: String,


    examDate:       Date,
    examStartTime:  String,
    examEndTime:    String,
    attended:       { type: Boolean, default:  false},
    markedAbsent:   { type: Boolean, default: false},

    checkingToken: {
        type: String,
        select: false,
    },

    checkingTokenUsed:   {type: Boolean, default: false},
    checkingTokenUsedAt: Date,
    resultViewCount:     {type: Number, defualt: 0},
    lastViewedAt:        Date,

    printCount:         { type: Number, default: 0},
    lastPrintedAt:      Date,

    admissionStatus: {
        type:       String,
        enum:       ['not_admitted', 'admitted', 'awaiting', 'direct_entry'],
        default:    'not_admitted',
    },


    admittedInstitution:    String,
    admittedCourse:         String,

}, { timestamps: true});

//
resultSchema.pre('save', function (next){
    if (this.subjectScores?.length === 4){
        this.aggregateScore = this.subjectScores.reduce((sum, s) => sum + (s.scaledScore ?? s.rawScore), 0);

        const boundary = GRADE_BOUNDARIES.find(
            (b) => this.aggregateScore >= b.min && this.aggregateScore <= b.max
        );

        this.grade = boundary?.grade ?? 'F';
        this.remarks = boundary?.remark ?? 'Fail';
        
        this.subjectScores.forEach((s) => {
            const score = s.scaledScore ?? s.rawScore;
            if (score >= 70) {s.grade = 'A'; s.remarks = 'Excellent';}
            else if (score >= 60) {s.grade = 'B'; s.remarks = 'Very Good';}
            else if (score >= 50) {s.grade = 'C'; s.remarks = 'Good';}
            else if (score >= 40) {s.grade = 'D'; s.remarks = 'Fair';}
            else if (score >= 30) {s.grade = 'E'; s.remarks = 'Pass';}
            else                  {s.grade = 'F'; s.remarks = 'Fail';}
        });
    }
    next();
});

resultSchema.virtual('isPassed').get(function () {
    return this.aggregateScore >= MINIMUM_PASS_SCORE;
});

resultSchema.index({ registrationNumber: true, examYear: true}, { unique: true});
resultSchema.index({ candidate: true});
resultSchema.index({ status: true, examYear: true});
resultSchema.index({ aggregateScore: -1});
resultSchema.index({ examCenter: true, examYear: true});


resultSchema.set('toJSON', {virtuals: true});

module.exports = mongoose.model('Result', resultSchema);

