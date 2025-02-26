const axios = require('axios');
const Problem = require('../models/Problem');

const checkAndUpdateSubmissions = async (userId, leetcodeUsername) => {
    try {
        console.log(`Checking submissions for user ${leetcodeUsername}`);
        
        // Fetch submissions from LeetCode API
        const response = await axios.get(
            `https://alfa-leetcode-api.onrender.com/${leetcodeUsername}/submission`
        );

        console.log('API Response:', response.data);

        // Check if response has the expected structure
        if (!response.data || !response.data.submission || !Array.isArray(response.data.submission)) {
            throw new Error('Invalid response format from LeetCode API');
        }

        // Get all problems from our database
        const problems = await Problem.find({});
        console.log(`Found ${problems.length} problems in database`);

        // Create a map of problems by their slug
        const problemsBySlug = new Map(
            problems.map(problem => {
                // Extract slug from leetcode URL or use stored slug
                const slug = problem.slug || problem.leetcodeLink.split('/').pop();
                return [slug, problem];
            })
        );

        // Track which problems were solved
        const solvedProblems = [];
        const processedSlugs = new Set(); // To avoid processing duplicates

        // Process each submission
        for (const submission of response.data.submission) {
            // Skip if we've already processed this problem
            if (processedSlugs.has(submission.titleSlug)) {
                continue;
            }

            // Check if submission is accepted and matches any of our problems
            if (submission.statusDisplay === 'Accepted') {
                const problem = problemsBySlug.get(submission.titleSlug);
                
                if (problem) {
                    console.log(`Found matching problem: ${problem.name}`);
                    // Try to mark the problem as solved
                    const wasMarked = await problem.markAsSolved(userId);
                    if (wasMarked) {
                        console.log(`Marked problem ${problem.name} as solved`);
                        solvedProblems.push(problem);
                    }
                    processedSlugs.add(submission.titleSlug);
                }
            }
        }

        console.log(`Successfully processed ${solvedProblems.length} solved problems`);

        return {
            success: true,
            solvedCount: solvedProblems.length,
            solvedProblems
        };

    } catch (error) {
        console.error('Error checking submissions:', error);
        throw new Error(`Failed to check LeetCode submissions: ${error.message}`);
    }
};

module.exports = {
    checkAndUpdateSubmissions
}; 