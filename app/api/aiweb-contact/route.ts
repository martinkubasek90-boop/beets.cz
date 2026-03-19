import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, company, budget, message, gdpr } = body;

    if (!name || !email || !message || !gdpr) {
      return NextResponse.json({ error: 'Vyplňte prosím povinná pole.' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Neplatná e-mailová adresa.' }, { status: 400 });
    }

    const to = process.env.AIWEB_CONTACT_EMAIL || process.env.NOTIFY_EMAIL_FROM || 'info@aiweb.cz';

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0a0d1f; color: #e2e8f0; padding: 32px; border-radius: 12px;">
        <h2 style="color: #a78bfa; margin-bottom: 24px;">📩 Nová poptávka z AIWEB.CZ</h2>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #94a3b8; width: 140px;">Jméno:</td><td style="padding: 8px 0; font-weight: 600;">${name}</td></tr>
          <tr><td style="padding: 8px 0; color: #94a3b8;">E-mail:</td><td style="padding: 8px 0;"><a href="mailto:${email}" style="color: #38bdf8;">${email}</a></td></tr>
          ${phone ? `<tr><td style="padding: 8px 0; color: #94a3b8;">Telefon:</td><td style="padding: 8px 0;">${phone}</td></tr>` : ''}
          ${company ? `<tr><td style="padding: 8px 0; color: #94a3b8;">Firma:</td><td style="padding: 8px 0;">${company}</td></tr>` : ''}
          ${budget ? `<tr><td style="padding: 8px 0; color: #94a3b8;">Rozpočet:</td><td style="padding: 8px 0;">${budget}</td></tr>` : ''}
        </table>
        <div style="margin-top: 24px; padding: 16px; background: #0f1330; border-radius: 8px; border-left: 3px solid #a78bfa;">
          <p style="color: #94a3b8; margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Zpráva</p>
          <p style="margin: 0; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</p>
        </div>
        <p style="margin-top: 24px; color: #475569; font-size: 12px;">Odesláno: ${new Date().toLocaleString('cs-CZ', { timeZone: 'Europe/Prague' })}</p>
      </div>
    `;

    const text = `Nová poptávka z AIWEB.CZ\n\nJméno: ${name}\nE-mail: ${email}${phone ? `\nTelefon: ${phone}` : ''}${company ? `\nFirma: ${company}` : ''}${budget ? `\nRozpočet: ${budget}` : ''}\n\nZpráva:\n${message}`;

    await sendEmail({
      to,
      subject: `Poptávka od ${name}${company ? ` (${company})` : ''} – AIWEB.CZ`,
      text,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[aiweb-contact]', err);
    return NextResponse.json({ error: 'Interní chyba serveru.' }, { status: 500 });
  }
}
