import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

type RewritePayload = {
  title?: string;
  excerpt?: string;
  url?: string;
};

let client: OpenAI | null = null;

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) return null;
  if (client) return client;
  client = new OpenAI({
    apiKey,
    ...(process.env.LLM_API_URL ? { baseURL: process.env.LLM_API_URL } : {}),
  });
  return client;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as RewritePayload;
  const title = (payload.title || "").trim();
  const excerpt = (payload.excerpt || "").trim();

  if (!title) {
    return NextResponse.json({ error: "Missing article title." }, { status: 400 });
  }

  const fallback = {
    title,
    excerpt,
    body: excerpt,
  };

  const openai = getClient();
  if (!openai) {
    return NextResponse.json(fallback);
  }

  try {
    const response = await openai.responses.create({
      model: process.env.LLM_MODEL || "gpt-4o-mini",
      max_output_tokens: 500,
      input: [
        {
          role: "system",
          content:
            "Přepisuj politické novinky do češtiny pro profilovou landing page. Buď věcný, stručný, neutrální, bez clickbaitu. Vrať JSON s klíči title, excerpt, body.",
        },
        {
          role: "user",
          content: `Zdrojový titulek: ${title}\nZdrojový perex: ${excerpt}\nURL: ${payload.url || ""}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "news_rewrite",
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              excerpt: { type: "string" },
              body: { type: "string" },
            },
            required: ["title", "excerpt", "body"],
          },
        },
      },
    });

    const output = response.output_text?.trim();
    if (!output) {
      return NextResponse.json(fallback);
    }

    const parsed = JSON.parse(output) as { title?: string; excerpt?: string; body?: string };
    return NextResponse.json({
      title: parsed.title || fallback.title,
      excerpt: parsed.excerpt || fallback.excerpt,
      body: parsed.body || fallback.body,
    });
  } catch (error) {
    return NextResponse.json(
      { ...fallback, error: error instanceof Error ? error.message : "Rewrite failed." },
      { status: 200 },
    );
  }
}
