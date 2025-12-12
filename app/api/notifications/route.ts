import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';

type EventType = 'direct_message' | 'project_access_request' | 'collab_request' | 'collab_message' | 'missed_call';

type NotificationPayload = {
  type: EventType;
  targetUserId?: string;
  targetUserIds?: string[];
  targetEmail?: string;
  user_id?: string;
  data?: Record<string, any>;
  itemId?: string | number;
  itemType?: string;
  threadId?: string;
  senderId?: string;
  fanOutCollab?: boolean;
};

type EmailContent = { subject: string; text: string; html?: string };

const LOGO_URL =
  'https://xbezrcyjfsumhohckwsd.supabase.co/storage/v1/object/public/Avatars/39b6ec86-7841-4ae1-a31c-721f7dd46108/avatar.png';

function renderTemplate({
  heading,
  intro,
  preview,
  buttonLabel,
  buttonUrl,
  footer = 'Díky,<br />tým BEETS.CZ',
}: {
  heading: string;
  intro: string;
  preview?: string;
  buttonLabel?: string;
  buttonUrl?: string;
  footer?: string;
}) {
  const safePreview = preview ? preview.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
  const safeIntro = intro.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; background: #0b0b0b; color: #e8e8e8; padding: 24px;">
      <tr>
        <td align="left">
          <table cellpadding="0" cellspacing="0" style="max-width: 520px; width: 100%;">
            <tr>
              <td style="padding: 0 0 16px 0; display: flex; align-items: center; gap: 12px;">
                <img src="${LOGO_URL}" alt="BEETS.CZ" width="210" height="68" style="display: block; border: none;" />
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 12px 0;">
                <h2 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">${heading}</h2>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 0 12px 0; color: #c8c8c8; font-size: 14px; line-height: 1.5;">
                ${safeIntro}
              </td>
            </tr>
            ${
              buttonLabel && buttonUrl
                ? `<tr>
                    <td style="padding: 0 0 16px 0;">
                      <a href="${buttonUrl}" style="display: inline-block; padding: 12px 18px; background: #f37433; color: #000; font-weight: 700; text-decoration: none; border-radius: 6px;">
                        ${buttonLabel}
                      </a>
                    </td>
                  </tr>`
                : ''
            }
            ${
              safePreview
                ? `<tr>
                    <td style="padding: 0 0 12px 0; color: #8f8f8f; font-size: 13px; line-height: 1.5;">
                      ${safePreview}
                    </td>
                  </tr>`
                : ''
            }
            <tr>
              <td style="padding: 12px 0 0 0; color: #c8c8c8; font-size: 13px; line-height: 1.5;">
                ${footer}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
}

function buildEmail(type: EventType, data: Record<string, any> = {}): EmailContent {
  const from = data.from ?? data.fromName ?? data.from_name ?? data.sender ?? data.senderName ?? 'uživatel';
  const projectTitle = data.projectTitle ?? 'projekt';
  const requester = data.requesterName ?? from;
  const threadTitle = data.threadTitle ?? 'Spolupráce';
  const preview = (data.body ?? data.message ?? '').toString().slice(0, 240);
  const friendlyPreview = preview ? `\n\n${preview}` : '';
  const link = data.link || data.url || null;

  switch (type) {
    case 'direct_message':
      return {
        subject: `Nová zpráva od ${from}`,
        text: `Dostal(a) jsi novou zprávu od ${from}.${friendlyPreview}`,
        html: renderTemplate({
          heading: 'Nová zpráva',
          intro: `Dostal(a) jsi novou zprávu od ${from}.`,
          preview,
          buttonLabel: link ? 'Otevřít zprávy' : undefined,
          buttonUrl: link || undefined,
        }),
      };
    case 'project_access_request':
      return {
        subject: `Žádost o přístup k projektu ${projectTitle}`,
        text: `${requester} požádal(a) o přístup k projektu "${projectTitle}".${friendlyPreview}`,
        html: renderTemplate({
          heading: 'Žádost o přístup k projektu',
          intro: `${requester} požádal(a) o přístup k projektu „${projectTitle}“.`,
          preview,
          buttonLabel: link ? 'Otevřít projekt' : undefined,
          buttonUrl: link || undefined,
        }),
      };
    case 'collab_request':
      return {
        subject: `Nová žádost o spolupráci: ${threadTitle}`,
        text: `${requester} chce zahájit spolupráci „${threadTitle}“.${friendlyPreview}`,
        html: renderTemplate({
          heading: 'Nová spolupráce',
          intro: `${requester} chce zahájit spolupráci „${threadTitle}“.`,
          preview,
          buttonLabel: link ? 'Otevřít spolupráci' : undefined,
          buttonUrl: link || undefined,
        }),
      };
    case 'collab_message':
      return {
        subject: `Nová zpráva ve spolupráci: ${threadTitle}`,
        text: `Ve vlákně „${threadTitle}“ přistála nová zpráva od ${from}.${friendlyPreview}`,
        html: renderTemplate({
          heading: 'Nová zpráva ve spolupráci',
          intro: `Ve vlákně „${threadTitle}“ přistála nová zpráva od ${from}.`,
          preview,
          buttonLabel: link ? 'Otevřít spolupráci' : undefined,
          buttonUrl: link || undefined,
        }),
      };
    case 'missed_call':
      return {
        subject: `Zmeškaný hovor od ${from}`,
        text: `Zmeškal(a) jsi hovor od ${from}. ${data.roomName ? `Místnost: ${data.roomName}.` : ''}`,
        html: renderTemplate({
          heading: 'Zmeškaný hovor',
          intro: `Zmeškal(a) jsi hovor od ${from}.`,
          preview: data.roomName ? `Místnost: ${data.roomName}` : undefined,
          buttonLabel: link ? 'Připojit se' : undefined,
          buttonUrl: link || undefined,
        }),
      };
    default:
      return {
        subject: 'Nová aktivita',
        text: 'Na profilu máš novou aktivitu.',
      };
  }
}

export async function POST(req: Request) {
  let payload: NotificationPayload;
  try {
    payload = (await req.json()) as NotificationPayload;
  } catch (err: any) {
    return NextResponse.json({ error: 'Invalid JSON payload', detail: err?.message }, { status: 400 });
  }

  const {
    type,
    targetUserId,
    targetUserIds,
    targetEmail,
    user_id: legacyUserId,
    data = {},
    itemId,
    itemType,
    threadId,
    senderId,
    fanOutCollab,
  } = payload || {};
  if (!type) {
    return NextResponse.json({ error: 'Missing type' }, { status: 400 });
  }

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SERVICE_ROLE_KEY;
  const hasServiceEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && serviceKey);
  const service = hasServiceEnv
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey!)
    : null;

  const explicitEmail = targetEmail || (data as any)?.targetEmail || (data as any)?.email || null;
  const recipients = new Set<string>();
  const normalizedTargetId = targetUserId || legacyUserId;
  if (normalizedTargetId) recipients.add(normalizedTargetId);
  (targetUserIds || []).filter(Boolean).forEach((id) => recipients.add(id));

  if (fanOutCollab && service && threadId) {
    try {
      const { data: participants } = await service
        .from('collab_participants')
        .select('user_id')
        .eq('thread_id', threadId);
      (participants as any[] | null | undefined)?.forEach((row) => {
        if (row?.user_id) recipients.add(row.user_id as string);
      });
    } catch (err) {
      console.warn('Nepodařilo se načíst účastníky spolupráce:', err);
    }
  }

  if (senderId) {
    recipients.delete(senderId);
  }

  if (!recipients.size && !explicitEmail) {
    return NextResponse.json({ error: 'No recipients resolved' }, { status: 400 });
  }

  const enrichedData = { ...data };
  if (!enrichedData.from && !enrichedData.fromName && !enrichedData.from_name && service && senderId) {
    try {
      const { data: senderProfile } = await service.from('profiles').select('display_name').eq('id', senderId).maybeSingle();
      if (senderProfile?.display_name) {
        enrichedData.from = senderProfile.display_name;
      }
    } catch (err) {
      console.warn('Nepodařilo se načíst jméno odesílatele:', err);
    }
  }

  const contentCache = buildEmail(type, enrichedData);
  const results: Array<{ userId: string | null; emailSent: boolean; inserted: boolean }> = [];

  async function notifyOne(userId: string | null, fallbackEmail?: string | null) {
    let email = fallbackEmail || null;
    let displayName: string | null = null;
    let insertOk = false;

    if (service && userId) {
      try {
        const { data: profile } = await service.from('profiles').select('display_name').eq('id', userId).maybeSingle();
        displayName = (profile as any)?.display_name ?? null;
      } catch (err) {
        console.warn('Nepodařilo se načíst profil pro notifikaci:', err);
      }

      if (!email) {
        try {
          const { data: userRes } = await service.auth.admin.getUserById(userId);
          email = userRes?.user?.email ?? null;
        } catch (err) {
          console.warn('Nepodařilo se načíst e-mail uživatele:', err);
        }
      }

      try {
        const content = buildEmail(type, { ...data, targetName: displayName });
        await service.from('notifications').insert({
          user_id: userId,
          type,
          title: content.subject,
          body: content.text,
          item_type: itemType ?? null,
          item_id: itemId ?? null,
          read: false,
        });
        insertOk = true;
      } catch (err) {
        console.warn('Insert do notifications selhal (pokračuji bez přerušení):', err);
      }
    }

    const content = buildEmail(type, { ...enrichedData, targetName: displayName });
    if (email) {
      const result = await sendEmail({
        to: email,
        subject: content.subject,
        text: content.text,
        html: content.html,
      });
      results.push({ userId, emailSent: result.ok, inserted: insertOk });
    } else {
      results.push({ userId, emailSent: false, inserted: insertOk });
    }
  }

  if (recipients.size) {
    for (const id of recipients) {
      // eslint-disable-next-line no-await-in-loop
      await notifyOne(id);
    }
  } else if (explicitEmail) {
    await notifyOne(null, explicitEmail);
  }

  const emailSent = results.some((r) => r.emailSent);
  const inserted = results.some((r) => r.inserted);

  return NextResponse.json({ ok: true, emailSent, inserted, results, template: contentCache.subject });
}
