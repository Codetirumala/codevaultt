const mongoose = require('mongoose');

const topicSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    difficulty: {
        type: String,
        required: true,
        enum: ['Easy', 'Medium', 'Hard'],
        default: 'Medium'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    problemCount: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('Topic', topicSchema); 