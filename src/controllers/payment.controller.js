const PaymentService = require('../services/payment.service');
const Candidate = require('../models/Candidate.model');
const AppError = require('../utils/AppError');
const { sendSuccess, sendError } = require('../utils/apiResponse');
const logger = require('../utils/logger');

class PaymentController {
  // Initialize payment for exam registration
  async initializePayment(req, res, next) {
    try {
      const { candidateId, email, callbackUrl } = req.body;

      if (!candidateId) {
        return sendError(res, 'Candidate ID is required', 400);
      }

      // Check if candidate exists
      const candidate = await Candidate.findById(candidateId);
      if (!candidate) {
        return sendError(res, 'Candidate not found', 404);
      }

      // Check if candidate has already paid
      if (candidate.payment && candidate.payment.status === 'paid') {
        return sendError(res, 'Candidate has already paid for registration', 400);
      }

      const result = await PaymentService.initializePayment(
        candidateId,
        email || candidate.email,
        callbackUrl
      );

      return sendSuccess(res, 200, 'Payment initialized successfully', {
        authorizationUrl: result.authorizationUrl,
        reference: result.reference,
        accessCode: result.accessCode,
      });
    } catch (error) {
      next(error);
    }
  }

  // Verify payment
  async verifyPayment(req, res, next) {
    try {
      const { reference } = req.params;

      if (!reference) {
        return sendError(res, 'Payment reference is required', 400);
      }

      const payment = await PaymentService.verifyPayment(reference);

      return sendSuccess(res, 200, 'Payment verified successfully', {
        status: payment.status,
        amount: payment.amount,
        reference: payment.reference,
        paidAt: payment.paidAt,
        paymentMethod: payment.paymentMethod,
      });
    } catch (error) {
      next(error);
    }
  }

  // Handle Paystack webhook
  async handleWebhook(req, res, next) {
    try {
      const payload = req.body;
      const signature = req.headers['x-paystack-signature'];

      if (!signature) {
        return sendError(res, 'Missing webhook signature', 401);
      }

      // req.rawBody is captured by express.json({ verify }) in app.js.
      const result = await PaymentService.handleWebhook(payload, signature, req.rawBody);

      return res.status(200).json(result);
    } catch (error) {
      // Return 200 to prevent Paystack from retrying
      logger.error('Webhook error:', error);
      return res.status(200).json({ status: 'error', message: error.message });
    }
  }

  // Get payment status
  async getPaymentStatus(req, res, next) {
    try {
      const { reference } = req.params;

      if (!reference) {
        return sendError(res, 'Payment reference is required', 400);
      }

      const payment = await PaymentService.getPaymentStatus(reference);

      return sendSuccess(res, 200, 'Payment status retrieved', {
        status: payment.status,
        amount: payment.amount,
        reference: payment.reference,
        paidAt: payment.paidAt,
        paymentMethod: payment.paymentMethod,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get candidate payment history
  async getCandidatePayments(req, res, next) {
    try {
      const { candidateId } = req.params;

      if (!candidateId) {
        return sendError(res, 'Candidate ID is required', 400);
      }

      const payments = await PaymentService.getCandidatePayments(candidateId);

      return sendSuccess(res, 200, 'Candidate payments retrieved', payments);
    } catch (error) {
      next(error);
    }
  }

  // Check if candidate has paid
  async hasPaid(req, res, next) {
    try {
      const { candidateId } = req.params;

      if (!candidateId) {
        return sendError(res, 'Candidate ID is required', 400);
      }

      const hasPaid = await PaymentService.hasPaid(candidateId);

      return sendSuccess(res, 200, 'Payment status checked', { 
        hasPaid,
        paymentStatus: hasPaid ? 'paid' : 'unpaid'
      });
    } catch (error) {
      next(error);
    }
  }

  // Get payment statistics (admin only)
  async getPaymentStats(req, res, next) {
    try {
      const { startDate, endDate } = req.query;

      const stats = await PaymentService.getPaymentStats(startDate, endDate);

      return sendSuccess(res, 200, 'Payment statistics retrieved', stats);
    } catch (error) {
      next(error);
    }
  }

  // Refund payment (admin only)
  async refundPayment(req, res, next) {
    try {
      const { reference } = req.params;
      const { reason } = req.body;

      if (!reference) {
        return sendError(res, 'Payment reference is required', 400);
      }

      const result = await PaymentService.refundPayment(reference, reason);

      return sendSuccess(res, 200, 'Payment refunded successfully', result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentController();