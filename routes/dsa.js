const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const Problem = require('../models/Problem');
const Topic = require('../models/Topic');
const Submission = require('../models/Submission');
const axios = require('axios');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

// DSA Sheet route
router.get('/sheet', auth, async (req, res) => {
    try {
        // If user is not authenticated, redirect to sign in page
        if (!req.user) {
            return res.redirect('/signin');
        }

        const userId = req.user._id;

        // Get all topics and problems
        const topics = await Topic.find({}).lean();
        const problems = await Problem.find({}).lean();

        // Create topicStats object
        const topicStats = {};
        topics.forEach(topic => {
            const topicProblems = problems.filter(p => 
                p.topic.toString() === topic._id.toString()
            );
            
            const solvedProblems = topicProblems.filter(problem =>
                problem.solvedBy && problem.solvedBy.some(solve =>
                    solve.user.toString() === userId.toString()
                )
            ).length;

            topicStats[topic._id] = {
                totalProblems: topicProblems.length,
                solvedProblems: solvedProblems
            };
        });

        // Group topics by difficulty
        const groupedTopics = topics.reduce((acc, topic) => {
            const difficulty = topic.difficulty || 'Medium';
            if (!acc[difficulty]) {
                acc[difficulty] = [];
            }
            acc[difficulty].push(topic);
            return acc;
        }, {});

        res.render('dsa/sheet', {
            user: req.user,
            topicStats,
            groupedTopics
        });

    } catch (error) {
        console.error('Error loading DSA sheet:', error);
        res.status(500).render('error', { message: 'Error loading DSA sheet' });
    }
});

// Topic details route
router.get('/topics/:id', auth, async (req, res) => {
    try {
        const topicId = req.params.id;
        const userId = req.user._id;
        
        const topic = await Topic.findById(topicId).lean();
        const problems = await Problem.find({ topic: topicId }).lean();

        // Add solved status to each problem
        const problemsWithStatus = problems.map(problem => ({
            ...problem,
            isSolved: problem.solvedBy?.some(solve => 
                solve.user.toString() === userId.toString()
            ) || false
        }));

        res.render('dsa/topic', { 
            topic, 
            problems: problemsWithStatus,
            user: req.user,
            leetcodeUsername: req.user.leetcodeUsername 
        });
    } catch (error) {
        console.error('Error fetching topic:', error);
        res.status(500).render('error', { message: 'Error loading topic' });
    }
});

// Debug route to check submissions and problems
router.get('/debug-submissions', auth, async (req, res) => {
    try {
        const username = req.user.leetcodeUsername;
        console.log('\n=== Starting Debug Process ===');
        console.log(`Checking submissions for user: ${username}`);

        // 1. Fetch all problems from our database
        const problems = await Problem.find({}).lean();
        console.log('\n=== Our Database Problems ===');
        problems.forEach(problem => {
            const slug = problem.leetcodeLink.split('/').pop();
            console.log(`Problem: ${problem.name}, Slug: ${slug}`);
        });

        // 2. Fetch LeetCode submissions
        const response = await axios.get(
            `https://alfa-leetcode-api.onrender.com/${username}/submission`
        );

        // 3. Log accepted submissions
        console.log('\n=== LeetCode Accepted Submissions ===');
        const acceptedSubmissions = response.data.submission.filter(
            sub => sub.statusDisplay === 'Accepted'
        );

        acceptedSubmissions.forEach(sub => {
            console.log(`Title: ${sub.title}`);
            console.log(`Slug: ${sub.titleSlug}`);
            console.log(`Status: ${sub.statusDisplay}`);
            console.log('---');
        });

        // 4. Compare and find matches
        console.log('\n=== Matching Problems ===');
        const matches = [];
        acceptedSubmissions.forEach(sub => {
            const matchingProblem = problems.find(p => {
                const problemSlug = p.leetcodeLink.split('/').pop().toLowerCase();
                return problemSlug === sub.titleSlug.toLowerCase();
            });

            if (matchingProblem) {
                matches.push({
                    submission: sub,
                    problem: matchingProblem
                });
                console.log(`Match found! ${sub.titleSlug} -> ${matchingProblem.name}`);
            } else {
                console.log(`No match found for: ${sub.titleSlug}`);
            }
        });

        res.json({
            success: true,
            debug: {
                problemCount: problems.length,
                acceptedSubmissions: acceptedSubmissions.length,
                matches: matches.length,
                problems: problems.map(p => ({
                    name: p.name,
                    slug: p.leetcodeLink.split('/').pop()
                })),
                acceptedSolutions: acceptedSubmissions.map(s => ({
                    title: s.title,
                    slug: s.titleSlug,
                    status: s.statusDisplay
                })),
                matches: matches.map(m => ({
                    submissionSlug: m.submission.titleSlug,
                    problemName: m.problem.name
                }))
            }
        });

    } catch (error) {
        console.error('Debug error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Sync submissions route with detailed logging
router.post('/sync-submissions', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const username = req.user.leetcodeUsername;

        if (!username) {
            return res.status(400).json({
                success: false,
                message: 'LeetCode username not set'
            });
        }

        console.log(`\n=== Starting Sync for ${username} ===`);

        // Fetch LeetCode submissions
        const leetcodeResponse = await axios.get(
            `https://alfa-leetcode-api.onrender.com/${username}/submission`
        );

        console.log('LeetCode API Response:', leetcodeResponse.data);

        if (!leetcodeResponse.data?.submission) {
            throw new Error('Invalid LeetCode API response');
        }

        // Filter accepted submissions
        const acceptedSubmissions = leetcodeResponse.data.submission.filter(
            sub => sub.statusDisplay === 'Accepted'
        );

        console.log(`Found ${acceptedSubmissions.length} accepted submissions`);

        // Get all problems
        const problems = await Problem.find({}).lean();
        let updatedCount = 0;
        const updates = [];

        // Count total solved problems
        let solvedCount = 0;
        for (const submission of acceptedSubmissions) {
            console.log(`\nChecking submission for: ${submission.titleSlug}`);
            
            // Find matching problem
            const problem = problems.find(p => {
                const problemSlug = p.leetcodeLink.split('/problems/')[1]?.replace(/\/$/, '');
                return problemSlug === submission.titleSlug;
            });

            if (problem) {
                console.log(`Found matching problem: ${problem.name}`);
                
                // Update problem
                const updated = await Problem.findByIdAndUpdate(
                    problem._id,
                    {
                        $addToSet: {
                            solvedBy: {
                                user: userId,
                                solvedAt: new Date(submission.timestamp * 1000)
                            }
                        }
                    },
                    { new: true }
                );

                if (updated) {
                    updatedCount++;
                    updates.push({
                        problemId: problem._id,
                        name: problem.name,
                        status: 'solved'
                    });
                }

                solvedCount++;
            } else {
                console.log(`No matching problem found for: ${submission.titleSlug}`);
            }
        }

        // Update user's solved count
        await User.findByIdAndUpdate(userId, { solvedProblemsCount: solvedCount });

        console.log(`\nSync complete. Updated ${updatedCount} problems`);

        res.json({
            success: true,
            message: `Successfully synced ${updatedCount} solutions`,
            updates
        });

    } catch (error) {
        console.error('Sync error:', error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Add a route to manually check problem status
router.get('/check-problem/:slug', auth, async (req, res) => {
    try {
        const { slug } = req.params;
        const userId = req.user._id;

        const problem = await Problem.findOne({ 
            $or: [
                { slug: slug.toLowerCase() },
                { leetcodeLink: new RegExp(slug + '$', 'i') }
            ]
        });

        if (!problem) {
            return res.json({ exists: false });
        }

        const isSolved = problem.solvedBy.some(solve => 
            solve.user.toString() === userId.toString()
        );

        res.json({
            exists: true,
            problem: {
                name: problem.name,
                isSolved,
                solvedCount: problem.solvedCount,
                solvedBy: problem.solvedBy
            }
        });

    } catch (error) {
        console.error('Error checking problem:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update the manual validation route
router.post('/problems/:id/mark-solved', auth, async (req, res) => {
    try {
        const problemId = req.params.id;
        const userId = req.user._id;

        // Find the problem first
        const problem = await Problem.findById(problemId);
        if (!problem) {
            return res.status(404).json({
                success: false,
                message: 'Problem not found'
            });
        }

        // Check if already solved by this user
        const alreadySolved = problem.solvedBy.some(solve => 
            solve.user.toString() === userId.toString()
        );

        if (alreadySolved) {
            return res.json({
                success: false,
                message: 'Problem already marked as solved'
            });
        }

        // Update problem and create submission
        await Promise.all([
            // Add user to solvedBy array and increment solvedCount
            Problem.findByIdAndUpdate(
                problemId,
                {
                    $addToSet: {
                        solvedBy: {
                            user: userId,
                            solvedAt: new Date()
                        }
                    },
                    $inc: { solvedCount: 1 }
                }
            ),
            // Create submission record
            Submission.create({
                user: userId,
                problem: problemId,
                status: 'Accepted',
                submittedAt: new Date()
            }),
            // Increment user's solved problems count
            User.findByIdAndUpdate(
                userId,
                { $inc: { solvedProblemsCount: 1 } }
            )
        ]);

        res.json({
            success: true,
            message: 'Problem marked as solved successfully'
        });

    } catch (error) {
        console.error('Error marking problem as solved:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to mark problem as solved'
        });
    }
});

// Update the leaderboard route to require auth
router.get('/leaderboard', requireAuth, async (req, res) => {
    try {
        const users = await User.find({ isAdmin: false })
            .select('name rollNumber branch section leetcodeUsername solvedProblemsCount')
            .sort({ solvedProblemsCount: -1 })
            .lean();

        const totalProblems = await Problem.countDocuments();

        res.render('dsa/leaderboard', {
            users,
            totalProblems,
            currentUser: req.user
        });
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        res.status(500).render('error', { message: 'Error loading leaderboard' });
    }
});

module.exports = router;
