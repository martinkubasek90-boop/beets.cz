import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getMemodoProducts } from "@/lib/memodo-catalog";

export const runtime = "nodejs";

type VoiceNormalizeRequest = {
  text?: string;
};

type VoiceNormalizeResponse = {
  ok: boolean;
  normalizedText: string;
  searchQuery: string;
  priceQuery: string;
  isPriceIntent: boolean;
  provider: "llm" | "fallback";
};

let openaiClient: OpenAI | null = null;

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) return null;
  if (openaiClient) return openaiClient;
  openaiClient = new OpenAI({
    apiKey,
    ...(process.env.LLM_API_URL ? { baseURL: process.env.LLM_API_URL } : {}),
  });
  return openaiClient;
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function isPriceIntent(text: string) {
  const normalized = text.toLowerCase();
  return /(jak[aá]\s+je\s+cena|kolik\s+stoj[ií]|za\s+kolik|cena)/.test(normalized);
}

function cleanupPriceQuery(text: string) {
  return normalizeWhitespace(
    text
      .toLowerCase()
      .replace(/jak[aá]\s+je\s+cena\s*/g, "")
      .replace(/kolik\s+stoj[ií]\s*/g, "")
      .replace(/za\s+kolik\s*/g, "")
      .replace(/\bcena\b/g, "")
      .replace(/[?.,!]/g, " "),
  );
}

function fallbackNormalize(text: string): VoiceNormalizeResponse {
  const normalizedText = normalizeWhitespace(text);
  const isPrice = isPriceIntent(normalizedText);
  const priceQuery = isPrice ? cleanupPriceQuery(normalizedText) : "";
  const searchQuery = normalizeWhitespace(priceQuery || normalizedText);

  return {
    ok: true,
    normalizedText,
    searchQuery,
    priceQuery,
    isPriceIntent: isPrice,
    provider: "fallback",
  };
}

function tryParseJsonObject(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function sanitizeLlmOutput(raw: Record<string, unknown> | null, originalText: string): VoiceNormalizeResponse {
  const fallback = fallbackNormalize(originalText);
  if (!raw) return fallback;

  const normalizedText =
    typeof raw.normalizedText === "string" && raw.normalizedText.trim()
      ? normalizeWhitespace(raw.normalizedText).slice(0, 160)
      : fallback.normalizedText;

  const searchQuery =
    typeof raw.searchQuery === "string" && raw.searchQuery.trim()
      ? normalizeWhitespace(raw.searchQuery).slice(0, 120)
      : fallback.searchQuery;

  const priceQuery =
    typeof raw.priceQuery === "string" && raw.priceQuery.trim()
      ? normalizeWhitespace(raw.priceQuery).slice(0, 120)
      : fallback.priceQuery;

  const isPrice =
    typeof raw.isPriceIntent === "boolean"
      ? raw.isPriceIntent
      : isPriceIntent(normalizedText);

  return {
    ok: true,
    normalizedText,
    searchQuery: searchQuery || fallback.searchQuery,
    priceQuery: isPrice ? priceQuery || fallback.priceQuery : "",
    isPriceIntent: isPrice,
    provider: "llm",
  };
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as VoiceNormalizeRequest;
  const text = normalizeWhitespace(payload.text || "");
  if (!text) {
    return NextResponse.json({ error: "Missing text." }, { status: 400 });
  }

  const client = getOpenAIClient();
  if (!client) {
    return NextResponse.json(fallbackNormalize(text));
  }

  try {
    const products = await getMemodoProducts();
    const brandHints = Array.from(
      new Set(products.map((item) => (item.brand || "").trim()).filter(Boolean)),
    )
      .sort((a, b) => a.localeCompare(b, "cs"))
      .slice(0, 80);

    const modelHints = products
      .map((item) => item.name?.trim())
      .filter((item): item is string => Boolean(item))
      .slice(0, 120);

    const prompt = [
      "Jsi parser hlasového vyhledávání pro B2B katalog fotovoltaiky.",
      "Úkol:",
      "1) Opravit chyby v ASR přepisu do smysluplného českého dotazu.",
      "2) Pokud je to dotaz na cenu, vrátit i priceQuery bez frází typu 'jaká je cena'.",
      "3) searchQuery musí být vhodný pro fulltext v katalogu (značka + model + číslo).",
      "4) Oprav překlepy značek a modelů podle hintů.",
      "5) Nevymýšlej nové produkty.",
      "",
      `Brand hints: ${brandHints.join(", ")}`,
      `Model hints: ${modelHints.join(" | ")}`,
      "",
      `Vstupní přepis: "${text}"`,
      "",
      "Vrať POUZE JSON ve tvaru:",
      '{"normalizedText":"...","searchQuery":"...","priceQuery":"...","isPriceIntent":true}',
    ].join("\n");

    const response = await client.responses.create({
      model: process.env.MEMODO_VOICE_MODEL || process.env.LLM_MODEL || "gpt-4o-mini",
      temperature: 0,
      max_output_tokens: 180,
      input: [
        { role: "system", content: "Vracíš pouze validní JSON. Bez markdownu." },
        { role: "user", content: prompt },
      ],
    });

    const parsed = tryParseJsonObject(response.output_text || "");
    return NextResponse.json(sanitizeLlmOutput(parsed, text));
  } catch {
    return NextResponse.json(fallbackNormalize(text));
  }
}

