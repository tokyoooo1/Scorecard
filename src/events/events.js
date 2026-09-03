const EVENTS = Object.freeze({
    // -- Auth ---------
    USER_LOGGED_IN:        'user.loggedIn',
    USER_PASSWORD_CHANGED: 'user.passwordChanged',

    CANDIDATE_REGISTRATION_INITIATED: 'candidate.registrationInitiated',
    CANDIDATE_ACADEMIC_UPDATED:       'candidate.academicUpdated',
    CANDIDATE_CENTER_ASSIGNED:        'candidate.centerAssigned',
    CANDIDATE_PHOTO_UPLOADED:         'candidate.photoUploaded',
    CANDIDATE_REGISTRATION_COMPLETED: 'candidate.registrationCompleted',

    EXAM_SLIP_PRINTED:   'candidate.examSlipPrinted',
    RESULT_SLIP_PRINTED: 'result.slipPrinted',

    RESULT_CHECKED:  'result.checked',
    RESULT_RELEASED: 'result.released',
    CANDIDATE_PAYMENT_SUCCESS: 'candidate.paymentSuccess',
    CANDIDATE_PAYMENT_FAILED: 'candidate.paymentFailed',
    CANDIDATE_PAYMENT_REFUNDED: 'candidate.paymentRefunded',
});

module.exports = EVENTS;