const emailService = require('../services/email.service');
const logger       = require('../utils/logger');
let timer = null;

function startEmailRetryJob () {
  const intervalMs = Number(process.env.EMAIL_RETRY_INTERVAL_MS) || 5 * 60 * 1000;

  if (timer) return;   // guard against double-start

  timer = setInterval(async () => {
    try {
      const { retried } = await emailService.retryFailed();
      if (retried) logger.info(`Email retry sweep processed ${retried} message(s)`);
    } catch (err) {
      logger.error(`Email retry sweep errored: ${err.message}`);
    }
  }, intervalMs);

  // Don't let this timer hold the process open during shutdown.
  timer.unref?.();

  logger.info(`Email retry job started (every ${Math.round(intervalMs / 1000)}s)`);
}

function stopEmailRetryJob () {
  if (timer) { clearInterval(timer); timer = null; }
}

module.exports = { startEmailRetryJob, stopEmailRetryJob };
