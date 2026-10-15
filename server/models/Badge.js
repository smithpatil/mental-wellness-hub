const mongoose = require('mongoose');

const badgeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    required: true,
  },
  criteria: {
    type: {
      type: String,
      enum: ['streak', 'mood_logs', 'resources_read', 'gratitude_entries', 'forum_posts', 'sessions_booked'],
      required: true,
    },
    threshold: {
      type: Number,
      required: true,
    },
  },
  points: {
    type: Number,
    default: 10,
  },
});

module.exports = mongoose.model('Badge', badgeSchema);
