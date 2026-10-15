const Resource = require('../models/Resource');

// @desc    Get resources with search & filter
// @route   GET /api/resources
exports.getResources = async (req, res, next) => {
  try {
    const { search, category, type, page = 1, limit = 12 } = req.query;

    const query = {};
    if (category) query.category = category;
    if (type) query.type = type;
    if (search) {
      query.$text = { $search: search };
    }

    const resources = await Resource.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Resource.countDocuments(query);

    res.json({
      success: true,
      data: resources,
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

// @desc    Get single resource
// @route   GET /api/resources/:id
exports.getResource = async (req, res, next) => {
  try {
    const resource = await Resource.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );

    if (!resource) {
      return res.status(404).json({ success: false, message: 'Resource not found' });
    }

    res.json({ success: true, data: resource });
  } catch (error) {
    next(error);
  }
};
