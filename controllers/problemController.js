const { checkAndUpdateSubmissions } = require('../services/submissionService');

// Add this to your controller
const syncLeetCodeSubmissions = async (req, res) => {
    try {
        const userId = req.user._id; // Assuming you have user info in request
        const { leetcodeUsername } = req.body;

        if (!leetcodeUsername) {
            return res.status(400).json({ 
                success: false, 
                message: 'LeetCode username is required' 
            });
        }

        const result = await checkAndUpdateSubmissions(userId, leetcodeUsername);
        
        res.json({
            success: true,
            message: `Successfully synced ${result.solvedCount} new solutions`,
            solvedProblems: result.solvedProblems
        });

    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to sync LeetCode submissions' 
        });
    }
};

module.exports = {
    // ... existing exports ...
    syncLeetCodeSubmissions
}; 