const mongoose = require('mongoose');

const counselorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    specialization: {
      type: String,
      required: true,
      enum: ['anxiety', 'depression', 'stress', 'relationships', 'mindfulness', 'general'],
    },
    bio: {
      type: String,
      maxlength: 1000,
    },
    photoUrl: {
      type: String,
      default: '',
    },
    experience: {
      type: Number,
      default: 0,
    },
    availableSlots: [
      {
        day: {
          type: String,
          enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        },
        startTime: String,
        endTime: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Counselor', counselorSchema);
