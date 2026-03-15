import { NextResponse } from "next/server";

type AIBotWebhookResponse = {
  reply?: string;
  text?: string;
  output?: string;
  sources?: string[];
  actions?: string[];
};

function getWebhookConfig() {
  const url = process.env.N8N_AIBOT_WEBHOOK_URL;
  const token = process.env.N8N_AIBOT_WEBHOOK_TOKEN;

  if (!url) {
    throw new Error("N8N_AIBOT_WEBHOOK_URL is not configured.");
  }

  return { url, token };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message =
      typeof body?.message === "string" ? body.message.trim() : "";
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

    const { url, token } = getWebhookConfig();
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
      return NextResponse.json(
        {
          error:
            parsed?.reply ||
            parsed?.text ||
            `n8n webhook failed with status ${response.status}.`,
        },
        { status: 502 },
      );
    }

    const reply = parsed?.reply || parsed?.text || parsed?.output || "";
    if (!reply) {
      return NextResponse.json(
        { error: "n8n webhook returned no assistant reply." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      reply,
      actions: parsed?.actions || [],
      sources: parsed?.sources || [],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AIBot request failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
