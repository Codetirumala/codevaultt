const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/check-solution/:problemId', async (req, res) => {
    try {
        const { problemId } = req.params;
        const { problemSlug } = req.body;
        
        if (!req.user || !req.user.leetcodeUsername) {
            return res.status(401).json({ message: 'User not authenticated or LeetCode username not set' });
        }

        // Fetch submissions from LeetCode API
        const submissionUrl = `https://alfa-leetcode-api.onrender.com/${req.user.leetcodeUsername}/submission`;
        const response = await axios.get(submissionUrl);
        
        // Check if problem is solved
        const isSolved = response.data.some(submission => 
            submission.titleSlug === problemSlug && 
            submission.statusDisplay === 'Accepted'
        );

        if (isSolved) {
            // Update problem status in database
            await Problem.findByIdAndUpdate(problemId, { isSolved: true });
            
            // Update topic solved count
            const problem = await Problem.findById(problemId);
            const topic = await Topic.findById(problem.topic);
            await Topic.findByIdAndUpdate(problem.topic, {
                solvedCount: (topic.solvedCount || 0) + 1
            });
        }

        res.json({ isSolved });

    } catch (error) {
        console.error('Error checking solution:', error);
        res.status(500).json({ message: 'Error checking solution status' });
    }
});

module.exports = router; 