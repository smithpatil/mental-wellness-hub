const User = require('../models/User');
const Counselor = require('../models/Counselor');
const Appointment = require('../models/Appointment');
const MoodEntry = require('../models/MoodEntry');
const ForumPost = require('../models/ForumPost');

// @desc    Get all users
// @route   GET /api/admin/users
exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user active status
// @route   PUT /api/admin/users/:id/status
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.isActive = !user.isActive;
    await user.save();
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all counselors (admin)
// @route   GET /api/admin/counselors
exports.getAllCounselors = async (req, res, next) => {
  try {
    const counselors = await Counselor.find().sort({ createdAt: -1 });
    res.json({ success: true, data: counselors });
  } catch (error) {
    next(error);
  }
};

// @desc    Add counselor
// @route   POST /api/admin/counselors
exports.addCounselor = async (req, res, next) => {
  try {
    const counselor = await Counselor.create(req.body);
    res.status(201).json({ success: true, data: counselor });
  } catch (error) {
    next(error);
  }
};

// @desc    Update counselor
// @route   PUT /api/admin/counselors/:id
exports.updateCounselor = async (req, res, next) => {
  try {
    const counselor = await Counselor.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!counselor) {
      return res.status(404).json({ success: false, message: 'Counselor not found' });
    }
    res.json({ success: true, data: counselor });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete counselor
// @route   DELETE /api/admin/counselors/:id
exports.deleteCounselor = async (req, res, next) => {
  try {
    const counselor = await Counselor.findByIdAndDelete(req.params.id);
    if (!counselor) {
      return res.status(404).json({ success: false, message: 'Counselor not found' });
    }
    res.json({ success: true, message: 'Counselor deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all appointments
// @route   GET /api/admin/appointments
exports.getAllAppointments = async (req, res, next) => {
  try {
    const appointments = await Appointment.find()
      .populate('userId', 'name email')
      .populate('counselorId', 'name specialization')
      .sort({ dateTime: -1 });
    res.json({ success: true, data: appointments });
  } catch (error) {
    next(error);
  }
};

// @desc    Get platform analytics
// @route   GET /api/admin/analytics
exports.getAnalytics = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const totalCounselors = await Counselor.countDocuments({ isActive: true });
    const totalAppointments = await Appointment.countDocuments();
    const totalForumPosts = await ForumPost.countDocuments();

    // Mood distribution
    const moodDistribution = await MoodEntry.aggregate([
      { $group: { _id: '$mood', count: { $sum: 1 } } },
    ]);

    // Users registered in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsers = await User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } });

    // Appointments this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthlyAppointments = await Appointment.countDocuments({
      dateTime: { $gte: monthStart },
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        newUsers,
        totalCounselors,
        totalAppointments,
        monthlyAppointments,
        totalForumPosts,
        moodDistribution,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reported posts
// @route   GET /api/admin/forum/reported
exports.getReportedPosts = async (req, res, next) => {
  try {
    const posts = await ForumPost.find({ isReported: true })
      .populate('authorId', 'name email')
      .sort({ reportCount: -1 });
    res.json({ success: true, data: posts });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete forum post
// @route   DELETE /api/admin/forum/:id
exports.deleteForumPost = async (req, res, next) => {
  try {
    await ForumPost.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    next(error);
  }
};
