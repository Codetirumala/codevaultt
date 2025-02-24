const Topic = require('../models/Topic');
const Problem = require('../models/Problem');

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