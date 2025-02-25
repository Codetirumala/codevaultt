const express = require('express');
const router = express.Router();
const { requireAuth, adminAuth } = require('../middleware/auth');
const adminController = require('../controllers/adminController');
const Problem = require('../models/Problem');
const Topic = require('../models/Topic');

// Apply auth middleware to all admin routes
router.use(requireAuth, adminAuth);

router.get('/dashboard', adminController.getDashboard);
router.get('/users', adminController.getUsers);
router.delete('/users/:id', adminController.deleteUser);
router.get('/problems', async (req, res) => {
    try {
        const problems = await Problem.find().populate('topic').lean();
        const topics = await Topic.find().lean();
        
        res.render('admin/problems', {
            problems,
            topics
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Server Error');
    }
});
router.get('/companies', adminController.getCompanies);

// Topic routes
router.post('/topics', adminController.addTopic);
router.delete('/topics/:id', adminController.deleteTopic);

// Problem routes
router.post('/problems', async (req, res) => {
    try {
        const { name, slug, leetcodeLink, difficulty, topic } = req.body;

        // Check if a problem with the same slug already exists
        const existingProblem = await Problem.findOne({ slug });
        if (existingProblem) {
            return res.status(400).json({ error: 'A problem with this slug already exists.' });
        }

        const problem = await Problem.create({
            name,
            slug,
            leetcodeLink,
            difficulty,
            topic
        });

        // Respond with the created problem
        res.status(201).json(problem);
    } catch (error) {
        console.error('Add problem error:', error);
        res.status(500).json({ error: 'Error adding problem' });
    }
});

router.delete('/problems/:id', async (req, res) => {
    try {
        const problemId = req.params.id;
        const problem = await Problem.findByIdAndDelete(problemId);

        if (!problem) {
            return res.status(404).json({ error: 'Problem not found' });
        }

        res.json({ message: 'Problem deleted successfully' });
    } catch (error) {
        console.error('Delete problem error:', error);
        res.status(500).json({ error: 'Error deleting problem' });
    }
});

router.patch('/problems/:id', async (req, res) => {
    try {
        const problemId = req.params.id;
        const { solved } = req.body;

        const problem = await Problem.findByIdAndUpdate(problemId, { solved }, { new: true });

        if (!problem) {
            return res.status(404).json({ error: 'Problem not found' });
        }

        res.json({ message: 'Problem updated successfully', problem });
    } catch (error) {
        console.error('Update problem error:', error);
        res.status(500).json({ error: 'Error updating problem' });
    }
});

module.exports = router; 