import { NextResponse } from "next/server";
import { categoryLabels, type InquiryInterest } from "@/lib/memodo-data";

export const runtime = "nodejs";

type MemodoInquiryPayload = {
  contact_name?: string;
  company?: string;
  email?: string;
  phone?: string;
  product_interest?: InquiryInterest;
  message?: string;
  estimated_quantity?: number;
  product_id?: string;
  sourceUrl?: string;
};

const HUBSPOT_BASE_URL = "https://api.hubapi.com";

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstname: "", lastname: "" };
  if (parts.length === 1) return { firstname: parts[0], lastname: "" };
  return {
    firstname: parts.slice(0, -1).join(" "),
    lastname: parts[parts.length - 1],
  };
}

function normalizeNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

async function hubspotRequest<T>(token: string, path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${HUBSPOT_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
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

async function upsertContact(token: string, payload: MemodoInquiryPayload) {
  const email = payload.email!.trim().toLowerCase();
  const name = payload.contact_name?.trim() || "";
  const { firstname, lastname } = splitName(name);

  const contactProps: Record<string, string> = { email };
  if (firstname) contactProps.firstname = firstname;
  if (lastname) contactProps.lastname = lastname;
  if (payload.company?.trim()) contactProps.company = payload.company.trim();
  if (payload.phone?.trim()) contactProps.phone = payload.phone.trim();

  type ContactSearchResponse = { results: Array<{ id: string }> };
  const search = await hubspotRequest<ContactSearchResponse>(token, "/crm/v3/objects/contacts/search", {
    method: "POST",
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [{ propertyName: "email", operator: "EQ", value: email }],
        },
      ],
      limit: 1,
      properties: ["email"],
    }),
  });

  const existing = search.results[0];
  if (existing?.id) {
    await hubspotRequest(token, `/crm/v3/objects/contacts/${existing.id}`, {
      method: "PATCH",
      body: JSON.stringify({ properties: contactProps }),
    });
    return existing.id;
  }

  const created = await hubspotRequest<{ id: string }>(token, "/crm/v3/objects/contacts", {
    method: "POST",
    body: JSON.stringify({ properties: contactProps }),
  });
  return created.id;
}

function getPipelineConfig() {
  return {
    pipeline: process.env.HUBSPOT_MEMODO_PIPELINE || process.env.HUBSPOT_PIPELINE,
    dealstage: process.env.HUBSPOT_MEMODO_DEAL_STAGE || process.env.HUBSPOT_DEAL_STAGE,
  };
}

async function createDeal(token: string, payload: MemodoInquiryPayload, contactId: string) {
  const { pipeline, dealstage } = getPipelineConfig();
  if (!pipeline || !dealstage) return null;

  const dealName = `Memodo poptávka - ${payload.company?.trim() || payload.contact_name?.trim() || payload.email}`;
  const summary = buildSummary(payload);

  const deal = await hubspotRequest<{ id: string }>(token, "/crm/v3/objects/deals", {
    method: "POST",
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
      { method: "PUT" },
    );
  } catch {
    // Non-blocking association.
  }

  return deal.id;
}

async function createNote(token: string, dealId: string | null, contactId: string, summary: string) {
  const note = await hubspotRequest<{ id: string }>(token, "/crm/v3/objects/notes", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        hs_timestamp: new Date().toISOString(),
        hs_note_body: summary.replace(/\n/g, "<br>"),
      },
    }),
  });

  if (dealId) {
    try {
      await hubspotRequest(token, `/crm/v4/objects/notes/${note.id}/associations/default/deals/${dealId}`, {
        method: "PUT",
      });
    } catch {
      // Non-blocking association.
    }
  }

  try {
    await hubspotRequest(token, `/crm/v4/objects/notes/${note.id}/associations/default/contacts/${contactId}`, {
      method: "PUT",
    });
  } catch {
    // Non-blocking association.
  }
}

function buildSummary(payload: MemodoInquiryPayload) {
  const qty = normalizeNumber(payload.estimated_quantity);
  const category =
    payload.product_interest && payload.product_interest !== "kompletni_sestava"
      ? categoryLabels[payload.product_interest]
      : payload.product_interest === "kompletni_sestava"
        ? "Kompletní sestava"
        : undefined;

  return [
    "Zdroj: Memodo PWA poptávka",
    category ? `Oblast zájmu: ${category}` : null,
    qty !== undefined ? `Odhadované množství: ${qty} ks` : null,
    payload.product_id?.trim() ? `ID produktu: ${payload.product_id.trim()}` : null,
    payload.message?.trim() ? `Zpráva klienta: ${payload.message.trim()}` : null,
    payload.sourceUrl?.trim() ? `URL: ${payload.sourceUrl.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST(request: Request) {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Missing HUBSPOT_PRIVATE_APP_TOKEN." }, { status: 500 });
  }

  const payload = (await request.json().catch(() => ({}))) as MemodoInquiryPayload;
  const email = payload.email?.trim().toLowerCase();
  const name = payload.contact_name?.trim();
  const message = payload.message?.trim();
  const interest = payload.product_interest;

  if (!email || !name || !message || !interest) {
    return NextResponse.json({ error: "Missing required inquiry fields." }, { status: 400 });
  }

  try {
    const contactId = await upsertContact(token, payload);
    const dealId = await createDeal(token, payload, contactId);
    const summary = buildSummary(payload);
    if (summary) {
      await createNote(token, dealId, contactId, summary);
    }
    return NextResponse.json({ ok: true, contactId, dealId: dealId || null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "HubSpot sync failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

