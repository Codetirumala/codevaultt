const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();
const { auth } = require('./middleware/auth');
const homeController = require('./controllers/homeController');
const { sendEmail } = require('./services/emailService');
const app = express();
const fileUpload = require('express-fileupload');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// Auth middleware should come after cookie-parser
app.use(auth);

// Add this middleware
app.use(fileUpload({
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max-file-size
}));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/', require('./routes/auth'));
app.use('/dsa', require('./routes/dsa'));
app.use('/companies', require('./routes/companies'));
app.use('/roadmap', require('./routes/roadmap'));
app.use('/admin', require('./routes/admin'));
app.use('/email', require('./routes/email'));

// Add route debugging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Home route
app.get('/', homeController.getHomePage);

// Forgot password route
app.get('/forgot-password', (req, res) => {
  res.render('forgot-password');
});

// Add a 404 handler
// app.use((req, res) => {
//     res.status(404).render('error', { 
//         message: 'Page not found' 
//     });
// });

// Error handler middleware (place this after all routes)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', {
        message: process.env.NODE_ENV === 'development' 
            ? err.message 
            : 'Internal server error'
    });
});

// Import all models
require('./models/User');  // if you have this
require('./models/Topic');
require('./models/Problem');
require('./models/Submission');  // Add this line

// MongoDB connection with debug logging
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('MongoDB connected successfully');
    // Log registered models to verify
    console.log('Registered Models:', mongoose.modelNames());
    // Log the connection string (remove sensitive info)
    const sanitizedUri = process.env.MONGODB_URI.replace(
        /mongodb(\+srv)?:\/\/([^:]+):([^@]+)@/,
        'mongodb$1://***:***@'
    );
    console.log('Using database:', sanitizedUri);
})
.catch(err => {
    console.error('MongoDB connection error:', err);
});

// Add this to see if Mongoose is connected
app.use((req, res, next) => {
    if (mongoose.connection.readyState !== 1) {
        console.log('MongoDB not connected. Current state:', mongoose.connection.readyState);
    }
    next();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 