import { NextResponse } from "next/server";
import { getAIBotAdminConfig } from "@/lib/aibot-admin-config";

type AIBotWebhookResponse = {
  reply?: string;
  text?: string;
  output?: string;
  sources?: string[];
  actions?: string[];
};

type AnthropicMessageResponse = {
  content?: Array<{ type?: string; text?: string }>;
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type Ga4RunReportResponse = {
  rows?: Array<{
    dimensionValues?: Array<{ value?: string }>;
    metricValues?: Array<{ value?: string }>;
  }>;
};

type HubSpotSearchResponse = {
  total?: number;
};

function normalizeToolMentions(value: string) {
  let next = value;

  const replacements: Array<[RegExp, string]> = [
    [/\bhotspot\b/gi, "HubSpot"],
    [/\bhard stop\b/gi, "HubSpot"],
    [/\bhub spot\b/gi, "HubSpot"],
    [/\bhab spot\b/gi, "HubSpot"],
    [/\bhapp spot\b/gi, "HubSpot"],
    [/\bhap spot\b/gi, "HubSpot"],
    [/\bg a 4\b/gi, "GA4"],
    [/\bga 4\b/gi, "GA4"],
    [/\bgé a čtyři\b/gi, "GA4"],
    [/\bgoogle eds\b/gi, "Google Ads"],
    [/\bgoogle adsy\b/gi, "Google Ads"],
    [/\bgůgl eds\b/gi, "Google Ads"],
    [/\bgmail\b/gi, "Gmail"],
    [/\basana\b/gi, "Asana"],
  ];

  for (const [pattern, replacement] of replacements) {
    next = next.replace(pattern, replacement);
  }

  return next.replace(/\s+/g, " ").trim();
}

function sanitizeAssistantReply(reply: string) {
  const cleaned = reply
    .replace(/\*\*/g, "")
    .replace(/[_`#>-]/g, " ")
    .replace(/[•▪◦]/g, " ")
    .replace(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();

  return cleaned;
}

function resolveClaudeModel(model: string | undefined) {
  const normalized = (model || "").trim();
  if (
    !normalized ||
    normalized === "claude-3-7-sonnet-latest" ||
    normalized === "claude-sonnet-4-20250514"
  ) {
    return "claude-sonnet-4-6";
  }
  return normalized;
}

function shouldUseWebSearch(message: string) {
  const normalized = message.toLowerCase();

  return [
    /\bkdo je\b/,
    /\bco je\b/,
    /\bjak(y|é|a|á)\b/,
    /\bkolik\b/,
    /\bkdy\b/,
    /\bkde\b/,
    /\baktu(a|á)ln/i,
    /\bdnes\b/,
    /\bted\b/,
    /\bnejnov/i,
    /\bstarosta\b/,
    /\bprim(a|á)tor\b/,
    /\bprezident\b/,
    /\bministr\b/,
    /\bředitel\b/,
    /\breditel\b/,
    /\bceo\b/,
    /\bhlavn[ií] m[eě]sto\b/i,
  ].some((pattern) => pattern.test(normalized));
}

function shouldUseGa4(message: string) {
  const normalized = message.toLowerCase();

  return [
    /\bga4\b/,
    /\banalytics\b/,
    /\bgoogle analytics\b/,
    /\bn[aá]v[sš]t[eě]v/i,
    /\bsessions?\b/i,
    /\bu[žz]ivatel/i,
    /\btraffic\b/i,
    /\bkonverz/i,
    /\bweb\b/,
  ].some((pattern) => pattern.test(normalized));
}

function shouldUseHubSpot(message: string) {
  const normalized = message.toLowerCase();

  return [
    /\bhubspot\b/,
    /\bkontakt/i,
    /\blead/i,
    /\bdeal/i,
    /\bobchod/i,
    /\bfirm/i,
    /\bspolecnost/i,
  ].some((pattern) => pattern.test(normalized));
}

function getGa4DateRange(message: string) {
  const normalized = message.toLowerCase();

  if (/\bv[čc]era\b/.test(normalized)) {
    return { startDate: "yesterday", endDate: "yesterday", label: "včera" };
  }

  if (/\bdnes\b/.test(normalized)) {
    return { startDate: "today", endDate: "today", label: "dnes" };
  }

  if (/\bposledn[ií]ch?\s*7\b/.test(normalized) || /\btyden\b/.test(normalized)) {
    return { startDate: "7daysAgo", endDate: "yesterday", label: "posledních 7 dní" };
  }

  return { startDate: "7daysAgo", endDate: "yesterday", label: "posledních 7 dní" };
}

async function getGoogleAccessToken() {
  const adminConfig = await getAIBotAdminConfig();
  const clientId = adminConfig.integrations.gmail.clientId;
  const clientSecret = adminConfig.integrations.gmail.clientSecret;
  const refreshToken = adminConfig.integrations.gmail.refreshToken;

  if (!clientId || !clientSecret || !refreshToken) {
    return null;
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as GoogleTokenResponse;
  if (!response.ok || !payload.access_token) {
    return null;
  }

  return payload.access_token;
}

async function getGa4Summary(message: string) {
  const adminConfig = await getAIBotAdminConfig();
  const propertyId = adminConfig.integrations.ga4.propertyId;
  if (!propertyId) return null;

  const accessToken = await getGoogleAccessToken();
  if (!accessToken) return null;

  const range = getGa4DateRange(message);
  const response = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        dateRanges: [
          {
            startDate: range.startDate,
            endDate: range.endDate,
          },
        ],
        metrics: [
          { name: "sessions" },
          { name: "activeUsers" },
          { name: "screenPageViews" },
          { name: "keyEvents" },
        ],
      }),
      cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => ({}))) as Ga4RunReportResponse;
  if (!response.ok || !payload.rows?.[0]?.metricValues) {
    return null;
  }

  const values = payload.rows[0].metricValues || [];
  const sessions = values[0]?.value || "0";
  const activeUsers = values[1]?.value || "0";
  const pageViews = values[2]?.value || "0";
  const keyEvents = values[3]?.value || "0";

  return `GA4 za ${range.label}: sessions ${sessions}, aktivní uživatelé ${activeUsers}, zobrazení stránek ${pageViews}, klíčové události ${keyEvents}.`;
}

async function getHubSpotSummary(message: string) {
  const adminConfig = await getAIBotAdminConfig();
  const token = adminConfig.integrations.hubspot.privateAppToken;
  if (!token) return null;

  const normalized = message.toLowerCase();
  const wantsDeals = /\bdeal/i.test(normalized) || /\bobchod/i.test(normalized);
  const wantsCompanies = /\bfirm/i.test(normalized) || /\bspolecnost/i.test(normalized);

  const objectType = wantsDeals
    ? "deals"
    : wantsCompanies
      ? "companies"
      : "contacts";
  const label = wantsDeals
    ? "dealů"
    : wantsCompanies
      ? "firem"
      : "kontaktů";

  const response = await fetch(
    `https://api.hubapi.com/crm/v3/objects/${objectType}/search`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        limit: 1,
        filterGroups: [],
        properties: ["createdate"],
      }),
      cache: "no-store",
    },
  );

  const payload = (await response.json().catch(() => ({}))) as HubSpotSearchResponse;
  if (!response.ok || typeof payload.total !== "number") {
    return null;
  }

  return `V HubSpotu je aktuálně ${payload.total} ${label}.`;
}

async function getWebhookConfig() {
  const adminConfig = await getAIBotAdminConfig().catch(() => null);
  const url =
    adminConfig?.n8n.webhookUrl || process.env.N8N_AIBOT_WEBHOOK_URL;
  const token =
    adminConfig?.n8n.webhookToken || process.env.N8N_AIBOT_WEBHOOK_TOKEN;

  if (!url) {
    throw new Error("N8N_AIBOT_WEBHOOK_URL is not configured.");
  }

  return { url, token };
}

async function callClaudeDirect(message: string, sessionId: string) {
  const adminConfig = await getAIBotAdminConfig();
  const apiKey = adminConfig.anthropic.apiKey || process.env.ANTHROPIC_API_KEY;
  const model = resolveClaudeModel(adminConfig.anthropic.model);
  const useWebSearch = shouldUseWebSearch(message);
  const ga4Summary = shouldUseGa4(message) ? await getGa4Summary(message) : null;
  const hubspotSummary = shouldUseHubSpot(message) ? await getHubSpotSummary(message) : null;

  if (!apiKey) {
    throw new Error("Anthropic API key is not configured.");
  }

  const anthropicHeaders: HeadersInit = {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };

  async function requestAnthropic(enableWebSearch: boolean) {
    return fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: anthropicHeaders,
      body: JSON.stringify({
        model,
        max_tokens: 1200,
        system:
          `${adminConfig.assistant.systemPrompt || "Jsi osobní executive assistant pro Martina Kubáska a BEETS.CZ."} Odpovídej česky, stručně a prakticky. Bez emoji, bez markdownu, bez hvězdiček, bez odrážek, bez zbytečné omáčky. Na jednoduché faktické dotazy odpověz jen samotným výsledkem nebo jednou krátkou větou.`,
        ...(enableWebSearch
          ? {
              tools: [
                {
                  type: "web_search_20260209",
                  name: "web_search",
                  max_uses: 3,
                },
              ],
            }
          : {}),
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `${enableWebSearch ? "Použij web search, pokud je potřeba pro aktuální nebo ověřitelná fakta.\n\n" : ""}${ga4Summary ? `Dostupný GA4 kontext: ${ga4Summary}\n\n` : ""}${hubspotSummary ? `Dostupný HubSpot kontext: ${hubspotSummary}\n\n` : ""}Session: ${sessionId}\n\nUser request: ${message}`,
              },
            ],
          },
        ],
      }),
      cache: "no-store",
    });
  }

  let response = await requestAnthropic(useWebSearch);
  if (!response.ok && useWebSearch) {
    response = await requestAnthropic(false);
  }

  const payload = (await response.json().catch(() => ({}))) as
    | AnthropicMessageResponse
    | { error?: { message?: string } };

  if (!response.ok) {
    const errorMessage =
      "error" in payload ? payload.error?.message : undefined;
    throw new Error(errorMessage || `Claude request failed with status ${response.status}.`);
  }

  const reply =
    "content" in payload && Array.isArray(payload.content)
      ? payload.content
          .filter((item) => item.type === "text" && item.text)
          .map((item) => item.text?.trim() || "")
          .filter(Boolean)
          .join("\n\n")
      : "";

  const cleanedReply = sanitizeAssistantReply(reply);

  if (!cleanedReply) {
    throw new Error("Claude returned no assistant reply.");
  }

  return {
    reply: cleanedReply,
    actions: [] as string[],
    sources: ["claude-direct"],
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message =
      typeof body?.message === "string"
        ? normalizeToolMentions(body.message.trim())
        : "";
    const mode = body?.mode === "voice" ? "voice" : "text";
    const sessionId =
      typeof body?.sessionId === "string" && body.sessionId.trim()
        ? body.sessionId.trim()
        : "beets-aibot-session";

    if (!message) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 },
      );
    }

    try {
      const { url, token } = await getWebhookConfig();
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message,
          mode,
          sessionId,
          source: "beets-web",
          timestamp: new Date().toISOString(),
        }),
        cache: "no-store",
      });

      const text = await response.text();
      let parsed: AIBotWebhookResponse | null = null;

      try {
        parsed = text ? (JSON.parse(text) as AIBotWebhookResponse) : null;
      } catch {
        parsed = { reply: text };
      }

      if (!response.ok) {
        throw new Error(
          parsed?.reply ||
            parsed?.text ||
            `n8n webhook failed with status ${response.status}.`,
        );
      }

      const reply = sanitizeAssistantReply(
        parsed?.reply || parsed?.text || parsed?.output || "",
      );
      if (!reply) {
        throw new Error("n8n webhook returned no assistant reply.");
      }

      return NextResponse.json({
        reply,
        actions: parsed?.actions || [],
        sources: parsed?.sources || [],
      });
    } catch {
      const fallback = await callClaudeDirect(message, sessionId);
      return NextResponse.json(fallback);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AIBot request failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
