const axios = require('axios');
const User = require('../models/User');

exports.getHomePage = async (req, res) => {
    try {
        const data = {
            user: null,
            profile: null,
            error: null  // Initialize error here
        };

        // Check if user is authenticated
        if (!req.user) {
            return res.render('home', data);
        }

        data.user = req.user;

        // Validate if leetcodeUsername exists
        if (!req.user.leetcodeUsername) {
            data.error = 'LeetCode username not found. Please update your profile.';
            return res.render('home', data);
        }

        try {
            // Fetch profile data from the API
            const apiUrl = `https://leetcode-api-pied.vercel.app/user/${req.user.leetcodeUsername}`;
            const response = await axios.get(apiUrl);
            
            if (!response.data) {
                throw new Error('No data received from API');
            }

            // Structure the profile data
            data.profile = {
                username: response.data.username,
                ranking: response.data.profile.ranking,
                totalSolved: response.data.submitStats.acSubmissionNum[0]?.count || 0,
                easySolved: response.data.submitStats.acSubmissionNum[1]?.count || 0,
                mediumSolved: response.data.submitStats.acSubmissionNum[2]?.count || 0,
                hardSolved: response.data.submitStats.acSubmissionNum[3]?.count || 0,
                acceptanceRate: Math.round((response.data.submitStats.acSubmissionNum[0]?.count / 
                    response.data.submitStats.totalSubmissionNum[0]?.count) * 100) || 0
            };

        } catch (apiError) {
            console.error('API Error:', apiError);
            data.error = 'Failed to fetch LeetCode profile data';
        }

        return res.render('home', data);

    } catch (error) {
        console.error('Error:', error);
        return res.render('home', {
            user: req.user,
            profile: null,
            error: 'Failed to fetch LeetCode profile. Please ensure your LeetCode username is correct.'
        });
    }
};

