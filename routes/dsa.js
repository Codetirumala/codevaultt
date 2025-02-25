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

// Helper function for topic icons
function getTopicIcon(topicName) {
    const icons = {
        'Arrays': 'fa-layer-group',
        'Strings': 'fa-font',
        'Linked List': 'fa-link',
        'Stack': 'fa-database',
        'Queue': 'fa-stream',
        'Tree': 'fa-tree',
        'Graph': 'fa-project-diagram',
        'Dynamic Programming': 'fa-chess-board',
        'Recursion': 'fa-redo',
        'Binary Search': 'fa-search',
        'default': 'fa-code'
    };
    return icons[topicName] || icons.default;
}

// DSA Sheet route
router.get('/sheet', async (req, res) => {
    try {
        // Get all topics with their problems
        const topics = await Topic.find().lean();
        const problems = await Problem.find().lean();

        // Group topics by difficulty
        const groupedTopics = topics.reduce((acc, topic) => {
            if (!acc[topic.difficulty]) {
                acc[topic.difficulty] = [];
            }
            acc[topic.difficulty].push(topic);
            return acc;
        }, {});

        // Calculate statistics for each topic
        const topicStats = topics.reduce((acc, topic) => {
            const topicProblems = problems.filter(p => p.topic.toString() === topic._id.toString());
            acc[topic._id] = {
                totalProblems: topicProblems.length,
                solvedProblems: 0 // You can implement solved problems logic here
            };
            return acc;
        }, {});

        res.render('dsa/sheet', {
            groupedTopics,
            topicStats,
            getTopicIcon, // Pass the helper function
            user: req.user
        });
    } catch (error) {
        console.error('Error in /dsa/sheet:', error);
        res.status(500).send('Server Error');
    }
});

module.exports = router; 