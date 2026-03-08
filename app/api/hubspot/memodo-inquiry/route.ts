import { NextResponse } from "next/server";
import { categoryLabels, type InquiryInterest } from "@/lib/memodo-data";
import { sendEmail } from "@/lib/email";
import { getMemodoServiceClient } from "@/lib/memodo-catalog";

export const runtime = "nodejs";

type MemodoInquiryPayload = {
  first_name?: string;
  last_name?: string;
  contact_name?: string;
  company?: string;
  email?: string;
  phone?: string;
  product_interest?: InquiryInterest;
  message?: string;
  estimated_quantity?: number;
  product_id?: string;
  battery_id?: string;
  recommended_set?: {
    inverterId?: string;
    batteryId?: string;
  };
  recommended_set_text?: string;
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
  const fullName = payload.contact_name?.trim() || "";
  const split = splitName(fullName);
  const firstname = payload.first_name?.trim() || split.firstname;
  const lastname = payload.last_name?.trim() || split.lastname;

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
  const interest = payload.product_interest || "kompletni_sestava";
  const category =
    interest !== "kompletni_sestava"
      ? categoryLabels[interest]
      : interest === "kompletni_sestava"
        ? "Kompletní sestava"
        : undefined;
  const leadScore =
    (payload.company?.trim() ? 20 : 0) +
    (payload.phone?.trim() ? 20 : 0) +
    (qty && qty > 0 ? Math.min(40, Math.round(qty / 5)) : 0) +
    (payload.product_id?.trim() ? 20 : 0);

  return [
    "Zdroj: Memodo PWA poptávka",
    `Lead score: ${leadScore}/100`,
    payload.first_name || payload.last_name
      ? `Kontakt: ${[payload.first_name?.trim(), payload.last_name?.trim()].filter(Boolean).join(" ")}`
      : null,
    category ? `Oblast zájmu: ${category}` : null,
    qty !== undefined ? `Odhadované množství: ${qty} ks` : null,
    payload.product_id?.trim() ? `ID produktu: ${payload.product_id.trim()}` : null,
    payload.battery_id?.trim() ? `ID baterie: ${payload.battery_id.trim()}` : null,
    payload.recommended_set?.inverterId || payload.recommended_set?.batteryId
      ? `AI set: měnič=${payload.recommended_set?.inverterId || "-"}, baterie=${payload.recommended_set?.batteryId || "-"}`
      : null,
    payload.recommended_set_text?.trim() ? `AI doporučení:\n${payload.recommended_set_text.trim()}` : null,
    payload.message?.trim() ? `Zpráva klienta: ${payload.message.trim()}` : null,
    payload.sourceUrl?.trim() ? `URL: ${payload.sourceUrl.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendInquiryEmails(payload: MemodoInquiryPayload) {
  const customerEmail = payload.email?.trim();
  if (!customerEmail) return;

  const customerName = payload.contact_name?.trim() || "zákazníku";
  const internalEmail = process.env.MEMODO_SALES_EMAIL || process.env.NOTIFY_EMAIL_FROM;
  const summary = buildSummary(payload);

  await Promise.allSettled([
    sendEmail({
      to: customerEmail,
      subject: "Potvrzení přijetí poptávky | Memodo",
      text: `Dobrý den ${customerName},\n\npotvrzujeme přijetí vaší poptávky. Ozveme se vám co nejdříve.\n\nShrnutí:\n${summary}\n\nTým Memodo`,
    }),
    internalEmail
      ? sendEmail({
          to: internalEmail,
          subject: `Nová Memodo poptávka: ${payload.contact_name || payload.email}`,
          text: `Přišla nová poptávka z Memodo aplikace.\n\n${summary}`,
        })
      : Promise.resolve({ ok: false }),
  ]);
}

async function storeInquiryHistory(payload: MemodoInquiryPayload, contactId: string, dealId: string | null) {
  const email = payload.email?.trim().toLowerCase();
  const contactName = payload.contact_name?.trim();
  const message = payload.message?.trim();
  if (!email || !contactName || !message) return;

  const supabase = getMemodoServiceClient();
  if (!supabase) return;

  try {
    const qty = normalizeNumber(payload.estimated_quantity);
    await supabase.from("memodo_inquiries").insert({
      email,
      contact_name: contactName,
      company: payload.company?.trim() || null,
      phone: payload.phone?.trim() || null,
      product_interest: payload.product_interest || null,
      message,
      estimated_quantity: qty ?? null,
      product_id: payload.product_id?.trim() || null,
      battery_id: payload.battery_id?.trim() || null,
      hubspot_contact_id: contactId,
      hubspot_deal_id: dealId || null,
    });
  } catch {
    // Non-blocking persistence.
  }
}

export async function POST(request: Request) {
  const token = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "Missing HUBSPOT_PRIVATE_APP_TOKEN." }, { status: 500 });
  }

  const payload = (await request.json().catch(() => ({}))) as MemodoInquiryPayload;
  const email = payload.email?.trim().toLowerCase();
  const firstName = payload.first_name?.trim();
  const lastName = payload.last_name?.trim();
  const combinedName = payload.contact_name?.trim() || [firstName, lastName].filter(Boolean).join(" ").trim();
  const message = payload.message?.trim();
  const normalizedPayload: MemodoInquiryPayload = {
    ...payload,
    contact_name: combinedName,
    product_interest: payload.product_interest || "kompletni_sestava",
  };

  if (!email || !combinedName || !message) {
    return NextResponse.json({ error: "Missing required inquiry fields." }, { status: 400 });
  }

  try {
    const contactId = await upsertContact(token, normalizedPayload);
    const dealId = await createDeal(token, normalizedPayload, contactId);
    const summary = buildSummary(normalizedPayload);
    if (summary) {
      await createNote(token, dealId, contactId, summary);
    }
    await storeInquiryHistory(normalizedPayload, contactId, dealId);
    await sendInquiryEmails(normalizedPayload);
    return NextResponse.json({ ok: true, contactId, dealId: dealId || null });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "HubSpot sync failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
