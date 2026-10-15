const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getNotes, createNote, updateNote, deleteNote } = require('../controllers/gratitudeController');

router.get('/', protect, getNotes);
router.post('/', protect, createNote);
router.put('/:id', protect, updateNote);
router.delete('/:id', protect, deleteNote);

module.exports = router;
