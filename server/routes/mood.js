const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { moodValidation } = require('../utils/validators');
const { logMood, getMoodHistory, getMoodTrends, exportMoodData } = require('../controllers/moodController');

router.post('/', protect, moodValidation, logMood);
router.get('/history', protect, getMoodHistory);
router.get('/trends', protect, getMoodTrends);
router.get('/export', protect, exportMoodData);

module.exports = router;
