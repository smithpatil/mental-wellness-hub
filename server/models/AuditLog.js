const mongoose = require('mongoose');

// Append-only audit trail. It records WHO did WHAT and WHEN. It never stores free text such as
// journal content or recommender queries.
const auditLogSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now, index: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorRole: { type: String },
    action: { type: String, required: true, index: true },
    outcome: { type: String, enum: ['success', 'failure', 'denied'], default: 'success' },
    ip: { type: String },
    target: { type: String },
    meta: { type: mongoose.Schema.Types.Mixed },
  },
  { versionKey: false }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
