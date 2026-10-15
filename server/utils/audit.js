const AuditLog = require('../models/AuditLog');

// Never throws: auditing must not break the request path.
async function audit(req, action, { actor, outcome = 'success', target, meta } = {}) {
  try {
    const who = actor || req.user;
    await AuditLog.create({
      actorId: who && (who._id || who.id),
      actorRole: who && who.role,
      action,
      outcome,
      ip: req.ip,
      target,
      meta,
    });
  } catch (err) {
    console.error('audit log failed:', err.message);
  }
}

module.exports = audit;
