const User = require('../models/User');
const Topic = require('../models/Topic');
const Problem = require('../models/Problem');
const Submission = require('../models/Submission');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');

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
        // Get all non-admin users sorted by solvedProblemsCount
        const users = await User.find({ isAdmin: false })
            .select('name email rollNumber branch section leetcodeUsername solvedProblemsCount')
            .sort({ solvedProblemsCount: -1 }) // Sort in descending order
            .lean();

        // Get all problems
        const problems = await Problem.find().lean();

        // Process user stats
        const userStats = users.map(user => {
            return {
                ...user,
                problems: problems.map(prob => ({
                    ...prob,
                    isSolved: prob.solvedBy?.some(solve => 
                        solve.user.toString() === user._id.toString()
                    ) || false
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

exports.bulkRegisterUsers = async (req, res) => {
    try {
        if (!req.files || !req.files.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const file = req.files.file;
        const workbook = xlsx.read(file.data);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const users = xlsx.utils.sheet_to_json(sheet);

        // Validate Excel data structure
        const requiredFields = ['name', 'email', 'rollNumber', 'branch', 'section'];
        const missingFields = users.some(user => 
            requiredFields.some(field => !user[field])
        );

        if (missingFields) {
            return res.status(400).json({ 
                error: 'Excel file must contain columns: name, email, rollNumber, branch, section' 
            });
        }

        const defaultPassword = await bcrypt.hash('student123', 12);
        let registeredCount = 0;
        let errors = [];

        for (const userData of users) {
            try {
                // Check if user already exists
                const existingUser = await User.findOne({ email: userData.email });
                if (existingUser) {
                    errors.push(`User with email ${userData.email} already exists`);
                    continue;
                }

                // Create new user with all required fields
                await User.create({
                    name: userData.name,
                    email: userData.email.toLowerCase(),
                    rollNumber: userData.rollNumber,
                    branch: userData.branch.toUpperCase(),
                    section: userData.section.toUpperCase(),
                    password: defaultPassword,
                    isFirstLogin: true
                });
                registeredCount++;
            } catch (error) {
                errors.push(`Error registering ${userData.email}: ${error.message}`);
            }
        }

        // Return response with results
        res.json({ 
            message: 'Bulk registration completed',
            registeredCount,
            errors: errors.length > 0 ? errors : undefined,
            success: registeredCount > 0
        });
    } catch (error) {
        console.error('Bulk registration error:', error);
        res.status(500).json({ 
            error: 'Error processing file',
            details: error.message 
        });
    }
}; 