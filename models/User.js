const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true // ensure email is always lowercase
  },
  password: {
    type: String,
    required: true
  },
  leetcodeUsername: {
    type: String,
    trim: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Add method to check if user is admin
userSchema.methods.isAdminUser = function() {
  return this.isAdmin === true;
};

// Add method to update LeetCode username
userSchema.methods.setLeetCodeUsername = async function(username) {
  this.leetcodeUsername = username;
  await this.save();
};

const User = mongoose.model('User', userSchema);
module.exports = User; 