import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type LeadPayload = {
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
  };
  inputs?: {
    capacity?: number;
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

  const capacity = toNumber(payload.inputs?.capacity);
  const payback = toNumber(payload.calculations?.simplePayback);
  const irr = toNumber(payload.calculations?.irr);
  const revenue = toNumber(payload.calculations?.netRevenue);

  const descriptionLines = [
    `Zdroj: BESS kalkulačka (${payload.type === 'pdf' ? 'PDF' : 'Analýza'})`,
    capacity !== undefined ? `Kapacita: ${Math.round(capacity)} kWh` : null,
    payback !== undefined ? `Návratnost: ${payback.toFixed(1)} let` : null,
    irr !== undefined ? `IRR: ${irr.toFixed(1)} %` : null,
    revenue !== undefined ? `Roční čistý výnos: ${Math.round(revenue).toLocaleString('cs-CZ')} Kč` : null,
    payload.message?.trim() ? `Poznámka klienta: ${payload.message.trim()}` : null,
    payload.sourceUrl?.trim() ? `URL: ${payload.sourceUrl.trim()}` : null,
  ].filter(Boolean);

  const dealName = `${payload.type === 'pdf' ? 'PDF lead' : 'BESS lead'} - ${payload.company?.trim() || payload.name?.trim() || payload.email}`;

  const deal = await hubspotRequest<{ id: string }>(token, '/crm/v3/objects/deals', {
    method: 'POST',
    body: JSON.stringify({
      properties: {
        dealname: dealName,
        pipeline,
        dealstage,
        description: descriptionLines.join('\n'),
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

    return NextResponse.json({ ok: true, contactId, dealId: dealId || null });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'HubSpot sync failed.' }, { status: 500 });
  }
}
