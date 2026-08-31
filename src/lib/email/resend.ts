import "server-only";
import { Resend } from "resend";

// Resend's sandbox "from" address (onboarding@resend.dev) only delivers to the
// account owner's own inbox until a domain is verified -- fine for a personal app,
// a real limitation if this is ever used to email other people. Override via
// RESEND_FROM_EMAIL once a domain is verified in the Resend dashboard.
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? "Planner <onboarding@resend.dev>";

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    // Same "fail gracefully, don't crash" pattern as the AI import's missing
    // ANTHROPIC_API_KEY -- but a reset link can't just show an error to the user
    // and stop there, so the link is logged server-side to keep local dev usable
    // without a real Resend account.
    console.warn(`[email] RESEND_API_KEY not set -- password reset email not sent. Reset link: ${resetUrl}`);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: "Reset your Planner password",
    html:
      `<p>Someone requested a password reset for this Planner account.</p>` +
      `<p><a href="${resetUrl}">Reset your password</a> — this link expires in 30 minutes and can only be used once.</p>` +
      `<p>If you didn't request this, you can safely ignore this email.</p>`,
  });

  if (error) {
    console.error("[email] Resend failed to send password reset email:", error);
    throw new Error("Couldn't send the reset email. Try again shortly.");
  }
}
