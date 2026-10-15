const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { appointmentValidation } = require('../utils/validators');
const {
  bookAppointment,
  getAppointments,
  rescheduleAppointment,
  cancelAppointment,
} = require('../controllers/appointmentController');

router.post('/', protect, appointmentValidation, bookAppointment);
router.get('/', protect, getAppointments);
router.put('/:id', protect, rescheduleAppointment);
router.delete('/:id', protect, cancelAppointment);

module.exports = router;
