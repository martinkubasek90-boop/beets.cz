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

const VOICE_EXPLICIT_REPLACEMENTS: Array<[string, string]> = [
  ["pylon ted", "pylontech"],
  ["pylon tec", "pylontech"],
  ["pylon tek", "pylontech"],
  ["pilon tech", "pylontech"],
  ["pilonteh", "pylontech"],
  ["dynes", "dyness"],
  ["diness", "dyness"],
  ["dines", "dyness"],
  ["good vy", "goodwe"],
  ["good ví", "goodwe"],
  ["good wi", "goodwe"],
  ["sangrow", "sungrow"],
  ["sun grow", "sungrow"],
];

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

function normalizeVoiceText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
}

function replaceWholePhrase(value: string, phrase: string, target: string) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return value.replace(new RegExp(`\\b${escaped}\\b`, "g"), target);
}

function brandDistanceThreshold(brand: string) {
  return Math.max(1, Math.floor(brand.length * 0.34));
}

function closestBrand(token: string, brands: string[]) {
  let best = token;
  let bestDistance = Number.MAX_SAFE_INTEGER;
  for (const brand of brands) {
    const d = levenshteinDistance(token, brand);
    if (d < bestDistance) {
      bestDistance = d;
      best = brand;
    }
  }
  return { brand: best, distance: bestDistance };
}

function applyVoiceCorrections(text: string, brands: string[]) {
  if (!text.trim()) return "";
  const effectiveBrands = brands.length ? brands : ["dyness", "pylontech", "goodwe", "sungrow"];
  let normalized = normalizeVoiceText(text);
  for (const [from, to] of VOICE_EXPLICIT_REPLACEMENTS) {
    normalized = replaceWholePhrase(normalized, from, to);
  }

  const tokens = normalized.split(" ").filter(Boolean);
  const merged: string[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const current = tokens[i];
    const next = tokens[i + 1];
    if (!next) {
      merged.push(current);
      continue;
    }
    const combined = `${current}${next}`;
    const bestPair = closestBrand(combined, effectiveBrands);
    const pairThreshold = Math.max(2, brandDistanceThreshold(bestPair.brand));
    if (bestPair.distance <= pairThreshold) {
      merged.push(bestPair.brand);
      i += 1;
      continue;
    }
    merged.push(current);
  }

  const corrected = merged.map((token) => {
    if (token.length < 3) return token;
    const best = closestBrand(token, effectiveBrands);
    const threshold = brandDistanceThreshold(best.brand);
    if (best.distance <= threshold) return best.brand;
    return token;
  });
  return corrected.join(" ").trim();
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

function fallbackNormalize(text: string, brands: string[]): VoiceNormalizeResponse {
  const corrected = applyVoiceCorrections(text, brands);
  const normalizedText = normalizeWhitespace(corrected || text);
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
  const fallback = fallbackNormalize(originalText, []);
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

  const products = await getMemodoProducts().catch(() => []);
  const brandHints = Array.from(
    new Set(products.map((item) => normalizeVoiceText(item.brand || "")).filter(Boolean)),
  );
  const correctedInput = applyVoiceCorrections(text, brandHints);

  const client = getOpenAIClient();
  if (!client) {
    return NextResponse.json(fallbackNormalize(correctedInput || text, brandHints));
  }

  try {
    const brandHintsDisplay = Array.from(
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
      `Brand hints: ${brandHintsDisplay.join(", ")}`,
      `Model hints: ${modelHints.join(" | ")}`,
      "",
      `Vstupní přepis: "${correctedInput || text}"`,
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
    const sanitized = sanitizeLlmOutput(parsed, correctedInput || text);
    const normalizedText = applyVoiceCorrections(sanitized.normalizedText, brandHints);
    const searchQuery = applyVoiceCorrections(sanitized.searchQuery || normalizedText, brandHints);
    const priceQuery = sanitized.isPriceIntent
      ? applyVoiceCorrections(sanitized.priceQuery || cleanupPriceQuery(normalizedText), brandHints)
      : "";
    return NextResponse.json({
      ...sanitized,
      normalizedText: normalizedText || sanitized.normalizedText,
      searchQuery: searchQuery || sanitized.searchQuery,
      priceQuery,
    } satisfies VoiceNormalizeResponse);
  } catch {
    return NextResponse.json(fallbackNormalize(correctedInput || text, brandHints));
  }
}
