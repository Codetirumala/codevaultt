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
    status: {
        type: String,
        enum: ['Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Runtime Error'],
        required: true
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    leetcodeSubmissionId: String
}, {
    timestamps: true
});

// Index for faster queries
submissionSchema.index({ user: 1, problem: 1 });

const Submission = mongoose.model('Submission', submissionSchema);
module.exports = Submission; 