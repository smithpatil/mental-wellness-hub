const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { authLimiter, refreshLimiter } = require('../middleware/rateLimiter');
const { signupValidation, loginValidation } = require('../utils/validators');
const c = require('../controllers/authController');

router.post('/signup', authLimiter, signupValidation, c.signup);
router.post('/login', authLimiter, loginValidation, c.login);
router.post('/refresh', refreshLimiter, c.refresh);
router.post('/logout', c.logout);
router.post('/forgot-password', authLimiter, c.forgotPassword);
router.put('/reset-password/:token', authLimiter, c.resetPassword);

router.get('/me', protect, c.getMe);
router.put('/profile', protect, c.updateProfile);
router.get('/export', protect, c.exportMyData);
router.delete('/account', protect, c.deleteMyAccount);
router.post('/consent/recommender', protect, c.consentRecommender);
router.delete('/consent/recommender', protect, c.withdrawRecommenderConsent);

module.exports = router;
