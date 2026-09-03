const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { protect, restrictTo } = require('../middleware/auth.middleware');

// Public webhook endpoint (no auth). Paystack signs the RAW request bytes, so
// app.js stashes them on req.rawBody via express.json({ verify }) — see
// verifyWebhookSignature in payment.service.js.
router.post('/webhook', paymentController.handleWebhook);

// Protected routes
router.use(protect);

// Initialize payment
router.post('/initialize', paymentController.initializePayment);

// Verify payment
router.get('/verify/:reference', paymentController.verifyPayment);

// Get payment status
router.get('/status/:reference', paymentController.getPaymentStatus);

// Check if candidate has paid
router.get('/candidate/:candidateId/has-paid', paymentController.hasPaid);

// Get candidate payment history
router.get('/candidate/:candidateId/payments', paymentController.getCandidatePayments);

// Admin only: payment statistics
router.use(restrictTo('admin', 'super_admin'));

// Payment statistics
router.get('/stats', paymentController.getPaymentStats);

// Refund payment
router.post('/refund/:reference', paymentController.refundPayment);

module.exports = router;