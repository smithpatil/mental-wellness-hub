const mongoose = require('mongoose');

// One document per issued refresh token. Rotated on every use; the whole family is revoked if an
// already-used token is presented again (token theft / replay).
const refreshTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    csrfHash: { type: String, required: true },
    family: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    replacedBy: { type: String },
  },
  { timestamps: true }
);

// Documents are removed automatically after expiry.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
