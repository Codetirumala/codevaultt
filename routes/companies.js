const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// Apply auth middleware to all companies routes
router.use(requireAuth);

// Get companies page
router.get('/', (req, res) => {
    res.render('companies');
});

module.exports = router; 