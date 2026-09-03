const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const AppError = require('../utils/AppError');

const {ROLES} = require('../config/constants');


const protect = async (req, res, next ) => {
    try {
        const auth = req.headers.authorization;
        if(!auth?.startsWith('Bearer')){
            return next(new AppError('Not authenticated. Please log in.', 401));
        }

        const token = auth.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET );

        const user = await User.findById(decoded.id).select('+passwordChangedAt');
    if (!user)          return next(new AppError('User no longer exists', 401));
    if (!user.isActive) return next(new AppError('Account has been deactivated', 401));

    if (user.changedPasswordAfter(decoded.iat)) {
      return next(new AppError('Password recently changed. Please log in again.', 401));
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError')  return next(new AppError('Invalid token', 401));
    if (err.name === 'TokenExpiredError')  return next(new AppError('Token expired. Please log in again.', 401));
    next(err);
  }
};

const restrictTo = (...roles) => (req, res,next) => {
        if(!roles.includes(req.user?.role)){
            return next(new AppError('You are not permitted to perform this operation', 403));
        }
        next();
}

const adminOnly = restrictTo(ROLES.ADMIN, ROLES.SUPER_ADMIN);
const superAdminOnly = restrictTo(ROLES.SUPER_ADMIN);

module.exports = { protect, restrictTo, adminOnly, superAdminOnly };

// const apiResponse = fetch('https://example.com', {
//   method: 'GET',
//   headers: {
//     'Accept': 'application/json',
//     'Authorization': 'Bearer YOUR_ACCESS_TOKEN' //[ 'bearer', 'jdjlkdj33939'] [1]
//   }
// })
// .then(response => response.json())
// .then(data => console.log(data));