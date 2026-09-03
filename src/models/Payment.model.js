const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true,
    index: true,
  },
  registrationNumber: {
    type: String,
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
    default: 4700, // ₦4,700 - JAMB registration fee
  },
  currency: {
    type: String,
    default: 'NGN',
  },
  reference: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  accessCode: String,
  authorizationUrl: String,
  status: {
    type: String,
    enum: ['pending', 'success', 'failed', 'abandoned'],
    default: 'pending',
    index: true,
  },
  transactionData: {
    type: mongoose.Schema.Types.Mixed,
  },
  paymentMethod: String,
  paidAt: Date,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
  retryCount: {
    type: Number,
    default: 0,
  },
  // Link to candidate's payment reference
  candidatePaymentReference: String,
}, {
  timestamps: true,
});

// Compound index for faster queries
paymentSchema.index({ candidateId: 1, status: 1 });
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);