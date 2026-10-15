const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { recommendLimiter } = require('../middleware/rateLimiter');
const { requireConsent } = require('../middleware/consent');
const { recommend } = require('../controllers/recommendController');

router.post('/', protect, recommendLimiter, requireConsent('recommender'), recommend);

module.exports = router;
