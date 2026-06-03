// backend/src/services/email.service.ts
// Reusable email service using SendGrid.
// If SENDGRID_API_KEY is not set, it gracefully falls back to console.log.
import sgMail from '@sendgrid/mail';
import { config } from '../config.js';

// ---------------------------------------------------------------------------
// Initialise SendGrid with the API key from environment
// ---------------------------------------------------------------------------
if (config.SENDGRID_API_KEY) {
  sgMail.setApiKey(config.SENDGRID_API_KEY);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Shape of an email to send */
export interface EmailPayload {
  /** Recipient email address */
  to: string;
  /** Subject line */
  subject: string;
  /** Plain‑text body (for email clients that don't support HTML) */
  text?: string;
  /** HTML body (preferred for marketing/transactional emails) */
  html?: string;
}

// ---------------------------------------------------------------------------
// sendEmail
// ---------------------------------------------------------------------------

/**
 * Send an email via SendGrid.
 * If the API key is not configured, falls back to logging to console.
 * @param payload – email recipient, subject, and body
 * @returns a Promise that resolves when the email is sent (or logged)
 */
export async function sendEmail(payload: EmailPayload): Promise<void> {
  // Use the configured "from" address. If missing, fail gracefully.
  const from = config.EMAIL_FROM ?? 'noreply@omnimarket.local';

  // Build the message object according to the SendGrid v3 API
  const msg = {
    to: payload.to,
    from, // verified sender in SendGrid
    subject: payload.subject,
    text: payload.text ?? payload.subject,
    html: payload.html ?? `<p>${payload.text ?? payload.subject}</p>`,
  };

  // If SendGrid is configured, attempt to send the email
  if (config.SENDGRID_API_KEY) {
    try {
      await sgMail.send(msg);
      console.log(`✅ Email sent to ${payload.to} – "${payload.subject}"`);
    } catch (error) {
      // Log the error but don't crash the application
      console.error(`❌ Failed to send email to ${payload.to}:`, error);
    }
  } else {
    // Development / test fallback – print the email to console
    console.log(`📧 [EMAIL STUB] To: ${payload.to} | Subject: ${payload.subject}`);
    console.log(`   Body (text): ${msg.text}`);
  }
}

/**
 * Send a password reset email.
 * @param to – recipient email
 * @param resetToken – plain token for the reset link
 */
export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
  // In production, this would contain a link to the frontend reset page.
  // For now we just include the token in the email body.
  const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;
  await sendEmail({
    to,
    subject: 'Reset your OmniMarket password',
    text: `You requested a password reset. Use the following link to reset your password: ${resetUrl}\n\nThis link expires in 1 hour.`,
    html: `<p>You requested a password reset.</p><p><a href="${resetUrl}">Click here to reset your password</a></p><p>This link expires in 1 hour.</p>`,
  });
}
