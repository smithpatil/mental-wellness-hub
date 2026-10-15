const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getMyRewards, checkBadges } = require('../controllers/gamificationController');

router.get('/me', protect, getMyRewards);
router.post('/check-badges', protect, checkBadges);

module.exports = router;
