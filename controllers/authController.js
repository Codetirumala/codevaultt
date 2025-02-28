const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendEmail } = require('../services/emailService');

// Store OTP and their expiry times (in memory - you might want to use Redis in production)
const otpStore = new Map();

// Generate OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

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

        // Send welcome email
        try {
            await sendEmail(
                email,
                'Welcome to CodeVault!',
                `Dear ${name},\n\nWe are excited to welcome you to the CodeVault community! You are now part of a vibrant network of developers eager to enhance their coding skills.\n\nBest regards,\nThe CodeVault Team`,
                `<h1>Welcome to CodeVault! 🎉</h1>
                <p>Dear ${name},</p>
                <p>We are excited to welcome you to the CodeVault community! You are now part of a vibrant network of developers eager to enhance their coding skills.</p>
                <p>Best regards,<br>The CodeVault Team</p>`
            );
        } catch (emailError) {
            console.error('Failed to send welcome email:', emailError);
            // Continue with signup process even if email fails
        }

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
        
        console.log('Signin attempt for email:', email);

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

        // Compare password using the new method
        const isMatch = await user.comparePassword(password);
        console.log('Password match:', isMatch);

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

        console.log('Login successful, redirecting user');

        // Redirect based on user role
        if (user.isAdmin) {
            console.log('Redirecting to admin dashboard');
            return res.redirect('/admin/dashboard');
        } else {
            console.log('Redirecting to home');
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

        // Add leetcodeUsername if user is not admin and it's provided
        if (!req.user.isAdmin) {
            if (!leetcodeUsername) {
                return res.render('profile', {
                    user: req.user,
                    error: 'LeetCode username is required for regular users'
                });
            }
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

exports.getForgotPasswordPage = (req, res) => {
    res.render('forgot-password');
};

exports.sendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate OTP
        const otp = generateOTP();
        
        // Store OTP with 1-minute expiry
        otpStore.set(email, {
            otp,
            expiry: Date.now() + 60000 // 1 minute from now
        });

        // Send OTP via email
        await sendEmail(
            email,
            'Password Reset OTP',
            `Your OTP for password reset is: ${otp}. This OTP will expire in 1 minute.`,
            `<h2>Password Reset OTP</h2>
            <p>Your OTP for password reset is: <strong>${otp}</strong></p>
            <p>This OTP will expire in 1 minute.</p>`
        );

        res.json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.status(500).json({ error: 'Error sending OTP' });
    }
};

exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        const storedOTPData = otpStore.get(email);
        
        if (!storedOTPData) {
            return res.status(400).json({ error: 'OTP expired or not found' });
        }

        if (Date.now() > storedOTPData.expiry) {
            otpStore.delete(email);
            return res.status(400).json({ error: 'OTP expired' });
        }

        if (storedOTPData.otp !== otp) {
            return res.status(400).json({ error: 'Invalid OTP' });
        }

        // OTP verified successfully
        otpStore.delete(email); // Clear the OTP
        res.json({ message: 'OTP verified successfully' });
    } catch (error) {
        console.error('Error verifying OTP:', error);
        res.status(500).json({ error: 'Error verifying OTP' });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Set the new password - it will be hashed by the pre-save hook
        user.password = newPassword;
        await user.save();

        // Clear any existing OTP data
        otpStore.delete(email);

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ error: 'Error resetting password' });
    }
}; 