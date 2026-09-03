const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const {
    O_LEVEL_QUALIFICATIONS,
    O_LEVEL_GRADES,
    STATES,
    EXAM_TYPES,
    REGISTRATION_STATUS,
    COMPULSORY_SUBJECT
} = require('../config/constants');
//--o'level result schema
const oLevelResultSchema = new mongoose.Schema({
    qualification: {type: String, enum: O_LEVEL_QUALIFICATIONS, required: true},
    examYear: {type: Number, required: true, min: 1990, max: new Date().getFullYear()},
    examNumber: {type: String, required: true, trim: true},
    subjects: [{
        name: {type: String, required:true, trim: true},
        grade: {type: String, required:true, enum: O_LEVEL_GRADES}
    }]
}, {_id:false});
const institutionChoiceSchema = new mongoose.Schema({
    priority:           {type: Number, enum: [1, 2], required: true},
    institutionName:    {type: String, 
        required: true, 
        trim: true},
    institutionCode:    {type: String, required: true, trim: true, uppercase: true},
    course:             {type: String, required: true, trim: true},
    courseCode:         {type: String, required: true, trim: true, uppercase: true},
}, {_id: false})
//--Candidate
const candidateSchema = new mongoose.Schema(
    {
        firstName: {
            type:           String,
            // required:       [true, 'First name is required'],
            trim:           true

        },
        lastName: {
            type:           String,
            // required:       [true, 'Last name is required'],
            trim:           true

        },
        middleName: {
            type:           String,
            trim:           true
        },
        dateOfBirth: {
            type:           Date,
            // required:       [true, 'Date of birth is required'],
            validate: {
                validator(v) {
                    const age = (Date.now() - v)/ (365.25 * 24 * 3600 * 1000);
                    return age>= 15 && age <= 45
                },
                message: 'Candidate must be between 15 and 45 years old'
            },
        },
        gender: {
            type:           String,
            // required:       [true, 'Gender is required'],
            enum:           ['Male', 'Female']
        },
        nationality: {
            type:           String,
            default:        'Nigeria',
            trim:           true
        },
        stateOfOrigin:{
            type:           String,
            // required:       true,
            enum:           STATES
        },
        lgaOfOrigin:{
            type:           String,
            // required:       true,
            trim:           true,
        },
        stateOfResidence:{
            type:           String,
            // required:       true,
            enum:           STATES
        },
        email: {
            type:           String,
            required:       [true, 'Email is required'],
            unique:         true,
            lowercase:      true,
            trim:           true,
            match:          [/^\S+@\S+\.\S+$/, 'Invalid email']
        },
        phone: {
            type:           String,
            required:       [true, 'phone is required'],
             match:          [/^(\+234|0)[789][01]\d{8}$/, 'Invalid Nigerian phone number']
        },
        nin: {
            type:           String,
            trim:           true,
            minlength:      11,
            maxlength:      11,
        },
        examType: {
            type:           String,
            enum:           Object.values(EXAM_TYPES),
            // required:       true,
            default:        EXAM_TYPES.UTME,
        },
        examYear: {
            type:           Number,
            default:        ()=> new Date().getFullYear(),
        },
        //subjects
        subjects: {
            type: [String],
            validate: {
                validator(arr) {
                    return arr.length === 4 && arr.includes(COMPULSORY_SUBJECT);
                },
                message: `Exactly 4 subjects requireed inclusive of "${COMPULSORY_SUBJECT}"`,
            }
        },
        //instituteOfChoice
        institutionChoices: {
            type:       [institutionChoiceSchema],
            // validate: {
            //     validator: (arr) => arr.length >= 1 && arr.length <=2,
            //     message: 'You must choose 1 or 2 institute'
            // },
        },
        //oLevelResults
        oLevelResults: [oLevelResultSchema],
        //examCenter
        examCenter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ExamCenter"
        },
        //examCenterCode
        examCenterCode: {type: String, uppercase: true},
        //exam center name
        examCenterName: {type: String},
        //schedule date,scheduled time,
        scheduleDate: Date,
        scheduleTime: String,

        registrationNumber: {
            type:           String,
            unique:         true,
            sparse:         true,
            uppercase:      true,
            trim:           true,
        },
        profileCode: {
            type:           String,
            unique:         true,
            sparse:         true,
            trim:           true,
        },
        passport:{
            url:            String,
            filename:       String,
        },
        emailVerified: {
            type:           Boolean,
            default:        false,
        },
        emailVerifyToken:   String,
        emailVerifyExpires: Date,
        registrationStatus: {
            type:           String,
            enum:           Object.values(REGISTRATION_STATUS),
            default:        REGISTRATION_STATUS.INITIATED,
        },

        completedSteps:{
            personalInfo:       {type: Boolean, default: false},
            academicInfo:       {type: Boolean, default: false},
            subjectSelection:   {type: Boolean, default: false},
            centerSelection:     {type: Boolean, default: false},
            photoUpload:        {type: Boolean, default: false},
            payment:            {type: Boolean, default: false},
        },
        payment:{
            status:     {type:  String, enum: ['unpaid', 'paid', 'refunded', 'failed', 'pending'],       default: 'unpaid'},
            reference:     String,
            amount:         Number,
            paidAt:         Date,
            method:         String,
            rr:            String,
        },
        setNumber:         String,
        biometricVerified:  {type: Boolean, default: false},
        registeredBy:        {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
        lastModifiedBy:     {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
        notes:              [{text: String, addedBy: String, addAt: {type: Date, default: Date.now}}],
        password: {
            type:           String,
            minlength:      [6, "password must be atleast 6 characters"],
        }
    },{timestamps: true}
);

//Virtuals
candidateSchema.virtual('fullName').get(function(){
    return `${this.lastName} ${this.firstName}${this.middleName? ' ' + this.middleName : ''}`
});

candidateSchema.virtual('age').get(function(){
    return Math.floor((Date.now() - this.dateOfBirth) / (365.25 * 24* 3600 * 1000));
});

candidateSchema.pre('save', async function (next){
    if(!this.isModified('password') || !this.password) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

candidateSchema.methods.comparePassword = async function (candidate) {
    return bcrypt.compare(candidate, this.password);
    
}

// ---- Lets handle indexing -------------
candidateSchema.index({ registrationNumber: true});
candidateSchema.index({ email: true});
candidateSchema.index({ nin: 1});
candidateSchema.index({ phone: 1});
candidateSchema.index({ stateOfOrigin: 1, examYear: 1});
candidateSchema.index({ examCenter: 1, examYear: 1});
candidateSchema.index({ registrationStatus: 1});
candidateSchema.index({ 'payment.status': 1});

//remove password before sdend the candidate/ user to server
candidateSchema.set('toJSON', {
    virtual: true,
    transform: (_, ret) => { delete ret.password; return ret;},
});
module.exports = mongoose.model('Candidate', candidateSchema )
