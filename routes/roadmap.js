const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

// Apply auth middleware to all roadmap routes
router.use(requireAuth);

// Get roadmap page
router.get('/', (req, res) => {
    res.render('roadmap');
});

module.exports = router; 