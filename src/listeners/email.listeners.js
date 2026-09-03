const eventBus = require('../events/eventBus');
const EVENTS = require('../events/events');
const emailService = require('../services/email.service');
const logger    =   require('../utils/logger');


const now = () =>
  new Date().toLocaleString('en-GB', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos',
  });

const safe = (name, handler) => async (payload) => {
  try {
    await handler(payload);
  } catch (err) {
    logger.error(`Email listener "${name}" failed: ${err.message}`);
  }
};

function registerEmailListeners () {
    eventBus.on(EVENTS.USER_LOGGED_IN, safe('loginAlert', async ({ user, ip, device }) => {
    await emailService.send('loginAlert', user.email, {
      fullName:  user.fullName,
      time:      now(),
      ipAddress: ip,
      device,
    }, { triggeredBy: EVENTS.USER_LOGGED_IN, relatedUser: user._id });
  }));

  eventBus.on(EVENTS.USER_PASSWORD_CHANGED, safe('passwordChanged', async ({ user }) => {
    await emailService.send('passwordChanged', user.email, {
      fullName: user.fullName,
      time:     now(),
    }, { triggeredBy: EVENTS.USER_PASSWORD_CHANGED, relatedUser: user._id });
  }));

    eventBus.on(EVENTS.CANDIDATE_REGISTRATION_INITIATED, safe('regInitiated', async ({ candidate }) => {
    await emailService.send('registrationInitiated', candidate.email, { candidate }, {
      triggeredBy:      EVENTS.CANDIDATE_REGISTRATION_INITIATED,
      dedupeKey:        `registrationInitiated:${candidate._id}`,
      relatedCandidate: candidate._id,
    });
  }));

  eventBus.on(EVENTS.CANDIDATE_ACADEMIC_UPDATED, safe('academicUpdated', async ({ candidate }) => {
    await emailService.send('academicUpdated', candidate.email, { candidate }, {
      triggeredBy:      EVENTS.CANDIDATE_ACADEMIC_UPDATED,
       dedupeKey:        `academicUpdated:${candidate._id}:${Math.floor(Date.now() / 60000)}`,
      relatedCandidate: candidate._id,
    });
  }));

  eventBus.on(EVENTS.CANDIDATE_CENTER_ASSIGNED, safe('centerAssigned', async ({ candidate }) => {
    await emailService.send('centerAssigned', candidate.email, { candidate }, {
      triggeredBy:      EVENTS.CANDIDATE_CENTER_ASSIGNED,
      dedupeKey:        `centerAssigned:${candidate._id}:${candidate.examCenterCode}`,
      relatedCandidate: candidate._id,
    });
  }));

  eventBus.on(EVENTS.CANDIDATE_PHOTO_UPLOADED, safe('photoUploaded', async ({ candidate }) => {
    await emailService.send('photoUploaded', candidate.email, { candidate }, {
      triggeredBy:      EVENTS.CANDIDATE_PHOTO_UPLOADED,
      dedupeKey:        `photoUploaded:${candidate._id}:${Math.floor(Date.now() / 60000)}`,
      relatedCandidate: candidate._id,
    });
  }));

  eventBus.on(EVENTS.CANDIDATE_REGISTRATION_COMPLETED, safe('regCompleted', async ({ candidate }) => {
    await emailService.send('registrationCompleted', candidate.email, { candidate }, {
      triggeredBy:      EVENTS.CANDIDATE_REGISTRATION_COMPLETED,
      // Registration number is stable and unique — a perfect natural dedupe key.
      // This mail goes out exactly once, ever, per candidate.
      dedupeKey:        `registrationCompleted:${candidate.registrationNumber}`,
      relatedCandidate: candidate._id,
    });
  }));
   eventBus.on(EVENTS.EXAM_SLIP_PRINTED, safe('examSlipPrinted', async ({ candidate }) => {
    await emailService.send('examSlipPrinted', candidate.email, {
      candidate, time: now(),
    }, {
      triggeredBy:      EVENTS.EXAM_SLIP_PRINTED,
      relatedCandidate: candidate._id,
       });
  }));

  eventBus.on(EVENTS.RESULT_CHECKED, safe('resultChecked', async ({ candidate, result }) => {
    if (!candidate?.email) return;
    await emailService.send('resultChecked', candidate.email, {
      firstName:          candidate.firstName,
      lastName:           candidate.lastName,
      registrationNumber: result.registrationNumber,
      aggregateScore:     result.aggregateScore,
      time:               now(),
    }, {
      triggeredBy:      EVENTS.RESULT_CHECKED,
      relatedCandidate: candidate._id,
    });
  }));

  eventBus.on(EVENTS.RESULT_SLIP_PRINTED, safe('resultSlipPrinted', async ({ candidate, result }) => {
    if (!candidate?.email) return;
    await emailService.send('resultSlipPrinted', candidate.email, {
      firstName:          candidate.firstName,
      lastName:           candidate.lastName,
      registrationNumber: result.registrationNumber,
      aggregateScore:     result.aggregateScore,
      grade:              result.grade,
      time:               now(),
    }, {
      triggeredBy:      EVENTS.RESULT_SLIP_PRINTED,
      relatedCandidate: candidate._id,
    });
  }));

  eventBus.on(EVENTS.RESULT_RELEASED, safe('resultReleased', async ({ candidate, result }) => {
    if (!candidate?.email) return;
    await emailService.send('resultReleased', candidate.email, {
      firstName:          candidate.firstName,
      lastName:           candidate.lastName,
      registrationNumber: result.registrationNumber,
      examYear:           result.examYear,
    }, {
      triggeredBy:      EVENTS.RESULT_RELEASED,
      dedupeKey:        `resultReleased:${result.registrationNumber}`,
      relatedCandidate: candidate._id,
    });
  }));

eventBus.on(EVENTS.CANDIDATE_PAYMENT_SUCCESS, async (data) => {
  await emailService.send({
    to: data.recipientEmail || data.candidate.email,
    template: templates.paymentSuccess,
    data: {
      candidate: data.candidate,
      payment: data.payment,
    },
    dedupeKey: `paymentSuccess:${data.candidate.registrationNumber || data.candidate._id}`,
  });
});

eventBus.on(EVENTS.CANDIDATE_PAYMENT_FAILED, async (data) => {
  await emailService.send({
    to: data.recipientEmail || data.candidate.email,
    template: templates.paymentFailed,
    data: {
      candidate: data.candidate,
      payment: data.payment,
    },
    dedupeKey: `paymentFailed:${data.payment.reference}`,
  });
});
  const count = eventBus.eventNames().length;
  logger.info(`Email listeners registered for ${count} event type(s)`);
}

module.exports = registerEmailListeners;
