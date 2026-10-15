const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/fieldCrypto');

const appointmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    counselorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Counselor',
      required: true,
    },
    dateTime: {
      type: Date,
      required: [true, 'Date and time is required'],
    },
    duration: {
      type: Number,
      default: 50,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled',
    },
    // Counselling request notes: encrypted at rest; length (<= 1000) enforced by request validation.
    notes: {
      type: String,
      set: (v) => encrypt(v, 'Appointment.notes'),
      get: (v) => decrypt(v, 'Appointment.notes'),
    },
    videoLink: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { getters: true },
    toObject: { getters: true },
  }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
