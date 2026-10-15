const GratitudeNote = require('../models/GratitudeNote');

// @desc    Get all gratitude notes for user
// @route   GET /api/gratitude
exports.getNotes = async (req, res, next) => {
  try {
    const notes = await GratitudeNote.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: notes });
  } catch (error) {
    next(error);
  }
};

// @desc    Create gratitude note
// @route   POST /api/gratitude
exports.createNote = async (req, res, next) => {
  try {
    const note = await GratitudeNote.create({
      userId: req.user.id,
      content: req.body.content,
    });
    res.status(201).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

// @desc    Update gratitude note
// @route   PUT /api/gratitude/:id
exports.updateNote = async (req, res, next) => {
  try {
    let note = await GratitudeNote.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    if (note.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    note = await GratitudeNote.findByIdAndUpdate(
      req.params.id,
      { content: req.body.content },
      { new: true, runValidators: true }
    );

    res.json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete gratitude note
// @route   DELETE /api/gratitude/:id
exports.deleteNote = async (req, res, next) => {
  try {
    const note = await GratitudeNote.findById(req.params.id);

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found' });
    }

    if (note.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await note.deleteOne();
    res.json({ success: true, message: 'Note deleted' });
  } catch (error) {
    next(error);
  }
};
