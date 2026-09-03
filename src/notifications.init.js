const registerEmailListeners = require('./listeners/email.listeners');
const { startEmailRetryJob}   = require('./jobs/emailRetry');
const emailService  = require('./services/email.service');
const logger   = require('./utils/logger');

async function initNotifications () {

     await emailService.verify();

  registerEmailListeners();
  startEmailRetryJob();

  logger.info('Notification subsystem initialised');
}

module.exports = initNotifications;


