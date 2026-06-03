const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

const FROM = `"${process.env.FROM_NAME || 'FEMS TWZ Ltd'}" <${process.env.FROM_EMAIL || 'noreply@fems.com'}>`;

async function sendEmail({ to, subject, html }) {
  if (!transporter) {
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    logger.info(`\n========== EMAIL (dev) ==========\nTo: ${to}\nSubject: ${subject}\n${text}\n=================================`);
    return;
  }
  await transporter.sendMail({ from: FROM, to, subject, html });
}

function inspectionScheduledEmail({ ownerName, serialNumber, location, scheduledDate, inspectorName }) {
  const dateStr = new Date(scheduledDate).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });
  return {
    subject: `FEMS – Upcoming Inspection Scheduled: ${serialNumber}`,
    html: `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
  <div style="background:#c0392b;padding:28px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px">🔥 FEMS – TWZ Ltd</h1>
    <p style="color:#f8d7d7;margin:6px 0 0;font-size:13px">Fire Extinguisher Management System</p>
  </div>
  <div style="padding:30px">
    <h2 style="color:#1a1a1a;margin-top:0">Upcoming Inspection Notice</h2>
    <p style="color:#555;line-height:1.6">Dear <strong>${ownerName}</strong>, an inspection has been scheduled for the following fire extinguisher under your care.</p>
    <div style="background:#f0f7ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin:20px 0">
      <table style="width:100%;border-collapse:collapse">
        <tr><td style="padding:6px 0;color:#6b7280;font-size:14px;width:140px">Serial Number</td><td style="padding:6px 0;color:#111827;font-weight:600">${serialNumber}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;font-size:14px">Location</td><td style="padding:6px 0;color:#111827;font-weight:600">${location}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280;font-size:14px">Scheduled Date</td><td style="padding:6px 0;color:#111827;font-weight:600">${dateStr}</td></tr>
        ${inspectorName ? `<tr><td style="padding:6px 0;color:#6b7280;font-size:14px">Inspector</td><td style="padding:6px 0;color:#111827;font-weight:600">${inspectorName}</td></tr>` : ''}
      </table>
    </div>
    <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:14px;margin-bottom:20px">
      <p style="margin:0;color:#92400e;font-size:13px">⚠️ Please ensure the extinguisher is accessible at the scheduled time. Contact your administrator if you need to reschedule.</p>
    </div>
    <p style="color:#9ca3af;font-size:12px;margin:0">This is an automated notification from the FEMS system. Do not reply to this email.</p>
  </div>
</div>
</body></html>`,
  };
}

module.exports = { sendEmail, inspectionScheduledEmail };
