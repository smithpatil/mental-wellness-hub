const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getCounselors, getCounselor } = require('../controllers/counselorController');

router.get('/', protect, getCounselors);
router.get('/:id', protect, getCounselor);

module.exports = router;
