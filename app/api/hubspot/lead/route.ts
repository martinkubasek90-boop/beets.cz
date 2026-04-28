import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { buildKalkulackaPdf } from '@/lib/kalkulacka-pdf';

export const runtime = 'nodejs';

type LeadPayload = {
  calculatorType?: 'bess' | 'fve';
  type?: 'pdf' | 'analysis';
  name?: string;
  email?: string;
  company?: string;
  phone?: string;
  message?: string;
  sourceUrl?: string;
  calculations?: {
    simplePayback?: number;
    netRevenue?: number;
    irr?: number;
    annualProduction?: number;
    annualSavings?: number;
    annualExportRevenue?: number;
    batteryBenefit?: number;
    annualBenefit?: number;
    grossCapex?: number;
    subsidyAmount?: number;
    equityNeeded?: number;
    selfConsumedEnergy?: number;
    exportedEnergy?: number;
    neededPeakCutKw?: number;
    achievablePeakCutKw?: number;
    shiftedSelfConsumptionKwh?: number;
    shiftedVolatilityKwh?: number;
  };
  inputs?: {
    capacity?: number;
    systemSizeKw?: number;
    annualConsumptionMwh?: number;
    useBattery?: boolean;
    batteryPowerKw?: number;
    batteryScenario?: string;
    voltageLevel?: string;
    peakFrequency?: string;
    powerPriceKwh?: number;
    distributionPriceKwh?: number;
    feedInPriceKwh?: number;
    subsidyPct?: number;
  };
};

const HUBSPOT_BASE_URL = 'https://api.hubapi.com';

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstname: '', lastname: '' };
  if (parts.length === 1) return { firstname: parts[0], lastname: '' };
  return {
    firstname: parts.slice(0, -1).join(' '),
    lastname: parts[parts.length - 1],
  };
}

function toNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function hubspotRequest<T>(token: string, path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${HUBSPOT_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HubSpot API error ${response.status}: ${text}`);
  }

  const text = await response.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

async function upsertContact(token: string, payload: LeadPayload) {
  const email = payload.email!.trim().toLowerCase();
  const name = payload.name?.trim() || '';
  const { firstname, lastname } = splitName(name);

  const contactProps: Record<string, string> = {
    email,
  };
  if (firstname) contactProps.firstname = firstname;
  if (lastname) contactProps.lastname = lastname;
  if (payload.company?.trim()) contactProps.company = payload.company.trim();
  if (payload.phone?.trim()) contactProps.phone = payload.phone.trim();

  type ContactSearchResponse = { results: Array<{ id: string }> };
  const search = await hubspotRequest<ContactSearchResponse>(token, '/crm/v3/objects/contacts/search', {
    method: 'POST',
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'email',
              operator: 'EQ',
              value: email,
            },
          ],
        },
      ],
      limit: 1,
      properties: ['email'],
    }),
  });

  const existing = search.results[0];
  if (existing?.id) {
    await hubspotRequest(token, `/crm/v3/objects/contacts/${existing.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ properties: contactProps }),
    });
    return existing.id;
  }

  const created = await hubspotRequest<{ id: string }>(token, '/crm/v3/objects/contacts', {
    method: 'POST',
    body: JSON.stringify({ properties: contactProps }),
  });
  return created.id;
}

async function createDeal(token: string, payload: LeadPayload, contactId: string) {
  const pipeline = process.env.HUBSPOT_PIPELINE;
  const dealstage = process.env.HUBSPOT_DEAL_STAGE;

  if (!pipeline || !dealstage) {
    return null;
  }

  const summary = buildDealSummary(payload);
  const calculatorType = payload.calculatorType === 'fve' ? 'fve' : 'bess';

  const dealPrefix = payload.type === 'pdf' ? 'PDF lead' : calculatorType === 'fve' ? 'FVE lead' : 'BESS lead';
  const dealName = `${dealPrefix} - ${payload.company?.trim() || payload.name?.trim() || payload.email}`;

  const deal = await hubspotRequest<{ id: string }>(token, '/crm/v3/objects/deals', {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        dealname: dealName,
        pipeline,
        dealstage,
        description: summary,
      },
    }),
  });

  try {
    await hubspotRequest(
      token,
      `/crm/v4/objects/deals/${deal.id}/associations/default/contacts/${contactId}`,
      {
        method: 'PUT',
      },
    );
  } catch {
    // Association failure should not block lead capture.
  }

  return deal.id;
}

async function createDealNote(token: string, dealId: string, contactId: string, summary: string) {
  const note = await hubspotRequest<{ id: string }>(token, '/crm/v3/objects/notes', {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        hs_timestamp: new Date().toISOString(),
        hs_note_body: summary.replace(/\n/g, '<br>'),
      },
    }),
  });

  try {
    await hubspotRequest(
      token,
      `/crm/v4/objects/notes/${note.id}/associations/default/deals/${dealId}`,
      { method: 'PUT' },
    );
  } catch {
    // Do not block lead capture when note association fails.
  }

  try {
    await hubspotRequest(
      token,
      `/crm/v4/objects/notes/${note.id}/associations/default/contacts/${contactId}`,
      { method: 'PUT' },
    );
  } catch {
    // Do not block lead capture when note association fails.
  }
}

function buildDealSummary(payload: LeadPayload) {
  const capacity = toNumber(payload.inputs?.capacity);
  const systemSizeKw = toNumber(payload.inputs?.systemSizeKw);
  const payback = toNumber(payload.calculations?.simplePayback);
  const irr = toNumber(payload.calculations?.irr);
  const revenue = toNumber(payload.calculations?.netRevenue);
  const calculatorType = payload.calculatorType === 'fve' ? 'fve' : 'bess';

  return [
    `Zdroj: ${calculatorType === 'fve' ? 'FVE kalkulačka' : 'BESS kalkulačka'} (${payload.type === 'pdf' ? 'PDF' : 'Analýza'})`,
    calculatorType === 'fve'
      ? systemSizeKw !== undefined
        ? `Velikost FVE: ${Math.round(systemSizeKw)} kWp`
        : null
      : capacity !== undefined
        ? `Kapacita: ${Math.round(capacity)} kWh`
        : null,
    payback !== undefined ? `Návratnost: ${payback.toFixed(1)} let` : null,
    calculatorType === 'bess' && irr !== undefined ? `IRR: ${irr.toFixed(1)} %` : null,
    revenue !== undefined
      ? `${calculatorType === 'fve' ? 'Roční přínos' : 'Roční čistý výnos'}: ${Math.round(revenue).toLocaleString('cs-CZ')} Kč`
      : null,
    toNumber(payload.calculations?.grossCapex) !== undefined
      ? `Investiční náklady: ${Math.round(payload.calculations!.grossCapex!).toLocaleString('cs-CZ')} Kč`
      : null,
    toNumber(payload.calculations?.subsidyAmount) !== undefined
      ? `Dotace: ${Math.round(payload.calculations!.subsidyAmount!).toLocaleString('cs-CZ')} Kč`
      : null,
    payload.message?.trim() ? `Poznámka klienta: ${payload.message.trim()}` : null,
    payload.sourceUrl?.trim() ? `URL: ${payload.sourceUrl.trim()}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

function buildLeadEmail(payload: LeadPayload) {
  const calculatorLabel = payload.calculatorType === 'fve' ? 'FVE + baterie' : 'BESS';
  const c = payload.calculations || {};
  const payback = toNumber(c.simplePayback);
  const benefit = toNumber(c.netRevenue ?? c.annualBenefit);
  const salutation = payload.name ? `, ${payload.name}` : '';
  const htmlSalutation = payload.name ? `, ${escapeHtml(payload.name)}` : '';

  const htmlRows = [
    ['Kalkulačka', calculatorLabel],
    ['Návratnost', payback !== undefined ? `${payback.toFixed(1).replace('.', ',')} let` : undefined],
    ['Roční přínos', benefit !== undefined ? `${Math.round(benefit).toLocaleString('cs-CZ')} Kč` : undefined],
    ['Velikost FVE', toNumber(payload.inputs?.systemSizeKw) !== undefined ? `${payload.inputs!.systemSizeKw} kWp` : undefined],
    ['Kapacita baterie', toNumber(payload.inputs?.capacity) !== undefined ? `${payload.inputs!.capacity} kWh` : undefined],
  ].filter((row): row is [string, string] => Boolean(row[1]));

  return {
    subject: `BEETS kalkulačka - investiční shrnutí PDF`,
    text: [
      `Dobrý den${salutation},`,
      '',
      'v příloze posíláme PDF shrnutí z kalkulačky BEETS.',
      '',
      ...htmlRows.map(([label, value]) => `${label}: ${value}`),
      '',
      'Berete to prosím jako orientační model. Pro finální návrh je potřeba projít profil spotřeby, technické možnosti objektu a aktuální ceny technologie.',
      '',
      'Tým BEETS',
    ].join('\n'),
    html: [
      `<p>Dobrý den${htmlSalutation},</p>`,
      '<p>v příloze posíláme PDF shrnutí z kalkulačky BEETS.</p>',
      '<table cellpadding="6" cellspacing="0" style="border-collapse:collapse">',
      ...htmlRows.map(
        ([label, value]) =>
          `<tr><td style="color:#475569">${escapeHtml(label)}</td><td><strong>${escapeHtml(value)}</strong></td></tr>`,
      ),
      '</table>',
      '<p>Berete to prosím jako orientační model. Pro finální návrh je potřeba projít profil spotřeby, technické možnosti objektu a aktuální ceny technologie.</p>',
      '<p>Tým BEETS</p>',
    ].join(''),
  };
}

async function sendPdfEmail(payload: LeadPayload) {
  const pdf = buildKalkulackaPdf(payload);
  const email = buildLeadEmail(payload);
  const result = await sendEmail({
    to: payload.email!.trim().toLowerCase(),
    subject: email.subject,
    text: email.text,
    html: email.html,
    attachments: [
      {
        filename: 'beets-investicni-shrnuti.pdf',
        content: pdf,
        contentType: 'application/pdf',
      },
    ],
  });

  if (!result.ok) {
    throw new Error('PDF email se nepodařilo odeslat.');
  }
}

export async function POST(request: Request) {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'Missing HUBSPOT_PRIVATE_APP_TOKEN.' }, { status: 500 });
  }

  const payload = (await request.json().catch(() => ({}))) as LeadPayload;
  const email = payload.email?.trim().toLowerCase();
  const name = payload.name?.trim();

  if (!email || !name) {
    return NextResponse.json({ error: 'Missing required lead fields.' }, { status: 400 });
  }

  try {
    const contactId = await upsertContact(token, payload);
    const dealId = await createDeal(token, payload, contactId);
    const summary = buildDealSummary(payload);

    if (dealId && summary) {
      await createDealNote(token, dealId, contactId, summary);
    }

    if (payload.type === 'pdf') {
      await sendPdfEmail(payload);
    }

    return NextResponse.json({ ok: true, contactId, dealId: dealId || null });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'HubSpot sync failed.' }, { status: 500 });
  }
}
