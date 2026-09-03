const User = require('../models/User.model');
const api  = require('../utils/apiResponse')
const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const eventBus = require('../events/eventBus');
const EVENTS   = require('../events/events');
//reg

const signToken = (id)=> jwt.sign({id}, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRES_IN});

exports.register = async (req, res, next)=> {
    try{
        const {fullName, email, password, role} = req.body;
        const existing = await User.findOne({email});
        if(existing) return next(new AppError('Email already in used', 409));

        const user = await User.create({ fullName, email, password, role});
       const token = signToken(user._id);
        //const token = 'tokenizedtoken';

        api.created(res, { token, user}, 'Admin account created');
    }catch(err){
        next(err);
    }
}
//login - sign jwt
exports.login = async (req, res, next) => {
    try{
        const {email, password} = req.body;
        if (!email || ! password) return next(new AppError('Email and password are required',400));
        const user = await User.findOne({email}).select('+password');
        if(!user || !(user.comparePassword(password))){
            return next(new AppError('Invalid email or passwor', 401));
        }

        if (!user.isActive) return next(new AppError('Acccount deactivated. Contact support.', 401));
         await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

         const token = signToken(user._id, {lastLogin: new Date()});

         const {password: _, ...userData} = user.toJSON();

    eventBus.emitSafe(EVENTS.USER_LOGGED_IN, {
      user,
      ip:     req.ip,
      device: req.headers['user-agent'],
    });

         api.success(res, {token, user: userData}, 'Login successful');
    }catch(err){
        next(err);
    }
}
//getprofile
exports.getMe = async (req,  res, next) => {
    try{
        const user = await User.findById(req.user.id);
        api.success(res, {user}, 'Profile retrieved' )
    }catch(err){
        next(err);
    }
}

//change password
exports.changePassword = async (req, res, next) => {
    try{
        const { currentPassword, newPassword} = req.body;
        const user = await User.findById(req.user.id).select('+password');

        if(!(await user.comparePassword(currentPassword))) {
            return next(new AppError('Current password is incorrect', 400));
        }

        user.password           = newPassword;
        user.passwordChangeAt   = new Date();
        await user.save();

        api.success(res, {}, 'Password changed successfully');
    }catch(err){
        next(err);
    }
}


//logout
