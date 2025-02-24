const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();
const { auth } = require('./middleware/auth');
const homeController = require('./controllers/homeController');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));

// Auth middleware should come after cookie-parser
app.use(auth);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.use('/', require('./routes/auth'));
app.use('/dsa', require('./routes/dsa'));
app.use('/companies', require('./routes/companies'));
app.use('/roadmap', require('./routes/roadmap'));
app.use('/admin', require('./routes/admin'));

// Home route
app.get('/', homeController.getHomePage);

// Add a 404 handler
app.use((req, res) => {
    res.status(404).render('error', { 
        message: 'Page not found' 
    });
});

// Error handler middleware (place this after all routes)
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('error', {
        message: process.env.NODE_ENV === 'development' 
            ? err.message 
            : 'Internal server error'
    });
});

// MongoDB connection with debug logging
mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('Connected to MongoDB successfully');
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