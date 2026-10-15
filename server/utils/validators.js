const { body } = require('express-validator');

const signupValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }).withMessage('Name too long'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/\d/)
    .withMessage('Password must contain a number'),
  // Public signup can never self-assign a privileged role: the field is accepted but ignored server-side.
  body('role').optional().isIn(['user', 'counselor', 'admin']).withMessage('Invalid role'),
  body('consent').equals('true').withMessage('You must accept the terms and privacy notice to register').toBoolean(),
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

const moodValidation = [
  body('mood')
    .isIn(['happy', 'neutral', 'okay', 'sad', 'angry', 'crying'])
    .withMessage('Invalid mood value'),
  body('journal')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Journal entry too long (max 2000 chars)'),
];

const forumPostValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('body').trim().notEmpty().withMessage('Body is required').isLength({ max: 5000 }),
  body('category')
    .isIn(['anxiety', 'depression', 'stress', 'relationships', 'general'])
    .withMessage('Invalid category'),
];

const appointmentValidation = [
  body('counselorId').notEmpty().withMessage('Counselor is required'),
  body('dateTime').isISO8601().withMessage('Valid date/time is required'),
  body('notes').optional().isString().isLength({ max: 1000 }).withMessage('Notes too long (max 1000 chars)'),
];

module.exports = {
  signupValidation,
  loginValidation,
  moodValidation,
  forumPostValidation,
  appointmentValidation,
};
