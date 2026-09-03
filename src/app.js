const express   = require('express');
const helmet    = require('helmet');
const cors      = require('cors');
const morgan    = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path      = require('path');

// Express-5-safe replacement for express-mongo-sanitize (see that file for why).
const mongoSanitize = require('./middleware/sanitize.middleware');

const errorHandler = require('./middleware/error.middleware');
const { notFound } = require('./middleware/notFound.middleware');
const logger       = require('./utils/logger');

// Routes
const authRoutes       = require('./routes/auth.routes');
const candidateRoutes  = require('./routes/candidate.routes');
const examRoutes       = require('./routes/exam.routes');
const resultRoutes     = require('./routes/result.routes');
const adminRoutes      = require('./routes/admin.routes');
const publicRoutes     = require('./routes/public.routes');
const emailAdminRoutes = require('./routes/emailAdmin.routes');
const paymentRoutes    = require('./routes/payment.routes');

const app = express();

// Rate limiters sit behind a proxy in most deployments; without this the
// limiter sees the proxy IP for everyone and throttles all users together.
app.set('trust proxy', 1);

// ── Security ──────────────────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body parsing ──────────────────────────────────────────────────
// `verify` hands us the raw buffer before parsing. The Paystack webhook needs
// the exact bytes that were signed — re-serialising the parsed object with
// JSON.stringify() is not byte-identical and breaks HMAC verification.
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Strip Mongo operators AFTER parsing, so req.body is populated.
app.use(mongoSanitize());

app.use(compression());
app.use(morgan('dev', { stream: { write: (msg) => logger.http(msg.trim()) } }));

// ── Rate limiting ─────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
  // Paystack retries webhooks; throttling them would drop real payment
  // confirmations. That endpoint is protected by signature verification instead.
  skip: (req) => req.path === '/api/v1/payments/webhook',
});
app.use(globalLimiter);

// Result checking is the brute-force surface (guessable reg numbers + DOBs).
const resultCheckLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many result check attempts. Try again in a minute.' },
});

// ── Static files ──────────────────────────────────────────────────
// The passport uploads in this repo live in ./upload (singular), so serve that.
app.use('/uploads', express.static(path.join(__dirname, '../upload')));

// ── Health check ──────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: process.env.APP_NAME || 'SCORECARD Examination Platform',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// ── API Routes ────────────────────────────────────────────────────
const API = '/api/v1';

app.use(`${API}/auth`,         authRoutes);
app.use(`${API}/candidates`,   candidateRoutes);
app.use(`${API}/exams`,        examRoutes);
app.use(`${API}/results`,      resultRoutes);
app.use(`${API}/payments`,     paymentRoutes);
app.use(`${API}/admin/emails`, emailAdminRoutes);   // before /admin so it isn't shadowed
app.use(`${API}/admin`,        adminRoutes);
app.use(`${API}/public`,       resultCheckLimiter, publicRoutes);

// ── Error handling (must be last) ─────────────────────────────────
app.use(notFound);
app.use(errorHandler);

module.exports = app;
