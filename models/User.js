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
    required: true,
    minlength: 6
  },
  rollNumber: {
    type: String,
    required: true,
    trim: true
  },
  branch: {
    type: String,
    required: true,
    trim: true
  },
  section: {
    type: String,
    required: true,
    trim: true
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
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Generate a salt and hash the password
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

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