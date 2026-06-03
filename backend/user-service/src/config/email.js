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
  transporter.verify((err) => {
    if (err) logger.error('SMTP connection failed:', err.message);
    else logger.info('SMTP ready');
  });
} else {
  logger.warn('SMTP_HOST not set — emails will be printed to console (dev mode)');
}

const FROM = `"${process.env.FROM_NAME || 'FEMS TWZ Ltd'}" <${process.env.FROM_EMAIL || 'noreply@fems.com'}>`;

async function sendEmail({ to, subject, html }) {
  if (!transporter) {
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    logger.info(`\n========== EMAIL (dev) ==========\nTo: ${to}\nSubject: ${subject}\n${text}\n=================================`);
    return { messageId: 'dev-no-smtp' };
  }
  const info = await transporter.sendMail({ from: FROM, to, subject, html });
  logger.info(`Email sent to ${to}: ${info.messageId}`);
  return info;
}

// ── Templates ─────────────────────────────────────────────────────────────────

function inspectorInviteEmail({ firstName, lastName, email, tempPassword, loginUrl }) {
  return {
    subject: 'Welcome to FEMS – Your Inspector Account',
    html: `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
  <div style="background:#c0392b;padding:30px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:24px">🔥 FEMS – TWZ Ltd</h1>
    <p style="color:#f8d7d7;margin:8px 0 0">Fire Extinguisher Management System</p>
  </div>
  <div style="padding:32px">
    <h2 style="color:#1a1a1a;margin-top:0">Welcome, ${firstName} ${lastName}!</h2>
    <p style="color:#555;line-height:1.6">Your inspector account has been created by an administrator. Please use the credentials below to log in and <strong>change your password immediately</strong>.</p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:20px;margin:24px 0">
      <p style="margin:0 0 8px;font-weight:bold;color:#c0392b">Your Login Credentials</p>
      <p style="margin:4px 0;color:#333"><strong>Email:</strong> ${email}</p>
      <p style="margin:4px 0;color:#333"><strong>Temporary Password:</strong> <code style="background:#f0f0f0;padding:2px 8px;border-radius:4px;font-size:15px;letter-spacing:1px">${tempPassword}</code></p>
    </div>
    <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:16px;margin-bottom:24px">
      <p style="margin:0;color:#856404;font-size:14px">⚠️ You will be required to change this temporary password when you first log in. Do not share these credentials with anyone.</p>
    </div>
    <a href="${loginUrl}" style="display:inline-block;background:#c0392b;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px">Login to FEMS</a>
    <p style="color:#999;font-size:12px;margin-top:32px">If you did not expect this email, please contact your administrator immediately.</p>
  </div>
</div>
</body></html>`,
  };
}

function passwordResetEmail({ firstName, resetUrl }) {
  return {
    subject: 'FEMS – Password Reset Request',
    html: `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
  <div style="background:#c0392b;padding:30px;text-align:center">
    <h1 style="color:#fff;margin:0">🔥 FEMS – TWZ Ltd</h1>
  </div>
  <div style="padding:32px">
    <h2 style="color:#1a1a1a;margin-top:0">Password Reset</h2>
    <p style="color:#555">Hi ${firstName}, you requested a password reset. Click the button below. This link expires in <strong>1 hour</strong>.</p>
    <a href="${resetUrl}" style="display:inline-block;background:#c0392b;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;margin:16px 0">Reset My Password</a>
    <p style="color:#999;font-size:12px;margin-top:24px">If you did not request this, ignore this email — your password will not change.</p>
  </div>
</div>
</body></html>`,
  };
}

function inspectionReminderEmail({ ownerName, serialNumber, location, scheduledDate, inspectorName }) {
  const dateStr = new Date(scheduledDate).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });
  return {
    subject: `FEMS – Upcoming Inspection: ${serialNumber}`,
    html: `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f4f4f4;margin:0;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1)">
  <div style="background:#c0392b;padding:30px;text-align:center">
    <h1 style="color:#fff;margin:0">🔥 FEMS – TWZ Ltd</h1>
    <p style="color:#f8d7d7;margin:8px 0 0">Fire Extinguisher Management System</p>
  </div>
  <div style="padding:32px">
    <h2 style="color:#1a1a1a;margin-top:0">Upcoming Inspection Scheduled</h2>
    <p style="color:#555">Dear ${ownerName}, an inspection has been scheduled for your fire extinguisher.</p>
    <div style="background:#f0f7ff;border:1px solid #bfdbfe;border-radius:8px;padding:20px;margin:20px 0">
      <p style="margin:4px 0;color:#333"><strong>Serial Number:</strong> ${serialNumber}</p>
      <p style="margin:4px 0;color:#333"><strong>Location:</strong> ${location}</p>
      <p style="margin:4px 0;color:#333"><strong>Scheduled Date:</strong> ${dateStr}</p>
      ${inspectorName ? `<p style="margin:4px 0;color:#333"><strong>Inspector:</strong> ${inspectorName}</p>` : ''}
    </div>
    <p style="color:#555;font-size:14px">Please ensure the extinguisher is accessible at the scheduled time. If you need to reschedule, contact your administrator.</p>
  </div>
</div>
</body></html>`,
  };
}

module.exports = { sendEmail, inspectorInviteEmail, passwordResetEmail, inspectionReminderEmail };
