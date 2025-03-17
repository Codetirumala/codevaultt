const mongoose = require('mongoose');

const solutionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    code: {
        type: String,
        required: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    }
});

const problemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    difficulty: {
        type: String,
        required: true,
        enum: ['Easy', 'Medium', 'Hard']
    },
    leetcodeLink: {
        type: String,
        required: true
    },
    topic: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Topic'
    },
    solvedCount: {
        type: Number,
        default: 0
    },
    solvedBy: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        solvedAt: Date
    }],
    solutions: [solutionSchema]
}, {
    timestamps: true
});

problemSchema.methods.markAsSolved = async function(userId) {
    const alreadySolved = this.solvedBy.some(solve => 
        solve.user.toString() === userId.toString()
    );
    
    if (!alreadySolved) {
        this.solvedBy.push({ user: userId });
        this.solvedCount += 1;
        await this.save();
        
        // Update user's solved count
        await mongoose.model('User').findByIdAndUpdate(
            userId,
            { $inc: { solvedProblemsCount: 1 } }
        );
    }
    return !alreadySolved;
};

problemSchema.pre('save', function(next) {
    if (this.leetcodeLink) {
        this.slug = this.leetcodeLink.split('/').pop();
    }
    next();
});

const Problem = mongoose.model('Problem', problemSchema);
module.exports = Problem; 