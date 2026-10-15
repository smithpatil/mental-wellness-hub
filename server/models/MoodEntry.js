const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/fieldCrypto');

const moodEntrySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    mood: {
      type: String,
      enum: ['happy', 'neutral', 'okay', 'sad', 'angry', 'crying'],
      required: [true, 'Mood is required'],
    },
    moodScore: {
      type: Number,
      min: 1,
      max: 5,
    },
    // Encrypted at rest (AES-256-GCM). Length (<= 2000 chars) is enforced by request validation
    // because the stored ciphertext is longer than the plaintext.
    journal: {
      type: String,
      set: (v) => encrypt(v, 'MoodEntry.journal'),
      get: (v) => decrypt(v, 'MoodEntry.journal'),
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

// Map mood to score on save
moodEntrySchema.pre('save', function (next) {
  const moodScoreMap = { happy: 5, neutral: 4, okay: 3, sad: 2, angry: 2, crying: 1 };
  this.moodScore = moodScoreMap[this.mood] || 3;
  next();
});

// One mood entry per user per day
moodEntrySchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('MoodEntry', moodEntrySchema);
