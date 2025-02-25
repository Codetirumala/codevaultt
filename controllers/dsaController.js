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