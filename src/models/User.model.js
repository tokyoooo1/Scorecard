const mongoose = require('mongoose');
const {ROLE, ROLES} = require('../config/constants');
const bcrypt = require('bcryptjs');


const userSchema = new mongoose.Schema({
    fullName:{
        type: String,
        required: [true, 'Full name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 8,
        select: false,
    },
    role: {
        type: String,
        enum: Object.values(ROLES),
        default: ROLES.SUPER_ADMIN,
    },
    isActive: {type: Boolean, default: true},
    lastLogin: Date,
    passwordChangeAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
}, {timestamps: true})

userSchema.pre('save', async function (next){
    if(!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});
userSchema.methods.comparePassword = async function (candidate){
    return bcrypt.compare(candidate, this.password);
};

userSchema.methods.changedPasswordAfter = function (jwtTimestamp) {
    if(this.passwordChangeAt){
        return parseInt(this.passwordChangeAt.getTime() / 1000, 10)> jwtTimestamp
    }
    return false;
} 


userSchema.set('toJSON', {
    transform: (_, ret) => {delete ret.password; return ret;},
});

module.exports = mongoose.model('User', userSchema);
