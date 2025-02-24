const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const dsaController = require('../controllers/dsaController');
const Topic = require('../models/Topic');
const Problem = require('../models/Problem');

// Apply auth middleware to all DSA routes
router.use(requireAuth);

// Get DSA sheet page
router.get('/', (req, res) => {
    res.render('dsa-sheet');
});

router.get('/dsa', dsaController.getDsaSheet);

// Route for DSA sheet
router.get('/sheet', dsaController.getDsaSheet);

router.get('/topics/:id', async (req, res) => {
    try {
        const topicId = req.params.id;
        const topic = await Topic.findById(topicId);
        const problems = await Problem.find({ topic: topicId });

        res.render('dsa/topic', { topic, problems });
    } catch (error) {
        console.error('Error fetching topic problems:', error);
        res.status(500).render('error', { message: 'Error loading topic problems' });
    }
});

module.exports = router; 