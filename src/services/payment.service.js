const axios = require('axios');
const crypto = require('crypto');
const Payment = require('../models/Payment.model');
const Candidate = require('../models/Candidate.model');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
// const { channel } = require('diagnostics_channel');


class PaymentService {
    constructor(){

        this.secretKey = process.env.PAYSTACK_SECRET_KEY;
        this.publicKey = process.env.PAYSTACK_PUBLIC_KEY;
        this.webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET;

        // Paystack has ONE API host for both test and live traffic. Which mode
        // you are in is decided by the secret key prefix (sk_test_ / sk_live_),
        // not by the URL. The previous value ('https://api.scorecard.com' in
        // production, bare 'https://' otherwise) pointed at nothing real, so
        // every call would have failed.
        this.baseURL = 'https://api.paystack.co';

        // Read as `this.examFee` throughout this class, so it must be named
        // that here. It was previously assigned to `this.amount`, leaving
        // this.examFee undefined and sending `amount: NaN` to Paystack.
        this.examFee = Number(process.env.EXAM_FEE) || 4700;  // ₦4,700
    }

    async initializePayment(candidateId, email, callbackUrl){
        try{
            // Find candidate
      const candidate = await Candidate.findById(candidateId);
      if (!candidate) {
        throw new AppError('Candidate not found', 404);
      }

      if (candidate.payment && candidate.payment.status === 'paid') {
        throw new AppError('Candidate has already paid for registration', 400);
      }

      const existingPayment = await Payment.findOne({
        candidateId: candidate._id,
        status: 'pending',
      });

      if (existingPayment) {
        return {
          authorizationUrl: existingPayment.authorizationUrl,
          reference: existingPayment.reference,
          accessCode: existingPayment.accessCode,
          payment: existingPayment,
        };
      }

       const reference = this.generateReference();

       const metadata = {
        candidateId: candidate._id.toString(),
        registrationNumber: candidate.registrationNumber || 'pending',
        email: email || candidate.email,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        examType: candidate.examType || 'UTME',
        examYear: candidate.examYear || new Date().getFullYear(),
        purpose: 'exam_registration',
        custom_fields: [
          {
            display_name: "Registration Number",
            variable_name: "registration_number",
            value: candidate.registrationNumber || 'pending'
          },
          {
            display_name: "Exam Type",
            variable_name: "exam_type",
            value: candidate.examType || 'UTME'
          }
        ]
      };

    //   generate payload to send to paystack
    const payload = {
        email: email || candidate.email,
        amount: this.examFee * 100, // Convert to kobo (Paystack uses kobo)
        reference: reference,
        callback_url: callbackUrl || `${process.env.APP_URL || 'http://localhost:8000'}/api/v1/payments/verify?reference=${reference}`,
        metadata: metadata,
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money'],
        currency: 'NGN',
      };
      const response = await axios.post(
        `${this.baseURL}/transaction/initialize`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data.status) {
        throw new Error(response.data.message || 'Payment initialization failed');
      }

      const data = response.data.data;
        //  save to db
        const payment = await Payment.create({
        candidateId: candidate._id,
        registrationNumber: candidate.registrationNumber || 'PENDING',
        amount: this.examFee,
        reference: reference,
        accessCode: data.access_code,
        authorizationUrl: data.authorization_url,
        status: 'pending',
        metadata: metadata,
        candidatePaymentReference: reference,
      });

     //update candidate payment status
      await Candidate.findByIdAndUpdate(candidateId, {
        'payment.status': 'pending',
        'payment.reference': reference,
      });

      logger.info(`Payment initialized for candidate ${candidate._id}: ${reference}`);

      return {
        authorizationUrl: data.authorization_url,
        reference: reference,
        accessCode: data.access_code,
        payment: payment,
      };
        } catch(error){
              logger.error('Payment initialization error:', error);
      if (error.response) {
        logger.error('Paystack response:', error.response.data);
        throw new AppError(error.response.data.message || 'Payment initialization failed', 400);
      }
      throw new AppError(error.message || 'Payment initialization failed', 500);
        }
    }

    async verifyPayment(reference) {
    try {
      // Find payment record
      const payment = await Payment.findOne({ reference });
      if (!payment) {
        throw new AppError('Payment not found', 404);
      }

      // If already successful, return payment
      if (payment.status === 'success') {
        return payment;
      }

      // Verify with Paystack
      const response = await axios.get(
        `${this.baseURL}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );

      if (!response.data.status) {
        throw new Error(response.data.message || 'Verification failed');
      }

      const data = response.data.data;

      // Update payment record
      payment.transactionData = data;
      payment.paymentMethod = data.channel;
      payment.status = data.status === 'success' ? 'success' : 'failed';
      
      if (data.status === 'success') {
        payment.paidAt = new Date();
        
        // Update candidate payment status
        await Candidate.findByIdAndUpdate(payment.candidateId, {
          'payment.status': 'paid',
          'payment.reference': reference,
          'payment.paidAt': new Date(),
          'payment.amount': this.examFee,
          'payment.method': data.channel,
          'payment.rr': data.reference || reference,
          'completedSteps.payment': true,
        });
        
        // Emit payment success event
        // Both modules export their value directly (module.exports = x), so
        // destructuring here yielded undefined and crashed on .emitSafe().
        const eventBus = require('../events/eventBus');
        const EVENTS   = require('../events/events');
        const candidate = await Candidate.findById(payment.candidateId);
        
        if (candidate) {
          eventBus.emitSafe(EVENTS.CANDIDATE_PAYMENT_SUCCESS, {
            candidate,
            payment,
            recipientEmail: candidate.email,
          });
        }
      }

      await payment.save();

      logger.info(`Payment verified for reference ${reference}: ${payment.status}`);

      return payment;
    } catch (error) {
      logger.error('Payment verification error:', error);
      if (error.response) {
        logger.error('Paystack response:', error.response.data);
        throw new AppError(error.response.data.message || 'Verification failed', 400);
      }
      throw new AppError(error.message || 'Payment verification failed', 500);
    }
  }

  //Handle webhook

 async handleWebhook(payload, signature, rawBody) {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(payload, signature, rawBody)) {
        throw new AppError('Invalid webhook signature', 401);
      }

      // Extract event data
      const event = payload.event;
      const data = payload.data;

      logger.info(`Webhook received: ${event} for reference ${data.reference}`);

      // Only process successful charge events
      if (event === 'charge.success') {
        const payment = await Payment.findOne({ reference: data.reference });
        
        if (!payment) {
          logger.error(`Payment not found for reference: ${data.reference}`);
          return { status: 'error', message: 'Payment not found' };
        }

        // Update payment if not already successful
        if (payment.status !== 'success') {
          payment.transactionData = data;
          payment.paymentMethod = data.channel;
          payment.status = 'success';
          payment.paidAt = new Date();

          // Update candidate payment status
          await Candidate.findByIdAndUpdate(payment.candidateId, {
            'payment.status': 'paid',
            'payment.reference': data.reference,
            'payment.paidAt': new Date(),
            'payment.amount': data.amount / 100,
            'payment.method': data.channel,
            'payment.rr': data.reference,
            'completedSteps.payment': true,
          });

          await payment.save();

          // Emit payment success event
          const eventBus = require('../events/eventBus');
          const EVENTS   = require('../events/events');
          const candidate = await Candidate.findById(payment.candidateId);
          
          if (candidate) {
            eventBus.emitSafe(EVENTS.CANDIDATE_PAYMENT_SUCCESS, {
              candidate,
              payment,
              recipientEmail: candidate.email,
            });
          }

          logger.info(`Webhook processed: payment success for ${data.reference}`);
        }

        return { status: 'success', message: 'Webhook processed' };
      }

      return { status: 'ignored', message: 'Event ignored' };
    } catch (error) {
      logger.error('Webhook handling error:', error);
      throw error;
    }
  }


generateReference() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `JAMB-${timestamp}-${random}`;
  }

verifyWebhookSignature(payload, signature, rawBody) {
    // Paystack signs with your SECRET KEY, not a separate webhook secret. The
    // previous code required PAYSTACK_WEBHOOK_SECRET and returned false when it
    // was unset — silently rejecting every legitimate webhook.
    const signingKey = this.webhookSecret || this.secretKey;
    if (!signingKey || !signature) return false;

    try {
      // Sign the RAW bytes Paystack sent. Re-serialising the parsed body with
      // JSON.stringify() is not byte-identical to the original payload (key
      // order, unicode escaping, whitespace), so the HMAC would not match.
      // app.js captures the raw buffer on req.rawBody for exactly this reason;
      // stringify is only a last-resort fallback.
      const body = rawBody || JSON.stringify(payload);

      const hash = crypto.createHmac('sha512', signingKey).update(body).digest('hex');

      // Constant-time comparison — a plain === leaks timing information that
      // can be used to forge a signature byte by byte.
      const a = Buffer.from(hash, 'utf8');
      const b = Buffer.from(String(signature), 'utf8');
      return a.length === b.length && crypto.timingSafeEqual(a, b);
    } catch (error) {
      logger.error('Webhook signature verification error:', error);
      return false;
    }
  }
    async getPaymentStatus(reference) {
    const payment = await Payment.findOne({ reference });
    if (!payment) {
      throw new AppError('Payment not found', 404);
    }
    return payment;
  }
  async getCandidatePayments(candidateId) {
    return await Payment.find({ candidateId }).sort({ createdAt: -1 });
  }
   async hasPaid(candidateId) {
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      throw new AppError('Candidate not found', 404);
    }
    return candidate.payment && candidate.payment.status === 'paid';
  }

 async getPaymentStats(startDate, endDate) {
    const match = {};
    if (startDate) match.createdAt = { $gte: new Date(startDate) };
    if (endDate) match.createdAt = { ...match.createdAt, $lte: new Date(endDate) };

    const stats = await Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    return stats;
  }

  async refundPayment(reference, reason) {
    try {
      const payment = await Payment.findOne({ reference });
      if (!payment) {
        throw new AppError('Payment not found', 404);
      }

      if (payment.status !== 'success') {
        throw new AppError('Only successful payments can be refunded', 400);
      }

      // Call Paystack refund API
      const response = await axios.post(
        `${this.baseURL}/refund`,
        {
          transaction: reference,
          amount: payment.amount * 100,
          reason: reason || 'Candidate requested refund',
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data.status) {
        throw new Error(response.data.message || 'Refund failed');
      }

      // Update payment status
      payment.status = 'refunded';
      await payment.save();

      // Update candidate payment status
      await Candidate.findByIdAndUpdate(payment.candidateId, {
        'payment.status': 'refunded',
      });

      logger.info(`Payment refunded for reference ${reference}`);

      return response.data.data;
    } catch (error) {
      logger.error('Refund error:', error);
      if (error.response) {
        throw new AppError(error.response.data.message || 'Refund failed', 400);
      }
      throw new AppError(error.message || 'Refund failed', 500);
    }
  }
}


module.exports = new PaymentService();