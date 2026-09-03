const { layout, heading, paragraph, button, detailBox, infoNote, BRAND } = require('./layout');


const fullName = (c) => 
    `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Candidate';

const portal = (path = '') => `${BRAND.url}${path}`;

const TEMPLATE = {
    loginAlert: (d) => ({
        subject: `New sign-in to your ${BRAND.name} account`,
        html: layout(
            heading('New sign-in detected') +
            paragraph(`Hello ${d.fullName || 'there'},`) +
            paragraph('Your account was just signed in to. If this was you, no action is needed.') +
            detailBox([
                ['Time', d.time],
                ['Device', d.device || 'Unknown device'],
                ['IP address', d.ipAddress || 'Unknown'],
            ]) + 
            infoNote(
                'If you did not sign in, your password may be compromised. ' +
                `Change it immediately and contact <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.accent};">${BRAND.supportEmail}</a>.`,
                '#c53030'
            ),
            { preheader: 'A new sign-in to your account was detected.'}
        ),
        text:
        `New sign-in to your ${BRAND.name} account.
        Time: ${d.time}
        Device: ${d.device || 'Unknown'}
        IP: ${d.ipAddress || 'Unknown'}
        
        If this wasn't you, change your password immediately and contact ${BRAND.supportEmail}.`,
    }),

    passwordChanged: (d) => ({
        subject: `Your ${BRAND.name} password was change`,
        html: layout(
            heading('Password changed') +
            paragraph(`Hello ${d.fullName || 'there'},`) +
            paragraph('This confirms that your account password was just changed.') +
            detailBox([['Time', d.time]]) +
            infoNote(
        `If you did not make this change, contact us at ` +
        `<a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.accent};">${BRAND.supportEmail}</a> right away.`,
        '#c53030'
      ),
      { preheader: 'Your password was changed.' }
        ),
          text:
        `Your ${BRAND.name} password was changed at ${d.time}.
        If this wasn't you, contact ${BRAND.supportEmail} immediately.`,
    }),
     registrationInitiated: (d) => ({
    subject: `Welcome — your ${BRAND.name} registration has started`,
    html: layout(
      heading('Registration started') +
      paragraph(`Dear ${fullName(d.candidate)},`) +
      paragraph(
        'Thank you for beginning your registration. Your application has been ' +
        'created and saved. You can now continue through the remaining steps.'
      ) +
      detailBox([
        ['Profile Code', d.candidate.profileCode || 'Pending'],
        ['Email',        d.candidate.email],
        ['Exam Year',    d.candidate.examYear],
        ['Status',       'Registration in progress'],
      ]) +
      infoNote(
        'Keep your Profile Code safe — you will use it to resume your ' +
        'registration and to access your account.'
      ) +
      paragraph('The next steps are: academic details, subject selection, exam centre, and passport photo.') +
      button('Continue Registration', portal('/register')),
      { preheader: 'Your registration has started. Continue where you left off.' }
    ),
    text:
`Dear ${fullName(d.candidate)},

Your ${BRAND.name} registration has started.

Profile Code: ${d.candidate.profileCode || 'Pending'}
Email: ${d.candidate.email}
Exam Year: ${d.candidate.examYear}

Keep your Profile Code safe. Continue at ${portal('/register')}`,
  }),


  //Academic Update////

  academicUpdated: (d) => ({
    subject: `Academic details saved — ${BRAND.name}`,
    html: layout(
      heading('Academic details saved') +
      paragraph(`Dear ${fullName(d.candidate)},`) +
      paragraph('Your subject combination and institution choices have been saved successfully.') +
      detailBox([
        ['Subjects',   (d.candidate.subjects || []).join(', ') || '—'],
        ['1st Choice', d.candidate.institutionChoices?.[0]?.institutionName || '—'],
        ['2nd Choice', d.candidate.institutionChoices?.[1]?.institutionName || 'Not selected'],
      ]) +
      infoNote('Next step: select your preferred examination centre.') +
      button('Continue Registration', portal('/register')),
      { preheader: 'Your academic details and subject choices are saved.' }
    ),
    text:
`Dear ${fullName(d.candidate)},

Your academic details have been saved.
Subjects: ${(d.candidate.subjects || []).join(', ')}

Continue at ${portal('/register')}`,
  }),


  //Center Ass///
  centerAssigned: (d) => ({
    subject: `Exam centre confirmed — ${BRAND.name}`,
    html: layout(
      heading('Examination centre confirmed') +
      paragraph(`Dear ${fullName(d.candidate)},`) +
      paragraph('Your examination centre has been assigned.') +
      detailBox([
        ['Centre',      d.candidate.examCenterName || '—'],
        ['Centre Code', d.candidate.examCenterCode || '—'],
      ]) +
      infoNote('One step remains: upload your passport photograph to complete registration.') +
      button('Continue Registration', portal('/register')),
      { preheader: 'Your exam centre is confirmed.' }
    ),
    text:
`Dear ${fullName(d.candidate)},

Your exam centre has been confirmed:
${d.candidate.examCenterName} (${d.candidate.examCenterCode})

Continue at ${portal('/register')}`,
  }),

  photoUploaded: (d) => ({
    subject: `Passport photo received — ${BRAND.name}`,
    html: layout(
      heading('Passport photograph received') +
      paragraph(`Dear ${fullName(d.candidate)},`) +
      paragraph('Your passport photograph has been uploaded successfully.') +
      infoNote('You are almost done. Finalise your registration to receive your official registration number.') +
      button('Finalise Registration', portal('/register')),
      { preheader: 'Your passport photo was received.' }
    ),
    text:
`Dear ${fullName(d.candidate)},

Your passport photograph has been received.
Finalise your registration at ${portal('/register')}`,
  }),

   registrationCompleted: (d) => ({
    subject: `Registration complete — Your number is ${d.candidate.registrationNumber}`,
    html: layout(
      heading('Registration complete') +
      paragraph(`Dear ${fullName(d.candidate)},`) +
      paragraph(
        'Congratulations! Your registration is now complete. Below is your ' +
        'official registration number — you will need it for every future step, ' +
        'including checking your result.'
      ) +
      detailBox([
        ['Registration Number', d.candidate.registrationNumber],
        ['Full Name',           fullName(d.candidate)],
        ['Exam Type',           d.candidate.examType],
        ['Exam Centre',         d.candidate.examCenterName || '—'],
        ['Exam Year',           d.candidate.examYear],
      ]) +
      infoNote(
        'Write down your registration number and keep it safe. ' +
        'You can now download and print your examination slip.'
      ) +
      button('Download Exam Slip', portal(`/candidates/exam-slip/${d.candidate.registrationNumber}/print`)),
      { preheader: `Your registration number is ${d.candidate.registrationNumber}.` }
    ),
    text:
`Dear ${fullName(d.candidate)},

Your registration is COMPLETE.

Registration Number: ${d.candidate.registrationNumber}
Exam Type: ${d.candidate.examType}
Exam Centre: ${d.candidate.examCenterName || '—'}
Exam Year: ${d.candidate.examYear}

Keep this number safe. Download your exam slip at
${portal(`/candidates/exam-slip/${d.candidate.registrationNumber}/print`)}`,
  }),
   examSlipPrinted: (d) => ({
    subject: `Exam slip generated — ${BRAND.name}`,
    html: layout(
      heading('Examination slip generated') +
      paragraph(`Dear ${fullName(d.candidate)},`) +
      paragraph(
        'Your examination slip was just generated. If this was not you, please ' +
        'secure your account.'
      ) +
      detailBox([
        ['Registration Number', d.candidate.registrationNumber],
        ['Exam Centre',         d.candidate.examCenterName || '—'],
        ['Generated',           d.time],
      ]) +
      infoNote('Remember to bring a printed copy and a valid ID to your examination centre.'),
      { preheader: 'Your exam slip was generated.' }
    ),
    text:
`Dear ${fullName(d.candidate)},

Your examination slip was generated at ${d.time}.
Registration Number: ${d.candidate.registrationNumber}

Bring a printed copy and valid ID to your centre.`,
  }),



  resultChecked: (d) => ({
    subject: `Your result was accessed — ${BRAND.name}`,
    html: layout(
      heading('Result accessed') +
      paragraph(`Dear ${fullName(d)},`) +
      paragraph('Your examination result was just viewed.') +
      detailBox([
        ['Registration Number', d.registrationNumber],
        ['Aggregate Score',     `${d.aggregateScore} / 400`],
        ['Accessed',            d.time],
      ]) +
      infoNote(
        'If you did not access your result, someone else may have your details. ' +
        'Contact support.',
        '#744210'
      ),
      { preheader: 'Your result was just accessed.' }
    ),
    text:
`Dear ${fullName(d)},

Your result was accessed at ${d.time}.
Registration Number: ${d.registrationNumber}
Aggregate Score: ${d.aggregateScore}/400`,
  }),

  resultSlipPrinted: (d) => ({
    subject: `Result slip generated — ${BRAND.name}`,
    html: layout(
      heading('Result slip generated') +
      paragraph(`Dear ${fullName(d)},`) +
      paragraph('A copy of your result slip was just generated for download or printing.') +
      detailBox([
        ['Registration Number', d.registrationNumber],
        ['Aggregate Score',     `${d.aggregateScore} / 400`],
        ['Grade',               d.grade || '—'],
        ['Generated',           d.time],
      ]),
      { preheader: 'Your result slip was generated.' }
    ),
    text:
`Dear ${fullName(d)},

Your result slip was generated at ${d.time}.
Registration Number: ${d.registrationNumber}
Aggregate: ${d.aggregateScore}/400  Grade: ${d.grade || '—'}`,
  }),

  resultReleased: (d) => ({
    subject: `Your ${BRAND.name} result is now available`,
    html: layout(
      heading('Your result is available') +
      paragraph(`Dear ${fullName(d)},`) +
      paragraph(
        'Your examination result has been released and is now available for you ' +
        'to check.'
      ) +
      detailBox([
        ['Registration Number', d.registrationNumber],
        ['Exam Year',           d.examYear],
      ]) +
      infoNote('Use your registration number and date of birth, or a result checking token, to view your result.') +
      button('Check My Result', portal('/results/check')),
      { preheader: 'Your result has been released.' }
    ),
    text:
`Dear ${fullName(d)},

Your result has been released.
Registration Number: ${d.registrationNumber}

Check it at ${portal('/results/check')}`,
  }),
 paymentSuccess: {
  subject: (data) => `Payment Confirmation - ${data.candidate.registrationNumber}`,
  html: (data) => `
    <h2>Payment Confirmation</h2>
    <p>Dear ${data.candidate.firstName} ${data.candidate.lastName},</p>
    <p>Your exam registration payment has been successfully processed.</p>
    <div style="background: #f5f5f5; padding: 15px; margin: 20px 0;">
      <p><strong>Registration Number:</strong> ${data.candidate.registrationNumber || 'Pending'}</p>
      <p><strong>Amount Paid:</strong> ₦${data.payment.amount.toLocaleString()}</p>
      <p><strong>Payment Reference:</strong> ${data.payment.reference}</p>
      <p><strong>Payment Date:</strong> ${new Date(data.payment.paidAt).toLocaleString()}</p>
      <p><strong>Payment Method:</strong> ${data.payment.paymentMethod || 'Card'}</p>
    </div>
    <p>You can now proceed with your registration.</p>
    <p>Thank you for choosing our platform.</p>
  `,
  text: (data) => `
    Payment Confirmation
    Dear ${data.candidate.firstName} ${data.candidate.lastName},
    Your exam registration payment has been successfully processed.
    Registration Number: ${data.candidate.registrationNumber || 'Pending'}
    Amount Paid: ₦${data.payment.amount.toLocaleString()}
    Payment Reference: ${data.payment.reference}
    Payment Date: ${new Date(data.payment.paidAt).toLocaleString()}
    Payment Method: ${data.payment.paymentMethod || 'Card'}
    You can now proceed with your registration.
    Thank you for choosing our platform.
  `,
},

paymentFailed: {
  subject: (data) => `Payment Failed - ${data.candidate.registrationNumber || 'Registration'}`,
  html: (data) => `
    <h2>Payment Failed</h2>
    <p>Dear ${data.candidate.firstName} ${data.candidate.lastName},</p>
    <p>Your payment attempt was not successful.</p>
    <div style="background: #fff3f3; padding: 15px; margin: 20px 0; border: 1px solid #ffcdd2;">
      <p><strong>Reference:</strong> ${data.payment.reference}</p>
      <p><strong>Amount:</strong> ₦${data.payment.amount.toLocaleString()}</p>
      <p><strong>Status:</strong> ${data.payment.status}</p>
    </div>
    <p>Please try again or use a different payment method.</p>
    <p>If you continue to experience issues, please contact support.</p>
  `,
  text: (data) => `
    Payment Failed
    Dear ${data.candidate.firstName} ${data.candidate.lastName},
    Your payment attempt was not successful.
    Reference: ${data.payment.reference}
    Amount: ₦${data.payment.amount.toLocaleString()}
    Status: ${data.payment.status}
    Please try again or use a different payment method.
    If you continue to experience issues, please contact support.
  `,
},
};

const render = (templateName, data)=> {
    const fn = TEMPLATE[templateName];
    if (!fn) throw new Error(`Unknow email template: "${templateName}"`);
    return fn(data);
};

module.exports = {render, TEMPLATE};