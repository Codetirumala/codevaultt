const axios = require('axios');
const User = require('../models/User');

exports.getHomePage = async (req, res) => {
    try {
        console.log('1. Starting getHomePage function');
        const data = {
            user: null,
            profile: null,
            error: null  // Initialize error as null
        };

        // Check if user is authenticated
        console.log('2. Authentication status:', !!req.user);
        if (!req.user) {
            return res.render('home', data);
        }

        data.user = req.user;
        console.log('3. User data:', req.user);

        // Validate if leetcodeUsername exists
        console.log('4. LeetCode username:', req.user.leetcodeUsername);
        if (!req.user.leetcodeUsername) {
            data.error = 'LeetCode username not found. Please update your profile.';
            return res.render('home', data);
        }

        try {
            // Fetch profile data from the API
            const apiUrl = `https://leetcode-api-pied.vercel.app/user/${req.user.leetcodeUsername}`;
            console.log('5. Fetching from:', apiUrl);

            const response = await axios.get(apiUrl);
            console.log('6. Raw API Response:', response.data);
            
            if (!response.data) {
                throw new Error('No data received from API');
            }

            // Structure the profile data based on the actual API response
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

            console.log('7. Structured profile data:', data.profile);

        } catch (apiError) {
            console.error('API Error:', apiError);
            data.error = 'Failed to fetch LeetCode profile data';
        }

        return res.render('home', data);

    } catch (error) {
        console.error('Detailed Error:', error.message, error.stack);
        return res.render('home', {
            user: req.user,
            profile: null,
            error: 'Failed to fetch LeetCode profile. Please ensure your LeetCode username is correct.'
        });
    }
};

