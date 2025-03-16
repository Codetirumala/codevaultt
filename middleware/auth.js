const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      res.locals.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.locals.user = null;
      res.clearCookie('token');
      return next();
    }

    // Set user in both req and res.locals
    req.user = user;
    res.locals.user = user;
    next();
  } catch (err) {
    res.locals.user = null;
    res.clearCookie('token');
    next();
  }
};

const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.redirect('/signin');
  }
  next();
};

const adminAuth = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).render('error', { 
      message: 'Access denied. Admin privileges required.' 
    });
  }
  next();
};

const firstLoginRequired = (req, res, next) => {
  if (!req.user) {
    return res.redirect('/signin');
  }
  
  if (req.user.isFirstLogin) {
    return res.redirect('/first-login');
  }
  
  next();
};

module.exports = { auth, requireAuth, adminAuth, firstLoginRequired }; 