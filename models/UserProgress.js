const mongoose = require('mongoose');

const userProgressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    problems: [{
        problemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Problem',
            required: true
        },
        solved: {
            type: Boolean,
            default: false
        },
        solution: {
            type: String
        },
        solvedAt: {
            type: Date
        }
    }]
}, { timestamps: true });

module.exports = mongoose.model('UserProgress', userProgressSchema); 