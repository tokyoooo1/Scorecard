const mongoose = require('mongoose');


const RETENTION_DAYS = Number(process.env.EMAIL_LOG_RETENTION_DAYS) || 180;

const emailLogSchema = new mongoose.Schema({
  to:      { type: String, required: true, lowercase: true, trim: true },
  subject: { type: String, required: true },
  template: { type: String, required: true, index: true },
  triggeredBy: String,
  status: {
    type:    String,
    enum:    ['queued', 'sending', 'sent', 'failed', 'permanently_failed'],
    default: 'queued',
    index:   true,
  },
  attempts:      { type: Number, default: 0 },
  maxAttempts:   { type: Number, default: 3 },
  lastAttemptAt: Date,
  sentAt:        Date,
  lastError:     String,
  messageId: String,
  dedupeKey: { type: String },
  relatedCandidate: { type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' },
  relatedUser:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  renderContext: { type: mongoose.Schema.Types.Mixed, select: false },
}, { timestamps: true });

emailLogSchema.index({ status: 1, attempts: 1, lastAttemptAt: 1 });

emailLogSchema.index(
  { dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } }
);

emailLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: RETENTION_DAYS * 24 * 60 * 60 }
);


emailLogSchema.methods.markSending = function () {
  this.status        = 'sending';
  this.attempts     += 1;
  this.lastAttemptAt = new Date();
  return this.save();
};

emailLogSchema.methods.markSent = function (messageId) {
  this.status    = 'sent';
  this.sentAt    = new Date();
  this.messageId = messageId;
  this.lastError = undefined;
  return this.save();
};

emailLogSchema.methods.markFailed = function (error) {
  this.lastError = String(error).slice(0, 500);
   this.status = this.attempts >= this.maxAttempts ? 'permanently_failed' : 'failed';
  return this.save();
};

module.exports = mongoose.model('EmailLog', emailLogSchema);
