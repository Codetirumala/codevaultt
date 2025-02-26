const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
    name: String,
    slug: String,
    leetcodeLink: String,
    difficulty: String,
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