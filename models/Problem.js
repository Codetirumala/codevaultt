const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    leetcodeLink: {
        type: String,
        required: true
    },
    difficulty: {
        type: String,
        required: true,
        enum: ['Easy', 'Medium', 'Hard']
    },
    topic: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Topic',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Problem = mongoose.model('Problem', problemSchema);
module.exports = Problem; 