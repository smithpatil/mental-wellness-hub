const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { generateChatResponse } = require('../controllers/chatbotController');
const { recommendLimiter } = require('../middleware/rateLimiter');

// The chat endpoint calls a paid external LLM, so it is rate limited per user.
router.post('/', protect, recommendLimiter, generateChatResponse);

module.exports = router;
