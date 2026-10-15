const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 500,
    },
    content: {
      type: String,
    },
    category: {
      type: String,
      enum: [
        'exam_stress', 'sleep', 'anxiety', 'low_mood', 'loneliness', 'time_management', 'relaxation', 'focus',
        // legacy categories kept so existing data still validates
        'depression', 'stress', 'relationships', 'mindfulness',
      ],
      required: true,
    },
    type: {
      type: String,
      enum: ['article', 'video', 'course', 'guide', 'exercise', 'reading'],
      required: true,
    },
    imageUrl: {
      type: String,
      default: '',
    },
    externalUrl: {
      type: String,
    },
    corpusId: { type: String, index: true },
    subtopic: { type: String },
    readTime: {
      type: Number,
      default: 5,
    },
    tags: [String],
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

resourceSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Resource', resourceSchema);
