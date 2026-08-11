const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'Jawab <onboarding@resend.dev>';

export const isEmailConfigured = Boolean(RESEND_API_KEY);

interface SendEmailParams {
    to: string;
    subject: string;
    html: string;
}

/**
 * Sends via Resend's HTTP API directly (no SDK dependency, same pattern as
 * meta.ts's Graph API calls) — a plain POST with a bearer key. Fails
 * closed and silently: callers treat "not configured" and "send failed"
 * the same way (log it, don't block the request that triggered it), since
 * password-reset must never reveal whether an account exists via a
 * different response for "sent" vs "email unreachable".
 */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
    if (!RESEND_API_KEY) {
        console.warn('[Email] RESEND_API_KEY not configured — skipping send to', to);
        return false;
    }

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ from: EMAIL_FROM, to: [to], subject, html }),
        });

        if (!res.ok) {
            console.error('[Email] Resend API error:', res.status, await res.text());
            return false;
        }
        return true;
    } catch (err) {
        console.error('[Email] Send failed:', err);
        return false;
    }
}

export function passwordResetEmailHtml(resetUrl: string): string {
    return `
<div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
  <h1 style="font-size: 20px; margin-bottom: 16px;">Reset your Jawab password</h1>
  <p style="color: #444; line-height: 1.6;">
    Click the button below to choose a new password. This link expires in 1 hour and can only be used once.
  </p>
  <p style="margin: 32px 0;">
    <a href="${resetUrl}" style="background: #000; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Reset password
    </a>
  </p>
  <p style="color: #888; font-size: 13px; line-height: 1.6;">
    If you didn't request this, you can safely ignore this email — your password won't change.
  </p>
</div>`.trim();
}
