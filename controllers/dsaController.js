const Topic = require('../models/Topic');
const Problem = require('../models/Problem');
const Submission = require('../models/Submission');
const axios = require('axios');

exports.getDsaSheet = async (req, res) => {
    try {
        const topics = await Topic.find().sort({ createdAt: -1 });
        const problems = await Problem.find().populate('topic');
        
        // Group topics by difficulty
        const groupedTopics = {
            Easy: topics.filter(topic => topic.difficulty === 'Easy'),
            Medium: topics.filter(topic => topic.difficulty === 'Medium'),
            Hard: topics.filter(topic => topic.difficulty === 'Hard')
        };
        
        // Count problems and solved problems for each topic
        const topicStats = {};
        for (const topic of topics) {
            const topicProblems = await Problem.find({ topic: topic._id });
            const totalProblems = topicProblems.length;
            const solvedProblems = topicProblems.filter(problem => problem.solved).length;

            topicStats[topic._id] = {
                totalProblems,
                solvedProblems
            };
        }
        
        res.render('dsa/sheet', { groupedTopics, problems, topicStats });
    } catch (error) {
        console.error('DSA Sheet error:', error);
        res.status(500).render('error', { message: 'Error loading DSA sheet' });
    }
};

exports.getTopicProblems = async (req, res) => {
    try {
        const { topicId } = req.params;
        const topic = await Topic.findById(topicId);
        let problems = await Problem.find({ topic: topicId });
        
        if (req.user && req.user.leetcodeUsername) {
            try {
                // Debug current problem
                console.log('Problems in database:', problems.map(p => ({
                    name: p.name,
                    slug: p.slug
                })));

                const submissionUrl = `https://alfa-leetcode-api.onrender.com/${req.user.leetcodeUsername}/submission`;
                const response = await axios.get(submissionUrl);
                
                if (!response.data || !response.data.submission) {
                    throw new Error('Invalid API response');
                }

                const submissions = response.data.submission;
                
                // Debug API response
                console.log('API Submissions:', submissions.map(s => ({
                    title: s.title,
                    slug: s.titleSlug,
                    status: s.statusDisplay
                })));

                // Filter accepted submissions and normalize slugs
                const acceptedSubmissions = submissions.filter(sub => 
                    sub.statusDisplay === "Accepted"
                ).map(sub => ({
                    ...sub,
                    normalizedSlug: sub.titleSlug.toLowerCase().replace(/[^a-z0-9-]/g, '')
                }));

                console.log('Accepted submissions:', acceptedSubmissions.map(s => s.titleSlug));

                // Clear existing submissions for this user
                await Submission.deleteMany({ user: req.user._id });

                // Process each problem
                for (const problem of problems) {
                    const normalizedProblemSlug = problem.slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
                    
                    // Find matching submission
                    const matchingSubmission = acceptedSubmissions.find(sub => 
                        sub.normalizedSlug === normalizedProblemSlug
                    );

                    if (matchingSubmission) {
                        console.log(`Found matching submission for problem: ${problem.name}`);
                        
                        // Save submission
                        const newSubmission = new Submission({
                            user: req.user._id,
                            problem: problem._id,
                            leetcodeSlug: matchingSubmission.titleSlug,
                            status: matchingSubmission.statusDisplay,
                            submittedAt: new Date(matchingSubmission.timestamp * 1000)
                        });
                        await newSubmission.save();
                        console.log('Saved submission:', newSubmission);
                    }
                }

                // Fetch all saved submissions
                const userSubmissions = await Submission.find({
                    user: req.user._id,
                    status: 'Accepted'
                });

                console.log('Submissions in database:', userSubmissions);

                // Update problems with solved status
                problems = problems.map(problem => {
                    const problemData = problem.toObject();
                    const isSolved = userSubmissions.some(sub => 
                        sub.problem.toString() === problem._id.toString()
                    );
                    console.log(`Problem ${problem.name} (${problem.slug}) solved status:`, isSolved);
                    return {
                        ...problemData,
                        isSolved
                    };
                });

                // Update topic solved count
                const solvedCount = problems.filter(p => p.isSolved).length;
                console.log('New solved count:', solvedCount);
                await Topic.findByIdAndUpdate(topicId, { solvedCount });
                topic.solvedCount = solvedCount;

            } catch (apiError) {
                console.error('API or DB Error:', apiError);
            }
        }

        res.render('dsa/topic', {
            topic,
            problems,
            user: req.user
        });

    } catch (error) {
        console.error('Main Error:', error);
        res.status(500).send('Error loading topic problems');
    }
};

const getTopics = async (req, res) => {
    try {
        const topics = await Topic.find({}).lean();
        const userId = req.user._id;

        // Get all problems with their solved status
        const problems = await Problem.find({}).lean();
        
        // Calculate total solved problems for the header stats
        const totalProblems = problems.length;
        const totalSolved = problems.filter(problem => 
            problem.solvedBy && problem.solvedBy.some(solve => 
                solve.user.toString() === userId.toString()
            )
        ).length;

        // Calculate stats per topic
        const topicStats = {};
        topics.forEach(topic => {
            topicStats[topic._id.toString()] = {
                totalProblems: 0,
                solvedProblems: 0
            };
        });

        // Update topic stats
        problems.forEach(problem => {
            const topicId = problem.topic.toString();
            if (topicStats[topicId]) {
                topicStats[topicId].totalProblems++;
                if (problem.solvedBy && problem.solvedBy.some(solve => 
                    solve.user.toString() === userId.toString()
                )) {
                    topicStats[topicId].solvedProblems++;
                }
            }
        });

        // Add stats to topics
        const topicsWithStats = topics.map(topic => ({
            ...topic,
            problemCount: topicStats[topic._id.toString()].totalProblems,
            solvedCount: topicStats[topic._id.toString()].solvedProblems,
            progress: topicStats[topic._id.toString()].totalProblems > 0 
                ? Math.round((topicStats[topic._id.toString()].solvedProblems / 
                   topicStats[topic._id.toString()].totalProblems) * 100)
                : 0
        }));

        res.render('dsa/topics', {
            topics: topicsWithStats,
            totalStats: {
                solved: totalSolved,
                total: totalProblems,
                progress: totalProblems > 0 ? Math.round((totalSolved / totalProblems) * 100) : 0
            },
            user: req.user
        });
    } catch (error) {
        console.error('Error fetching topics:', error);
        res.status(500).render('error', { message: 'Error loading topics' });
    }
};

// Add this new controller method for individual topic view
const getTopic = async (req, res) => {
    try {
        const topicId = req.params.id;
        const userId = req.user._id;

        const topic = await Topic.findById(topicId).lean();
        const problems = await Problem.find({ topic: topicId }).lean();

        // Calculate solved count for this topic
        const solvedCount = problems.filter(problem =>
            problem.solvedBy && problem.solvedBy.some(solve =>
                solve.user.toString() === userId.toString()
            )
        ).length;

        const progress = problems.length > 0 
            ? Math.round((solvedCount / problems.length) * 100)
            : 0;

        // Add solved status to each problem
        const problemsWithStatus = problems.map(problem => ({
            ...problem,
            isSolved: problem.solvedBy?.some(solve =>
                solve.user.toString() === userId.toString()
            ) || false
        }));

        res.render('dsa/topic', {
            topic: {
                ...topic,
                solvedCount,
                totalProblems: problems.length,
                progress
            },
            problems: problemsWithStatus,
            user: req.user
        });

    } catch (error) {
        console.error('Error fetching topic:', error);
        res.status(500).render('error', { message: 'Error loading topic' });
    }
};

module.exports = {
    getTopics,
    getTopic
}; 