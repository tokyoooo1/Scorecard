const mongoose = require('mongoose');

const resultTokenSchema = new mongoose.Schema({
    serial: {
        type:       String,
        required:   true,
        unique:     true,
        uppercase:  true,
        trim:       true,
    },



    pin: {
        type:       String,
        required:   true,
        select:     false,
    },

    examYear:  {
        type:       Number,
        required:   true,
    },
    isUsed:         { type: Boolean, default: false},
    usedBy:         { type: mongoose.Schema.Types.ObjectId, 
                      ref: 'Candidate'},
    usedAt:         Date,
    usedForReg:     String,
    
    isVoided:       { type: Boolean, default: false},
    voidedBy:       { type: Mongoose.Schema.Types.ObjectId, ref: 'User'},
    voidedAt:       Date,

    batchId:        String,
    generatedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User'},
}, {timestamps: true});


resultTokenSchema.index({ serial: true});
resultTokenSchema.index({ batchId: true});
resultTokenSchema.index({ isUsed: true});


module.exports = mongoose.model('ResultToken', resultTokenSchema);
