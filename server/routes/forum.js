const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { forumPostValidation } = require('../utils/validators');
const {
  getPosts,
  createPost,
  getPost,
  replyToPost,
  toggleLike,
  reportPost,
} = require('../controllers/forumController');

router.get('/', protect, getPosts);
router.post('/', protect, forumPostValidation, createPost);
router.get('/:id', protect, getPost);
router.post('/:id/reply', protect, replyToPost);
router.put('/:id/like', protect, toggleLike);
router.post('/:id/report', protect, reportPost);

module.exports = router;
