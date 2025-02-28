const express = require('express');
const router = express.Router();
const { sendEmail } = require('../services/emailService');

// Test email endpoint (protected, should be removed in production)
router.get('/test/:email/:message', async (req, res) => {
  try {
    const { email, message } = req.params;
    
    await sendEmail(
      email,
      'Test Email from CodeVault',
      message
    );

    res.status(200).json({ 
      success: true, 
      message: 'Test email sent successfully' 
    });
  } catch (error) {
    console.error('Route error:', error); // Add debug logging
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send email', 
      error: error.message 
    });
  }
});

// Add a test route to verify the router is working
router.get('/ping', (req, res) => {
  res.json({ message: 'Email router is working' });
});

module.exports = router; 