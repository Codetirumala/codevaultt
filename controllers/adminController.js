const User = require('../models/User');
const Topic = require('../models/Topic');
const Problem = require('../models/Problem');
const Submission = require('../models/Submission');

exports.getDashboard = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ isAdmin: false });
        const totalProblems = await Problem.countDocuments();
        const recentUsers = await User.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('-password');
        const topics = await Topic.find();

        const stats = {
            totalUsers,
            totalProblems,
            recentUsers,
            topics
        };

        res.render('admin/dashboard', { stats });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).render('error', { message: 'Error loading dashboard' });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        const users = await User.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('-password');

        const totalUsers = await User.countDocuments();
        const totalPages = Math.ceil(totalUsers / limit);

        res.render('admin/users', {
            users,
            currentPage: page,
            totalPages,
            totalUsers
        });
    } catch (error) {
        console.error('Users page error:', error);
        res.status(500).render('error', { message: 'Error loading users' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.isAdmin) {
            return res.status(403).json({ error: 'Cannot delete admin user' });
        }

        await User.findByIdAndDelete(userId);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'Error deleting user' });
    }
};

exports.getProblems = async (req, res) => {
    try {
        // Implement problem management
        res.render('admin/problems');
    } catch (error) {
        res.status(500).render('error', { message: 'Error loading problems' });
    }
};

exports.getCompanies = async (req, res) => {
    try {
        // Implement company management
        res.render('admin/companies');
    } catch (error) {
        res.status(500).render('error', { message: 'Error loading companies' });
    }
};

exports.addTopic = async (req, res) => {
    try {
        const { name, difficulty } = req.body;

        // Check if topic already exists
        const existingTopic = await Topic.findOne({ name });
        if (existingTopic) {
            return res.status(400).json({ error: 'Topic already exists' });
        }

        const topic = await Topic.create({
            name,
            difficulty
        });

        res.status(201).json(topic);
    } catch (error) {
        console.error('Add topic error:', error);
        res.status(500).json({ error: 'Error adding topic' });
    }
};

exports.deleteTopic = async (req, res) => {
    try {
        const topic = await Topic.findByIdAndDelete(req.params.id);
        if (!topic) {
            return res.status(404).json({ error: 'Topic not found' });
        }
        res.json({ message: 'Topic deleted successfully' });
    } catch (error) {
        console.error('Delete topic error:', error);
        res.status(500).json({ error: 'Error deleting topic' });
    }
};

exports.getUserStats = async (req, res) => {
    try {
        // Get all problems first
        const problems = await Problem.find().lean();

        // Get all non-admin users with their stats
        const users = await User.find({ isAdmin: false })
            .select('name email rollNumber branch section leetcodeUsername')
            .lean();

        // Get all accepted submissions
        const submissions = await Submission.find({
            user: { $in: users.map(u => u._id) },
            status: 'Accepted'
        }).lean();

        // Create a map of user submissions for faster lookup
        const userSubmissionsMap = new Map();
        submissions.forEach(sub => {
            const userId = sub.user.toString();
            if (!userSubmissionsMap.has(userId)) {
                userSubmissionsMap.set(userId, new Set());
            }
            userSubmissionsMap.get(userId).add(sub.problem.toString());
        });

        // Process user stats
        const userStats = users.map(user => {
            // Get solved problems for this user
            const solvedProblemIds = userSubmissionsMap.get(user._id.toString()) || new Set();
            
            // Add problems array to user object with isSolved flag
            return {
                ...user,
                problems: problems.map(prob => ({
                    ...prob,
                    isSolved: solvedProblemIds.has(prob._id.toString())
                }))
            };
        });

        res.render('admin/stats', {
            userStats,
            totalProblems: problems.length,
            currentPage: 'stats'
        });
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).render('error', { message: 'Error loading statistics' });
    }
}; 