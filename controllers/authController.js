const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

async function checkAdminExists() {
    const adminCount = await User.countDocuments({ isAdmin: true });
    return adminCount > 0;
}

exports.getSignupPage = async (req, res) => {
    try {
        const adminExists = await checkAdminExists();
        res.render('signup', { 
            isAdmin: req.query.type === 'admin' && !adminExists,
            adminExists
        });
    } catch (error) {
        console.error('Error checking admin status:', error);
        res.render('signup', { 
            error: 'Error loading signup page',
            adminExists: true // Default to true on error for safety
        });
    }
};

exports.signup = async (req, res) => {
    try {
        const { name, email, password, leetcodeUsername, isAdmin } = req.body;
        
        console.log('Signup attempt:', { 
            name, 
            email, 
            isAdmin: isAdmin === 'true',
            hasLeetcode: !!leetcodeUsername 
        });

        // Check if trying to create admin when one already exists
        if (isAdmin === 'true') {
            const adminExists = await checkAdminExists();
            if (adminExists) {
                return res.render('signup', {
                    error: 'Admin account already exists',
                    adminExists: true
                });
            }
        }

        // Check if user already exists
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.render('signup', { 
                error: 'User already exists',
                isAdmin: isAdmin === 'true'
            });
        }

        // Validate required fields
        if (!name || !email || !password) {
            return res.render('signup', {
                error: 'All fields are required',
                isAdmin: isAdmin === 'true'
            });
        }

        // Additional validation for regular users
        if (isAdmin === 'false' && !leetcodeUsername) {
            return res.render('signup', {
                error: 'LeetCode username is required for regular users',
                isAdmin: false
            });
        }

        // Create user object
        const userData = {
            name,
            email,
            password,
            isAdmin: isAdmin === 'true'
        };

        // Add leetcodeUsername only for regular users
        if (!userData.isAdmin && leetcodeUsername) {
            userData.leetcodeUsername = leetcodeUsername;
        }

        console.log('Creating user with data:', userData);

        const user = await User.create(userData);
        
        console.log('User created:', { 
            id: user._id, 
            isAdmin: user.isAdmin 
        });

        // Create token
        const token = jwt.sign(
            { id: user._id, isAdmin: user.isAdmin },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        // Set user in res.locals
        const userWithoutPassword = user.toObject();
        delete userWithoutPassword.password;
        res.locals.user = userWithoutPassword;

        // Redirect based on user type
        if (user.isAdmin) {
            return res.redirect('/admin/dashboard');
        } else {
            return res.redirect('/');
        }
    } catch (error) {
        console.error('Signup error:', error);
        return res.render('signup', { 
            error: 'Error creating user',
            isAdmin: req.body.isAdmin === 'true',
            adminExists: true // Default to true on error for safety
        });
    }
};

exports.signin = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('Signin attempt for email:', email); // Debug log

        // Find user by email
        const user = await User.findOne({ email });

        // Debug logs
        console.log('User found:', user ? 'Yes' : 'No');
        if (user) {
            console.log('Is Admin:', user.isAdmin);
        }

        // If no user found
        if (!user) {
            console.log('No user found with this email');
            return res.render('signin', { 
                error: 'Invalid credentials'
            });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password match:', isMatch); // Debug log

        if (!isMatch) {
            console.log('Password does not match');
            return res.render('signin', { 
                error: 'Invalid credentials'
            });
        }

        // Create token
        const token = jwt.sign(
            { 
                id: user._id, 
                isAdmin: user.isAdmin 
            }, 
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });

        // Remove password from user object
        const userWithoutPassword = user.toObject();
        delete userWithoutPassword.password;
        res.locals.user = userWithoutPassword;

        console.log('Login successful, redirecting user'); // Debug log

        // Redirect based on user role
        if (user.isAdmin) {
            console.log('Redirecting to admin dashboard'); // Debug log
            return res.redirect('/admin/dashboard');
        } else {
            console.log('Redirecting to home'); // Debug log
            return res.redirect('/');
        }

    } catch (error) {
        console.error('Signin error:', error);
        return res.render('signin', { 
            error: 'Error signing in'
        });
    }
};

exports.signout = async (req, res) => {
  try {
    res.clearCookie('token');
    res.locals.user = null;
    return res.redirect('/');
  } catch (error) {
    console.error('Signout error:', error);
    return res.redirect('/');
  }
};

// Add profile route handler
exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        if (!user) {
            return res.redirect('/signin');
        }
        res.render('profile', { user });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).render('error', { message: 'Error loading profile' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { name, email, leetcodeUsername, newPassword } = req.body;
        const userId = req.user._id;

        // Check if email is already taken by another user
        const existingUser = await User.findOne({ email, _id: { $ne: userId } });
        if (existingUser) {
            return res.render('profile', {
                user: req.user,
                error: 'Email already in use'
            });
        }

        // Update user object
        const updateData = {
            name,
            email
        };

        // Add leetcodeUsername if user is not admin
        if (!req.user.isAdmin && leetcodeUsername) {
            updateData.leetcodeUsername = leetcodeUsername;
        }

        // Update password if provided
        if (newPassword) {
            updateData.password = await bcrypt.hash(newPassword, 12);
        }

        // Update user in database
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        // Update session user data
        req.user = updatedUser;
        res.locals.user = updatedUser;

        res.render('profile', {
            user: updatedUser,
            success: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.render('profile', {
            user: req.user,
            error: 'Error updating profile'
        });
    }
}; 