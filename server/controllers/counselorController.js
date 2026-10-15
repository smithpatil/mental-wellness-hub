const Counselor = require('../models/Counselor');

// @desc    Get all active counselors
// @route   GET /api/counselors
exports.getCounselors = async (req, res, next) => {
  try {
    const { specialization } = req.query;
    const query = { isActive: true };
    if (specialization) query.specialization = specialization;

    const counselors = await Counselor.find(query).sort({ rating: -1 });
    res.json({ success: true, data: counselors });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single counselor
// @route   GET /api/counselors/:id
exports.getCounselor = async (req, res, next) => {
  try {
    const counselor = await Counselor.findById(req.params.id);
    if (!counselor) {
      return res.status(404).json({ success: false, message: 'Counselor not found' });
    }
    res.json({ success: true, data: counselor });
  } catch (error) {
    next(error);
  }
};
