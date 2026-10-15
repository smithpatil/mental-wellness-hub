const { validationResult } = require('express-validator');
const crypto = require('crypto');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const MoodEntry = require('../models/MoodEntry');
const GratitudeNote = require('../models/GratitudeNote');
const Appointment = require('../models/Appointment');
const ForumPost = require('../models/ForumPost');
const sendEmail = require('../utils/sendEmail');
const audit = require('../utils/audit');
const {
  COOKIE_NAME, CSRF_COOKIE, csrfCookieOptions, REFRESH_TTL_MS, sha256, randomToken, signAccessToken, cookieOptions, serializeCookie, parseCookies,
} = require('../utils/tokens');

const CONSENT_VERSION = '2026-10';
const MAX_FAILED = 5;
const LOCK_MS = 15 * 60 * 1000;

const publicUser = (u) => ({
  id: u._id, name: u.name, email: u.email, role: u.role, avatar: u.avatar, streak: u.streak, points: u.points,
  consent: { terms: !!(u.consent && u.consent.terms && u.consent.terms.at), recommender: !!(u.consent && u.consent.recommender && u.consent.recommender.at) },
});

// ---- refresh token helpers -------------------------------------------------------------------
async function issueSession(res, user, family = crypto.randomUUID()) {
  const refresh = randomToken(48);
  const csrf = randomToken(24);
  await RefreshToken.create({
    userId: user._id, tokenHash: sha256(refresh), csrfHash: sha256(csrf), family,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS()),
  });
  res.setHeader('Set-Cookie', [
    serializeCookie(COOKIE_NAME, refresh, cookieOptions()),
    serializeCookie(CSRF_COOKIE, csrf, csrfCookieOptions()),
  ]);
  return { token: signAccessToken(user._id), csrfToken: csrf };
}

const clearCookie = (res) =>
  res.setHeader('Set-Cookie', [
    serializeCookie(COOKIE_NAME, '', { ...cookieOptions(), maxAge: 0 }),
    serializeCookie(CSRF_COOKIE, '', { ...csrfCookieOptions(), maxAge: 0 }),
  ]);

// @route POST /api/auth/signup
exports.signup = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { name, email, password, institution } = req.body;
    if (await User.findOne({ email })) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // role is never taken from the request: public signup always creates a standard user.
    const user = await User.create({
      name, email, password, institution, role: 'user',
      consent: { terms: { version: CONSENT_VERSION, at: new Date() } },
    });
    const session = await issueSession(res, user);
    await audit(req, 'auth.signup', { actor: user });
    res.status(201).json({ success: true, ...session, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/auth/login
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Invalid input' });
    }
    const user = await User.findOne({ email }).select('+password');
    const invalid = async () => {
      await audit(req, 'auth.login', { actor: user || undefined, outcome: 'failure', target: user ? String(user._id) : undefined });
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    };
    if (!user) return invalid();

    if (user.lockUntil && user.lockUntil > Date.now()) {
      await audit(req, 'auth.login', { actor: user, outcome: 'denied', meta: { reason: 'locked' } });
      return res.status(423).json({ success: false, message: 'Account temporarily locked. Try again later.' });
    }
    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account is deactivated' });

    if (!(await user.matchPassword(password))) {
      user.failedLogins = (user.failedLogins || 0) + 1;
      if (user.failedLogins >= MAX_FAILED) {
        user.lockUntil = new Date(Date.now() + LOCK_MS);
        user.failedLogins = 0;
      }
      await user.save({ validateBeforeSave: false });
      return invalid();
    }

    user.failedLogins = 0;
    user.lockUntil = undefined;
    const now = new Date();
    if (user.lastLogin) {
      const diffHours = (now - user.lastLogin) / 36e5;
      if (diffHours >= 20 && diffHours <= 48) user.streak += 1;
      else if (diffHours > 48) user.streak = 1;
    } else {
      user.streak = 1;
    }
    user.lastLogin = now;
    await user.save({ validateBeforeSave: false });

    const session = await issueSession(res, user);
    await audit(req, 'auth.login', { actor: user });
    res.json({ success: true, ...session, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/auth/refresh   (cookie + X-CSRF-Token header)
exports.refresh = async (req, res, next) => {
  try {
    const raw = parseCookies(req.headers.cookie)[COOKIE_NAME];
    if (!raw) return res.status(401).json({ success: false, message: 'No session' });

    const record = await RefreshToken.findOne({ tokenHash: sha256(raw) });
    if (!record) {
      clearCookie(res);
      return res.status(401).json({ success: false, message: 'Invalid session' });
    }
    if (record.revokedAt) {
      // A rotated token was presented again: assume theft and revoke the whole family.
      await RefreshToken.updateMany({ family: record.family, revokedAt: { $exists: false } }, { revokedAt: new Date() });
      await audit(req, 'auth.refresh_reuse_detected', { actor: { _id: record.userId }, outcome: 'denied' });
      clearCookie(res);
      return res.status(401).json({ success: false, message: 'Session revoked' });
    }
    if (record.expiresAt < new Date()) {
      clearCookie(res);
      return res.status(401).json({ success: false, message: 'Session expired' });
    }
    const csrf = req.headers['x-csrf-token'];
    if (!csrf || sha256(String(csrf)) !== record.csrfHash) {
      await audit(req, 'auth.csrf_rejected', { actor: { _id: record.userId }, outcome: 'denied' });
      return res.status(403).json({ success: false, message: 'CSRF token missing or invalid' });
    }

    const user = await User.findById(record.userId);
    if (!user || !user.isActive) {
      await RefreshToken.updateMany({ family: record.family }, { revokedAt: new Date() });
      clearCookie(res);
      return res.status(401).json({ success: false, message: 'Account unavailable' });
    }

    const session = await issueSession(res, user, record.family);
    record.revokedAt = new Date();
    record.replacedBy = 'rotated';
    await record.save();
    res.json({ success: true, ...session, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/auth/logout   (cookie + X-CSRF-Token header)
exports.logout = async (req, res, next) => {
  try {
    const raw = parseCookies(req.headers.cookie)[COOKIE_NAME];
    if (raw) {
      const record = await RefreshToken.findOne({ tokenHash: sha256(raw) });
      if (record) {
        const csrf = req.headers['x-csrf-token'];
        if (!csrf || sha256(String(csrf)) !== record.csrfHash) {
          return res.status(403).json({ success: false, message: 'CSRF token missing or invalid' });
        }
        await RefreshToken.updateMany({ family: record.family, revokedAt: { $exists: false } }, { revokedAt: new Date() });
        await audit(req, 'auth.logout', { actor: { _id: record.userId } });
      }
    }
    clearCookie(res);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/auth/me
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate('badges');
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @route PUT /api/auth/profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, institution, avatar } = req.body;
    const update = {};
    if (typeof name === 'string') update.name = name;
    if (typeof institution === 'string') update.institution = institution;
    if (typeof avatar === 'string') update.avatar = avatar;
    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true, runValidators: true });
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/auth/forgot-password  (same response whether or not the account exists)
exports.forgotPassword = async (req, res, next) => {
  const generic = { success: true, message: 'If an account exists for that email, a reset link has been sent.' };
  try {
    if (typeof req.body.email !== 'string') return res.status(400).json({ success: false, message: 'Email is required' });
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.json(generic);

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    try {
      await sendEmail({
        email: user.email,
        subject: 'Password reset - Mental Wellness Hub',
        html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in 30 minutes. If you did not request it, ignore this email.</p>`,
      });
    } catch (emailError) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
    }
    await audit(req, 'auth.forgot_password', { actor: user });
    res.json(generic);
  } catch (error) {
    next(error);
  }
};

// @route PUT /api/auth/reset-password/:token
exports.resetPassword = async (req, res, next) => {
  try {
    if (typeof req.body.password !== 'string' || req.body.password.length < 6 || !/\d/.test(req.body.password)) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters and contain a number' });
    }
    const resetPasswordToken = crypto.createHash('sha256').update(String(req.params.token)).digest('hex');
    const user = await User.findOne({ resetPasswordToken, resetPasswordExpire: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    // all existing sessions end when the password changes
    await RefreshToken.updateMany({ userId: user._id, revokedAt: { $exists: false } }, { revokedAt: new Date() });
    await audit(req, 'auth.password_reset', { actor: user });
    res.json({ success: true, message: 'Password updated. Please sign in.' });
  } catch (error) {
    next(error);
  }
};

// @route POST /api/auth/consent/recommender
exports.consentRecommender = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { 'consent.recommender': { version: CONSENT_VERSION, at: new Date() } });
    await audit(req, 'consent.recommender_granted');
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// @route DELETE /api/auth/consent/recommender
exports.withdrawRecommenderConsent = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { $unset: { 'consent.recommender': 1 } });
    await audit(req, 'consent.recommender_withdrawn');
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// @route GET /api/auth/export   (data portability)
exports.exportMyData = async (req, res, next) => {
  try {
    const [user, mood, gratitude, appointments] = await Promise.all([
      User.findById(req.user.id).lean(),
      MoodEntry.find({ userId: req.user.id }),
      GratitudeNote.find({ userId: req.user.id }),
      Appointment.find({ userId: req.user.id }),
    ]);
    await audit(req, 'account.export');
    res.json({
      success: true,
      data: {
        exportedAt: new Date().toISOString(),
        profile: { name: user.name, email: user.email, institution: user.institution, consent: user.consent, createdAt: user.createdAt },
        mood: mood.map((m) => m.toJSON()),
        gratitude: gratitude.map((g) => g.toJSON()),
        appointments: appointments.map((a) => a.toJSON()),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @route DELETE /api/auth/account   (erasure)
exports.deleteMyAccount = async (req, res, next) => {
  try {
    const id = req.user.id;
    await Promise.all([
      MoodEntry.deleteMany({ userId: id }),
      GratitudeNote.deleteMany({ userId: id }),
      Appointment.deleteMany({ userId: id }),
      ForumPost.deleteMany({ authorId: id }),
      ForumPost.updateMany({}, { $pull: { replies: { authorId: id } } }),
      RefreshToken.deleteMany({ userId: id }),
    ]);
    await User.findByIdAndDelete(id);
    await audit(req, 'account.delete', { target: String(id) });
    clearCookie(res);
    res.json({ success: true, message: 'Your account and data have been deleted.' });
  } catch (error) {
    next(error);
  }
};
