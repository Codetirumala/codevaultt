const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const authController = require('../controllers/authController');

router.get('/signup', authController.getSignupPage);
router.post('/signup', authController.signup);
router.get('/signin', (req, res) => res.render('signin'));
router.post('/signin', authController.signin);
router.get('/signout', authController.signout);
router.post('/signout', authController.signout);

// Forgot password routes
router.get('/forgot-password', authController.getForgotPasswordPage);
router.post('/forgot-password', authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);
router.post('/reset-password', authController.resetPassword);

// Profile routes - protected by requireAuth middleware
router.get('/profile', requireAuth, authController.getProfile);
router.post('/profile/update', requireAuth, authController.updateProfile);

// Add these routes
router.get('/first-login', requireAuth, authController.getFirstLoginPage);
router.post('/first-login', requireAuth, authController.completeFirstLogin);

module.exports = router; 