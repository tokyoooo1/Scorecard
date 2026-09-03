const mongoose = require('mongoose');
const { STATES } = require('../config/constants');

const examCenterSchema = new mongoose.Schema({
    centerCode: {
        type:                   String,
        required:               true,
        unique:                 true,
        uppercase:              true,
        trim:                   true,
    },
    name: {
        type: String,
        required: [true, 'Center name is required'],
        trim: true,
    },
    state: {
        type:               String,
        required:           true,
        enum:               STATES,
    },
    lga: {
        type:               String,
        required:           true, 
        trim:               true,
    },
    address: {
        type:               String,
        required:           true,
        trim:               true
    },
    capacity: {
        type:               Number,
        required:           true,
        min:                [100, 'Capacity must be at least 100'],
    },
    registeredCount: { type: Number, defualt: 0},
    isActive: {
        type: Boolean,
        default: true
    },
    coordinator: {
        name: {type: String, trim: true},
        email: {type: String, lowercase: true},
        phone: {type: String} 
    },
    examYear: {
        type: Number,
        default: () => parseInt(process.env.EXAM_YEAR) || new Date().getFullYear(),
    }

}, {timestamps: true});

examCenterSchema.virtual('availableSlot').get(function(){
    return Math.max(0, this.capacity - this.registeredCount);
});

examCenterSchema.virtual('isFull').get(function(){
    return this.registeredCount >= this.capacity;
});
examCenterSchema.index({state: 1, isActive: 1});
examCenterSchema.index({ centerCode: true});

module.exports = mongoose.model('ExamCenter', examCenterSchema);