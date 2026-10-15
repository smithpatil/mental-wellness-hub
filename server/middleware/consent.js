// Purpose-specific consent gate (data protection: consent and purpose limitation).
const requireConsent = (purpose) => (req, res, next) => {
  const c = req.user && req.user.consent && req.user.consent[purpose];
  if (!c || !c.at) {
    return res.status(403).json({
      success: false, code: 'CONSENT_REQUIRED', purpose,
      message: 'Please give consent before using this feature.',
    });
  }
  next();
};

module.exports = { requireConsent };
