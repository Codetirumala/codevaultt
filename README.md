# Code Vault - DSA Learning Platform Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Features](#features)
3. [Technology Stack](#technology-stack)
4. [Installation](#installation)
5. [Project Structure](#project-structure)
6. [User Roles & Authentication](#user-roles--authentication)
7. [API Documentation](#api-documentation)
8. [Database Schema](#database-schema)
9. [UI Components](#ui-components)
10. [Deployment Guide](#deployment-guide)

## Project Overview
Code Vault is a comprehensive DSA (Data Structures and Algorithms) learning platform designed to help students track their progress, practice problems, and prepare for technical interviews. The platform features a curated DSA sheet, company-wise problem sections, and progress tracking capabilities.

### Purpose
- Provide structured DSA learning path
- Track student progress
- Enable bulk user management for institutions
- Integrate with LeetCode for problem solving
- Offer company-specific preparation guides

## Features

### Core Features
1. **User Management**
   - Individual user registration
   - Bulk user registration via Excel
   - Role-based access (Admin/User)
   - First-time login setup

2. **DSA Sheet**
   - Curated problem sets
   - Topic-wise organization
   - Difficulty levels
   - Progress tracking

3. **Company Section**
   - Company-specific problems
   - Interview experiences
   - Preparation guides

4. **Progress Tracking**
   - Problem completion status
   - Performance analytics
   - Leaderboard system

5. **Admin Dashboard**
   - User management
   - Problem management
   - Analytics and statistics
   - Bulk user operations

## Technology Stack

### Frontend
- EJS (Embedded JavaScript templates)
- Bootstrap 5
- Custom CSS with CSS Variables
- JavaScript (ES6+)
- Font Awesome Icons

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose ODM

### Authentication & Security
- JWT (JSON Web Tokens)
- Bcrypt for password hashing
- Cookie-based authentication

### Additional Tools
- Excel file processing (xlsx)
- Email service integration
- File upload handling

## Installation

```bash
# Clone the repository
git clone [repository-url]

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Configure your .env file with:
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
EMAIL_SERVICE=your_email_service
EMAIL_USER=your_email
EMAIL_PASS=your_email_password

# Start the development server
node server.js
```

## Project Structure



## User Roles & Authentication

### User Types
1. **Admin**
   - Full platform management
   - User management
   - Content management

2. **Regular Users**
   - Problem solving
   - Progress tracking
   - Profile management

### Authentication Flow
1. **Regular Registration**
   - Email verification
   - Profile setup
   - LeetCode username integration

2. **Bulk Registration**
   - Excel file upload
   - Default password setup
   - First-time login flow

## Database Schema

### User Schema
```javascript
{
  name: String,
  email: String,
  password: String,
  rollNumber: String,
  branch: String,
  section: String,
  leetcodeUsername: String,
  isAdmin: Boolean,
  isFirstLogin: Boolean,
  createdAt: Date
}
```

### Problem Schema
```javascript
{
  name: String,
  difficulty: String,
  topic: ObjectId,
  leetcodeLink: String,
  solvedBy: Array
}
```

## UI Components

### Theme System
- Dark theme optimization
- Custom CSS variables
- Responsive design
- Consistent styling

### Key Components
1. Navigation Bar
2. Authentication Forms
3. Problem Cards
4. Progress Indicators
5. Admin Dashboard
6. Bulk Upload Interface

## Deployment Guide

### Prerequisites
- Node.js environment
- MongoDB database
- Email service credentials

### Deployment Steps
1. Server Setup
2. Environment Configuration
3. Database Migration
4. SSL Certificate Setup
5. Domain Configuration

### Monitoring
- Error logging
- Performance monitoring
- User analytics

## Future Enhancements
1. Real-time progress updates
2. Interview scheduling system
3. Discussion forum
4. Code submission system
5. Mobile application

## Support and Maintenance
- Regular updates
- Bug fixing
- Feature requests
- User support
