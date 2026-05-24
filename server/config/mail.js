const nodemailer = require('nodemailer');

const host = process.env.SMTP_HOST;
const port = process.env.SMTP_PORT;
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const resendApiKey = process.env.RESEND_API_KEY;

let transporter = null;

if (resendApiKey) {
  console.log('Email Service configured: using Resend HTTPS API');
} else if (host && port && user && pass) {
  console.log(`Email Service configured: using SMTP server ${host}:${port}`);
  transporter = nodemailer.createTransport({
    host,
    port: parseInt(port),
    secure: port == 465, // true for 465, false for other ports
    auth: {
      user,
      pass
    }
  });
} else {
  console.log('Email Service not configured. Current state:', {
    RESEND_API_KEY: resendApiKey ? 'loaded' : 'missing',
    SMTP_HOST: host ? 'loaded' : 'missing',
    SMTP_PORT: port ? 'loaded' : 'missing',
    SMTP_USER: user ? 'loaded' : 'missing',
    SMTP_PASS: pass ? 'loaded' : 'missing'
  });
  console.log('OTP codes will be printed to console.');
}

async function sendOtpEmail(email, otpCode) {
  const subject = `Your OTP Code: ${otpCode}`;
  const text = `Hello,\n\nYour One-Time Password (OTP) code is: ${otpCode}\n\nThis code will expire in 5 minutes.\n\nThank you!`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; background-color: #ffffff; color: #333333;">
      <h2 style="color: #ea580c; text-align: center; margin-bottom: 24px;">QR Dine Authentication</h2>
      <p style="font-size: 16px; color: #333333; line-height: 1.5;">Hello,</p>
      <p style="font-size: 16px; color: #333333; line-height: 1.5;">Your One-Time Password (OTP) code for verification is:</p>
      <div style="font-size: 32px; font-weight: bold; text-align: center; padding: 16px; margin: 24px 0; background-color: #f9fafb; border: 1px dashed #d1d5db; border-radius: 6px; letter-spacing: 4px; color: #ea580c;">
        ${otpCode}
      </div>
      <p style="font-size: 14px; color: #6b7280; line-height: 1.5;">This code is valid for <strong>5 minutes</strong>. Please do not share this code with anyone.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
      <p style="font-size: 12px; color: #9ca3af; text-align: center;">This is an automated message from QR Dine. Please do not reply to this email.</p>
    </div>
  `;

  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'QR Dine <onboarding@resend.dev>',
          to: email,
          subject,
          text,
          html
        })
      });

      const data = await response.json().catch(() => ({}));
      if (response.ok) {
        console.log(`[Resend Service] OTP email successfully sent to ${email}`);
        return true;
      } else {
        throw new Error(data.message || 'Resend API Request Failed');
      }
    } catch (error) {
      console.error(`[Resend Service] Failed to send OTP email to ${email}:`, error);
      logFallback(email, otpCode);
      return true;
    }
  } else if (transporter) {
    try {
      await transporter.sendMail({
        from: `"QR Dine Support" <${user}>`,
        to: email,
        subject,
        text,
        html
      });
      console.log(`[Email Service] OTP email successfully sent to ${email}`);
      return true;
    } catch (error) {
      console.error(`[Email Service] Failed to send OTP email to ${email}:`, error);
      logFallback(email, otpCode);
      return true;
    }
  } else {
    logFallback(email, otpCode);
    return true;
  }
}

function logFallback(email, otpCode) {
  console.log(`\n======================================================`);
  console.log(`[FALLBACK OTP CONSOLE] Target Email: ${email}`);
  console.log(`[FALLBACK OTP CONSOLE] OTP Code: ${otpCode}`);
  console.log(`======================================================\n`);
}

module.exports = {
  sendOtpEmail
};
