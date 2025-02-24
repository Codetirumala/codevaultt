const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

// Ensure user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
};

router.get('/', isAuthenticated, homeController.getHomePage);

module.exports = router; 