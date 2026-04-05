import "server-only";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const FROM = "UIGen <onboarding@resend.dev>";

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${APP_URL}/verify?token=${token}`;

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Verify your email — UIGen",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="margin-bottom:8px">Verify your email</h2>
        <p style="color:#555;margin-bottom:24px">
          Click the button below to verify your email and start using UIGen.
          This link expires in 24 hours.
        </p>
        <a href="${url}"
           style="display:inline-block;background:#000;color:#fff;padding:12px 24px;
                  border-radius:8px;text-decoration:none;font-weight:600">
          Verify Email
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">
          Or copy this link: ${url}
        </p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${APP_URL}/reset-password?token=${token}`;

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: "Reset your password — UIGen",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="margin-bottom:8px">Reset your password</h2>
        <p style="color:#555;margin-bottom:24px">
          Click the button below to reset your password.
          This link expires in 1 hour. If you didn't request this, ignore this email.
        </p>
        <a href="${url}"
           style="display:inline-block;background:#000;color:#fff;padding:12px 24px;
                  border-radius:8px;text-decoration:none;font-weight:600">
          Reset Password
        </a>
        <p style="color:#999;font-size:12px;margin-top:24px">
          Or copy this link: ${url}
        </p>
      </div>
    `,
  });
}
