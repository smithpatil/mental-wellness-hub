const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getResources, getResource } = require('../controllers/resourceController');

router.get('/', protect, getResources);
router.get('/:id', protect, getResource);

module.exports = router;
