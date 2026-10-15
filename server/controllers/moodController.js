const { validationResult } = require('express-validator');
const MoodEntry = require('../models/MoodEntry');
const User = require('../models/User');

// @desc    Log mood
// @route   POST /api/mood
exports.logMood = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { mood, journal } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already logged today
    let entry = await MoodEntry.findOne({
      userId: req.user.id,
      date: { $gte: today, $lt: new Date(today.getTime() + 86400000) },
    });

    if (entry) {
      entry.mood = mood;
      entry.journal = journal || entry.journal;
      await entry.save();
    } else {
      entry = await MoodEntry.create({
        userId: req.user.id,
        mood,
        journal,
        date: new Date(),
      });

      // Update user's last mood log and points
      await User.findByIdAndUpdate(req.user.id, {
        lastMoodLog: new Date(),
        $inc: { points: 5 },
      });
    }

    res.status(201).json({ success: true, data: entry });
  } catch (error) {
    next(error);
  }
};

// @desc    Get mood history
// @route   GET /api/mood/history
exports.getMoodHistory = async (req, res, next) => {
  try {
    const { startDate, endDate, page = 1, limit = 30 } = req.query;

    const query = { userId: req.user.id };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const entries = await MoodEntry.find(query)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await MoodEntry.countDocuments(query);

    res.json({
      success: true,
      data: entries,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get mood trends
// @route   GET /api/mood/trends
exports.getMoodTrends = async (req, res, next) => {
  try {
    const { period = 'week' } = req.query;
    const daysBack = period === 'month' ? 30 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    startDate.setHours(0, 0, 0, 0);

    const entries = await MoodEntry.find({
      userId: req.user.id,
      date: { $gte: startDate },
    }).sort({ date: 1 });

    // Aggregate by day
    const trends = [];
    for (let i = 0; i < daysBack; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dayStart = new Date(d);
      const dayEnd = new Date(d);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayEntry = entries.find(
        (e) => e.date >= dayStart && e.date < dayEnd
      );

      trends.push({
        date: dayStart.toISOString().split('T')[0],
        mood: dayEntry ? dayEntry.mood : null,
        moodScore: dayEntry ? dayEntry.moodScore : null,
        hasJournal: dayEntry ? !!dayEntry.journal : false,
      });
    }

    res.json({ success: true, data: trends });
  } catch (error) {
    next(error);
  }
};

// @desc    Export mood data as JSON (PDF generated on frontend)
// @route   GET /api/mood/export
exports.exportMoodData = async (req, res, next) => {
  try {
    const entries = await MoodEntry.find({ userId: req.user.id })
      .sort({ date: -1 })
      .limit(90);

    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      data: {
        userName: user.name,
        exportDate: new Date().toISOString(),
        entries: entries.map((e) => ({
          date: e.date,
          mood: e.mood,
          moodScore: e.moodScore,
          journal: e.journal,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
