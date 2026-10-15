const User = require('../models/User');
const Badge = require('../models/Badge');
const MoodEntry = require('../models/MoodEntry');
const GratitudeNote = require('../models/GratitudeNote');
const ForumPost = require('../models/ForumPost');
const Resource = require('../models/Resource');

// @desc    Get user rewards & badges
// @route   GET /api/gamification/me
exports.getMyRewards = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('badges');
    const allBadges = await Badge.find();

    // Calculate weekly goals
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const moodLogs = await MoodEntry.countDocuments({
      userId: req.user.id,
      date: { $gte: weekAgo },
    });

    const gratitudeEntries = await GratitudeNote.countDocuments({
      userId: req.user.id,
      createdAt: { $gte: weekAgo },
    });

    res.json({
      success: true,
      data: {
        points: user.points,
        streak: user.streak,
        earnedBadges: user.badges,
        allBadges,
        weeklyGoals: {
          moodLogs: { current: moodLogs, target: 5 },
          gratitudeEntries: { current: gratitudeEntries, target: 3 },
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check and award badges
// @route   POST /api/gamification/check-badges
exports.checkBadges = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const allBadges = await Badge.find();
    const newBadges = [];

    for (const badge of allBadges) {
      if (user.badges.includes(badge._id)) continue;

      let earned = false;

      switch (badge.criteria.type) {
        case 'streak':
          earned = user.streak >= badge.criteria.threshold;
          break;
        case 'mood_logs': {
          const count = await MoodEntry.countDocuments({ userId: user._id });
          earned = count >= badge.criteria.threshold;
          break;
        }
        case 'gratitude_entries': {
          const count = await GratitudeNote.countDocuments({ userId: user._id });
          earned = count >= badge.criteria.threshold;
          break;
        }
        case 'forum_posts': {
          const count = await ForumPost.countDocuments({ authorId: user._id });
          earned = count >= badge.criteria.threshold;
          break;
        }
      }

      if (earned) {
        user.badges.push(badge._id);
        user.points += badge.points;
        newBadges.push(badge);
      }
    }

    if (newBadges.length > 0) {
      await user.save();
    }

    res.json({
      success: true,
      data: {
        newBadges,
        totalPoints: user.points,
      },
    });
  } catch (error) {
    next(error);
  }
};
