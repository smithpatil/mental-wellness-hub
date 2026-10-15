const { validationResult } = require('express-validator');
const ForumPost = require('../models/ForumPost');

// @desc    Get all forum posts
// @route   GET /api/forum
exports.getPosts = async (req, res, next) => {
  try {
    const { category, page = 1, limit = 20 } = req.query;
    const query = {};
    if (category) query.category = category;

    const posts = await ForumPost.find(query)
      .populate('authorId', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ForumPost.countDocuments(query);

    // Sanitize anonymous posts
    const sanitized = posts.map((p) => {
      const post = p.toObject();
      if (post.isAnonymous) {
        post.authorId = { name: 'Anonymous' };
      }
      post.likeCount = post.likes ? post.likes.length : 0;
      post.replyCount = post.replies ? post.replies.length : 0;
      delete post.likes;
      delete post.reportedBy;
      return post;
    });

    res.json({
      success: true,
      data: sanitized,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create forum post
// @route   POST /api/forum
exports.createPost = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { title, body, category, isAnonymous } = req.body;
    const post = await ForumPost.create({
      authorId: req.user.id,
      title,
      body,
      category,
      isAnonymous: isAnonymous !== false,
    });

    res.status(201).json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single post with replies
// @route   GET /api/forum/:id
exports.getPost = async (req, res, next) => {
  try {
    const post = await ForumPost.findById(req.params.id)
      .populate('authorId', 'name')
      .populate('replies.authorId', 'name');

    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const result = post.toObject();
    if (result.isAnonymous) {
      result.authorId = { name: 'Anonymous' };
    }
    result.likeCount = result.likes.length;
    result.isLiked = result.likes.some((id) => id.toString() === req.user.id);

    // Sanitize anonymous replies
    result.replies = result.replies.map((r) => {
      if (r.isAnonymous) {
        r.authorId = { name: 'Anonymous' };
      }
      r.likeCount = r.likes ? r.likes.length : 0;
      return r;
    });

    delete result.likes;
    delete result.reportedBy;

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// @desc    Reply to post
// @route   POST /api/forum/:id/reply
exports.replyToPost = async (req, res, next) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    post.replies.push({
      authorId: req.user.id,
      body: req.body.body,
      isAnonymous: req.body.isAnonymous !== false,
    });

    await post.save();
    res.status(201).json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle like on post
// @route   PUT /api/forum/:id/like
exports.toggleLike = async (req, res, next) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const index = post.likes.indexOf(req.user.id);
    if (index > -1) {
      post.likes.splice(index, 1);
    } else {
      post.likes.push(req.user.id);
    }

    await post.save();
    res.json({ success: true, likeCount: post.likes.length, isLiked: index === -1 });
  } catch (error) {
    next(error);
  }
};

// @desc    Report post
// @route   POST /api/forum/:id/report
exports.reportPost = async (req, res, next) => {
  try {
    const post = await ForumPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    if (post.reportedBy.includes(req.user.id)) {
      return res.status(400).json({ success: false, message: 'Already reported' });
    }

    post.reportedBy.push(req.user.id);
    post.reportCount += 1;
    if (post.reportCount >= 3) {
      post.isReported = true;
    }

    await post.save();
    res.json({ success: true, message: 'Post reported' });
  } catch (error) {
    next(error);
  }
};
