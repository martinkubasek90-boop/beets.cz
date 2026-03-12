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
  alternatives?: string[];
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

function compactToken(value: string) {
  return normalizeVoiceText(value).replace(/[^a-z0-9]/g, "");
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

function toBigrams(value: string) {
  if (value.length < 2) return [value];
  const out: string[] = [];
  for (let i = 0; i < value.length - 1; i += 1) out.push(value.slice(i, i + 2));
  return out;
}

function diceSimilarity(a: string, b: string) {
  if (!a || !b) return 0;
  const aBigrams = toBigrams(a);
  const bBigrams = toBigrams(b);
  const bCounts = new Map<string, number>();
  for (const gram of bBigrams) bCounts.set(gram, (bCounts.get(gram) || 0) + 1);
  let overlap = 0;
  for (const gram of aBigrams) {
    const count = bCounts.get(gram) || 0;
    if (count > 0) {
      overlap += 1;
      bCounts.set(gram, count - 1);
    }
  }
  return (2 * overlap) / (aBigrams.length + bBigrams.length);
}

function fuzzySimilarity(a: string, b: string) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);
  const levScore = maxLen ? 1 - distance / maxLen : 0;
  const diceScore = diceSimilarity(a, b);
  return Math.max(0, Math.min(1, levScore * 0.6 + diceScore * 0.4));
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

function extractModelTerms(products: Array<{ name?: string; art_number?: string }>) {
  const terms = new Set<string>();
  const importantWords = new Set([
    "force",
    "tower",
    "lynx",
    "sbh",
    "wifi",
    "modulem",
    "modul",
    "pro",
  ]);
  for (const item of products) {
    const name = normalizeVoiceText(item.name || "");
    const sku = normalizeVoiceText(item.art_number || "");
    if (sku.length >= 3) terms.add(sku);
    if (!name) continue;
    const tokens = name.split(" ").filter((token) => token.length >= 2).slice(0, 8);
    for (const token of tokens) {
      if (/\d/.test(token) || importantWords.has(token)) terms.add(token);
    }
    for (let i = 0; i < tokens.length - 1; i += 1) {
      const phrase = `${tokens[i]} ${tokens[i + 1]}`.trim();
      if (/\d/.test(phrase) || importantWords.has(tokens[i]) || importantWords.has(tokens[i + 1])) {
        terms.add(phrase);
      }
    }
  }
  return Array.from(terms).slice(0, 300);
}

function applyModelCorrections(text: string, modelTerms: string[]) {
  if (!text) return text;
  const terms = modelTerms.filter(Boolean);
  if (!terms.length) return text;

  const tokens = normalizeVoiceText(text).split(" ").filter(Boolean);
  if (!tokens.length) return text;
  const corrected: string[] = [];
  let i = 0;

  while (i < tokens.length) {
    let replaced = false;
    for (let span = 3; span >= 1; span -= 1) {
      if (i + span > tokens.length) continue;
      const phrase = tokens.slice(i, i + span).join(" ");
      if (span === 1 && phrase.length < 4) continue;
      const phraseCompact = compactToken(phrase);

      let best = phrase;
      let bestScore = 0;
      for (const term of terms) {
        const score = Math.max(
          fuzzySimilarity(phrase, term),
          fuzzySimilarity(phraseCompact, compactToken(term)),
        );
        if (score > bestScore) {
          bestScore = score;
          best = term;
        }
      }

      const threshold = span >= 2 ? 0.78 : 0.86;
      if (bestScore >= threshold) {
        corrected.push(best);
        i += span;
        replaced = true;
        break;
      }
    }
    if (!replaced) {
      corrected.push(tokens[i]);
      i += 1;
    }
  }

  return normalizeWhitespace(corrected.join(" "));
}

function buildSearchAlternatives(input: string, corrected: string) {
  const normalized = normalizeWhitespace(normalizeVoiceText(input));
  const correctedNormalized = normalizeWhitespace(normalizeVoiceText(corrected));
  const compactNormalized = normalized
    .replace(/\b(chci|prosim|potrebuju|hledam|dej|ukaz|jaka|je|cena|kolik|stoji)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const compactCorrected = correctedNormalized
    .replace(/\b(chci|prosim|potrebuju|hledam|dej|ukaz|jaka|je|cena|kolik|stoji)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return Array.from(
    new Set([correctedNormalized, compactCorrected, normalized, compactNormalized].filter((item) => item.length >= 2)),
  ).slice(0, 8);
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

function fallbackNormalize(text: string, brands: string[], modelTerms: string[]): VoiceNormalizeResponse {
  const correctedBrand = applyVoiceCorrections(text, brands);
  const corrected = applyModelCorrections(correctedBrand, modelTerms);
  const normalizedText = normalizeWhitespace(corrected || text);
  const isPrice = isPriceIntent(normalizedText);
  const priceQuery = isPrice ? cleanupPriceQuery(normalizedText) : "";
  const searchQuery = normalizeWhitespace(priceQuery || normalizedText);
  const alternatives = buildSearchAlternatives(text, searchQuery);

  return {
    ok: true,
    normalizedText,
    searchQuery,
    priceQuery,
    alternatives,
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
  const fallback = fallbackNormalize(originalText, [], []);
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
    alternatives: fallback.alternatives,
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
  const modelTerms = extractModelTerms(products);
  const correctedInput = applyModelCorrections(applyVoiceCorrections(text, brandHints), modelTerms);

  const client = getOpenAIClient();
  if (!client) {
    return NextResponse.json(fallbackNormalize(correctedInput || text, brandHints, modelTerms));
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
    const normalizedText = applyModelCorrections(applyVoiceCorrections(sanitized.normalizedText, brandHints), modelTerms);
    const searchQuery = applyModelCorrections(
      applyVoiceCorrections(sanitized.searchQuery || normalizedText, brandHints),
      modelTerms,
    );
    const priceQuery = sanitized.isPriceIntent
      ? applyModelCorrections(
          applyVoiceCorrections(sanitized.priceQuery || cleanupPriceQuery(normalizedText), brandHints),
          modelTerms,
        )
      : "";
    const alternatives = buildSearchAlternatives(text, searchQuery || normalizedText);
    return NextResponse.json({
      ...sanitized,
      normalizedText: normalizedText || sanitized.normalizedText,
      searchQuery: searchQuery || sanitized.searchQuery,
      priceQuery,
      alternatives,
    } satisfies VoiceNormalizeResponse);
  } catch {
    return NextResponse.json(fallbackNormalize(correctedInput || text, brandHints, modelTerms));
  }
}
