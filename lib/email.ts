import nodemailer from 'nodemailer';

type SendEmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  from?: string;
};

/**
 * Minimal email sender with two backends:
 * 1) SMTP (preferred) – configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE (optional), NOTIFY_EMAIL_FROM
 * 2) Webhook fallback – NOTIFY_EMAIL_WEBHOOK/EMAIL_WEBHOOK_URL accepting {to,subject,text,html,from}
 */
export async function sendEmail(payload: SendEmailPayload) {
  const from = payload.from || process.env.NOTIFY_EMAIL_FROM || 'notifications@mpc.local';
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass) {
    const port = Number(process.env.SMTP_PORT || 465);
    const secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : port === 465;
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port,
      secure,
      auth: { user: smtpUser, pass: smtpPass },
    });
    const info = await transporter.sendMail({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
    return { ok: Boolean(info?.messageId), status: info?.response };
  }

  const webhook = process.env.NOTIFY_EMAIL_WEBHOOK || process.env.EMAIL_WEBHOOK_URL;
  if (!webhook) {
    return { ok: false, skipped: 'missing_webhook' } as const;
  }

  const res = await fetch(webhook, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    }),
  });

  return { ok: res.ok, status: res.status, skipped: false as const };
}
