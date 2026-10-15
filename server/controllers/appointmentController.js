const { validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');

// @desc    Book appointment
// @route   POST /api/appointments
exports.bookAppointment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { counselorId, dateTime, notes } = req.body;

    // Check for conflicting appointments
    const conflict = await Appointment.findOne({
      counselorId,
      dateTime: new Date(dateTime),
      status: { $in: ['scheduled', 'rescheduled'] },
    });

    if (conflict) {
      return res.status(400).json({ success: false, message: 'This time slot is already booked' });
    }

    const appointment = await Appointment.create({
      userId: req.user.id,
      counselorId,
      dateTime: new Date(dateTime),
      notes,
      videoLink: `https://meet.wellness.app/session-${Date.now()}`,
    });

    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's appointments
// @route   GET /api/appointments
exports.getAppointments = async (req, res, next) => {
  try {
    const { status } = req.query;
    const query = { userId: req.user.id };
    if (status) query.status = status;

    const appointments = await Appointment.find(query)
      .populate('counselorId', 'name specialization photoUrl')
      .sort({ dateTime: -1 });

    res.json({ success: true, data: appointments });
  } catch (error) {
    next(error);
  }
};

// @desc    Reschedule appointment
// @route   PUT /api/appointments/:id
exports.rescheduleAppointment = async (req, res, next) => {
  try {
    let appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (appointment.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    appointment.dateTime = new Date(req.body.dateTime);
    appointment.status = 'rescheduled';
    await appointment.save();

    res.json({ success: true, data: appointment });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel appointment
// @route   DELETE /api/appointments/:id
exports.cancelAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (appointment.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    res.json({ success: true, message: 'Appointment cancelled' });
  } catch (error) {
    next(error);
  }
};
