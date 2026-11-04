/** Transactional email via Resend's HTTP API. In development without a key, emails are logged (links only). */
import "server-only";
import { env } from "./env";

export async function sendEmail(to: string, subject: string, html: string, text: string) {
  if (!env.resend.apiKey) {
    if (env.isProd) {
      console.error("[email] RESEND_API_KEY missing — email not sent:", subject);
      return { sent: false };
    }
    console.log(`\n[email:dev] To: ${to}\nSubject: ${subject}\n${text}\n`);
    return { sent: false, dev: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${env.resend.apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from: env.resend.from, to, subject, html, text }),
  });
  if (!res.ok) console.error("[email] provider error", res.status);
  return { sent: res.ok };
}

const wrap = (title: string, body: string, cta?: { href: string; label: string }) => `
<div style="font-family:Nunito,Arial,sans-serif;background:#F4F6F8;padding:32px">
  <div style="max-width:480px;margin:auto;background:#fff;border-radius:24px;padding:32px;color:#242B35">
    <div style="font-size:22px;font-weight:800;color:#425A7C">🐾 Walkie</div>
    <h1 style="font-size:22px;margin:20px 0 8px">${title}</h1>
    <p style="font-size:15px;line-height:1.6;color:#4b5563">${body}</p>
    ${cta ? `<a href="${cta.href}" style="display:inline-block;margin-top:16px;background:#6B8FD6;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700">${cta.label}</a>` : ""}
  </div>
</div>`;

export const emails = {
  verify: (url: string) => ({ subject: "Verify your Walkie email", html: wrap("Confirm it's you", "Tap the button to verify your email. Walkie is wagging already.", { href: url, label: "Verify email" }), text: `Verify your email: ${url}` }),
  reset: (url: string) => ({ subject: "Reset your Walkie password", html: wrap("Reset your password", "Someone (hopefully you) asked to reset your password. This link expires in 1 hour.", { href: url, label: "Choose a new password" }), text: `Reset your password: ${url}` }),
};
