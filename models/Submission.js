const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    problem: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Problem',
        required: true
    },
    leetcodeSlug: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index to ensure unique submissions per user-problem combination
submissionSchema.index({ user: 1, problem: 1 }, { unique: true });

const Submission = mongoose.model('Submission', submissionSchema);
module.exports = Submission; 