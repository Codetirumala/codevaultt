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

// Profile routes - protected by requireAuth middleware
router.get('/profile', requireAuth, authController.getProfile);
router.post('/profile/update', requireAuth, authController.updateProfile);

module.exports = router; 