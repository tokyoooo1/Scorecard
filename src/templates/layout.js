const BRAND = {
  name:         process.env.APP_NAME || 'JAMB Examination Platform',
  url:          process.env.APP_URL  || 'https://portal.example.ng',
  primary:      '#1a365d',   // navy
  accent:       '#008751',   // Nigerian green
  supportEmail: process.env.SUPPORT_EMAIL || 'support@example.ng',
};

const layout = (innerHtml, { preheader = '' } = {}) => `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${BRAND.name}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f6f9; font-family:Arial,Helvetica,sans-serif;">
  <!-- Preheader: the grey preview text in the inbox list, hidden in the body -->
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${preheader}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;">
    <tr>
      <td align="center" style="padding:24px 12px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
               style="max-width:600px; width:100%; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header band -->
          <tr>
            <td style="background:${BRAND.primary}; padding:0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="height:6px; background:${BRAND.accent};"></td></tr>
                <tr>
                  <td style="padding:22px 32px;">
                    <span style="color:#ffffff; font-size:20px; font-weight:bold; letter-spacing:0.3px;">
                      ${BRAND.name}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${innerHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 32px; background:#f8fafc; border-top:1px solid #e2e8f0;">
              <p style="margin:0 0 6px; font-size:12px; color:#64748b; line-height:18px;">
                This is an automated message from ${BRAND.name}. Please do not reply directly to this email.
              </p>
              <p style="margin:0 0 6px; font-size:12px; color:#64748b; line-height:18px;">
                Need help? Contact us at
                <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.accent}; text-decoration:none;">${BRAND.supportEmail}</a>
              </p>
              <p style="margin:0; font-size:11px; color:#94a3b8;">
                &copy; ${new Date().getFullYear()} ${BRAND.name}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>

        <p style="margin:16px 0 0; font-size:11px; color:#94a3b8;">
          You are receiving this because you registered on ${BRAND.name}.
        </p>

      </td>
    </tr>
  </table>
</body>
</html>`;

// ── Reusable inner-content helpers ────────────────────────────────

const heading = (text) =>
  `<h1 style="margin:0 0 16px; font-size:22px; color:${BRAND.primary}; font-weight:bold;">${text}</h1>`;

const paragraph = (text) =>
  `<p style="margin:0 0 16px; font-size:15px; color:#334155; line-height:24px;">${text}</p>`;

const button = (label, href) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
     <tr>
       <td style="border-radius:6px; background:${BRAND.accent};">
         <a href="${href}" target="_blank"
            style="display:inline-block; padding:13px 28px; font-size:15px; font-weight:bold;
                   color:#ffffff; text-decoration:none; border-radius:6px;">${label}</a>
       </td>
     </tr>
   </table>`;

   
const detailBox = (rows) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="margin:8px 0 24px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px;">
    ${rows.map(([label, value], i) => `
      <tr>
        <td style="padding:12px 16px; font-size:13px; color:#64748b; ${i ? 'border-top:1px solid #e2e8f0;' : ''} width:45%;">${label}</td>
        <td style="padding:12px 16px; font-size:14px; color:#0f172a; font-weight:600; ${i ? 'border-top:1px solid #e2e8f0;' : ''}">${value}</td>
      </tr>`).join('')}
  </table>`;

const infoNote = (text, color = BRAND.accent) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
     <tr>
       <td style="padding:12px 16px; background:${color}12; border-left:3px solid ${color}; border-radius:4px;
                  font-size:13px; color:#334155; line-height:20px;">${text}</td>
     </tr>
   </table>`;

module.exports = { layout, heading, paragraph, button, detailBox, infoNote, BRAND };
