import { NextResponse } from "next/server";
import OpenAI from "openai";
import { retrieveKnowledge, type KnowledgeCitation } from "@/lib/bess-knowledge";
import { getMemodoAdminConfig } from "@/lib/memodo-admin-config";
import { getMemodoProducts } from "@/lib/memodo-catalog";
import type { Product } from "@/lib/memodo-data";

export const runtime = "nodejs";

type ChatMode = "shopping" | "technical";

type ChatRequest = {
  message?: string;
  mode?: ChatMode;
};

type RecommendedSet = {
  inverter?: Product;
  battery?: Product;
  summary: string;
};

type ChatResponse = {
  reply: string;
  citations: KnowledgeCitation[];
  recommendedSet?: RecommendedSet;
  offerPrefill?: {
    productId?: string;
    batteryId?: string;
    message: string;
  };
};

let openaiClient: OpenAI | null = null;

function getOpenAIClient() {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) return null;
  if (openaiClient) return openaiClient;
  openaiClient = new OpenAI({
    apiKey,
    ...(process.env.LLM_API_URL ? { baseURL: process.env.LLM_API_URL } : {}),
  });
  return openaiClient;
}

function buildSetSummary(set: RecommendedSet) {
  const inverter = set.inverter ? `${set.inverter.brand || ""} ${set.inverter.name}`.trim() : "";
  const battery = set.battery ? `${set.battery.brand || ""} ${set.battery.name}`.trim() : "";
  return [inverter ? `Střídač: ${inverter}` : "", battery ? `Baterie: ${battery}` : ""]
    .filter(Boolean)
    .join("\n");
}

function normalizeBrand(value?: string) {
  return (value || "").trim().toLowerCase();
}

function parsePairs(input: string[]) {
  const pairs = new Set<string>();
  for (const row of input) {
    const [left, right] = row.split(":").map((part) => part.trim().toLowerCase());
    if (!left || !right) continue;
    pairs.add(`${left}:${right}`);
  }
  return pairs;
}

function detectBudget(message: string) {
  const match = message.match(/(\d[\d\s]{2,})\s*(k[cč]|czk)/i);
  if (!match?.[1]) return null;
  const num = Number(match[1].replace(/\s+/g, ""));
  return Number.isFinite(num) ? num : null;
}

function pickRecommendedSet(
  products: Product[],
  message: string,
  rules: {
    preferredInverterBrands: string[];
    preferredBatteryBrands: string[];
    allowedBrandPairs: string[];
    blockedBrandPairs: string[];
    marginBias: number;
  },
): RecommendedSet {
  const lower = message.toLowerCase();
  const inStock = products.filter((item) => item.in_stock);
  const inverters = inStock.filter((item) => item.category === "stridace");
  const batteries = inStock.filter((item) => item.category === "baterie");

  const kwMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*k?w/i);
  const hintPower = kwMatch ? Number(kwMatch[1].replace(",", ".")) : null;
  const budget = detectBudget(message);
  const preferredInv = new Set(rules.preferredInverterBrands.map((item) => normalizeBrand(item)));
  const preferredBat = new Set(rules.preferredBatteryBrands.map((item) => normalizeBrand(item)));
  const allowedPairs = parsePairs(rules.allowedBrandPairs);
  const blockedPairs = parsePairs(rules.blockedBrandPairs);

  const allSetPrices = inverters.flatMap((inv) =>
    batteries.map((bat) => (inv.price || 0) + (bat.price || 0)).filter((price) => price > 0),
  );
  const minTotalPrice = allSetPrices.length ? Math.min(...allSetPrices) : 0;
  const maxTotalPrice = allSetPrices.length ? Math.max(...allSetPrices) : 0;

  let best: { inverter: Product; battery: Product; score: number } | null = null;

  for (const inverter of inverters) {
    for (const battery of batteries) {
      const invBrand = normalizeBrand(inverter.brand);
      const batBrand = normalizeBrand(battery.brand);
      const pairKey = `${invBrand}:${batBrand}`;

      if (blockedPairs.has(pairKey)) continue;
      if (allowedPairs.size > 0 && !allowedPairs.has(pairKey)) continue;

      let score = 0;
      if (inverter.is_promo) score += 2;
      if (battery.is_promo) score += 2;
      if (preferredInv.has(invBrand)) score += 4;
      if (preferredBat.has(batBrand)) score += 4;
      if (inverter.brand && lower.includes(inverter.brand.toLowerCase())) score += 3;
      if (battery.brand && lower.includes(battery.brand.toLowerCase())) score += 3;

      if (hintPower) {
        const inverterName = inverter.name.toLowerCase();
        const rounded = String(Math.round(hintPower));
        if (inverterName.includes(rounded)) score += 6;
      }

      const totalPrice = (inverter.price || 0) + (battery.price || 0);
      if (budget && totalPrice > 0) {
        if (totalPrice <= budget) score += 6;
        else score -= Math.min(8, (totalPrice - budget) / budget * 10);
      }

      if (rules.marginBias > 0 && totalPrice > 0 && maxTotalPrice > minTotalPrice) {
        const normalized = (totalPrice - minTotalPrice) / (maxTotalPrice - minTotalPrice);
        score += normalized * rules.marginBias * 8;
      }

      if (!best || score > best.score) {
        best = { inverter, battery, score };
      }
    }
  }

  const inverter = best?.inverter || inverters[0];
  const battery = best?.battery || batteries[0];

  const summary =
    inverter && battery
      ? `Doporučuji set:\n- Střídač: ${inverter.name}\n- Baterie: ${battery.name}`
      : inverter
        ? `Doporučuji střídač: ${inverter.name}`
        : battery
          ? `Doporučuji baterii: ${battery.name}`
          : "V katalogu teď nevidím vhodný set skladem.";

  return { inverter, battery, summary };
}

function buildPrompt(params: {
  mode: ChatMode;
  message: string;
  citations: KnowledgeCitation[];
  set: RecommendedSet;
  shoppingPrompt: string;
  technicalPrompt: string;
}) {
  const system =
    params.mode === "technical"
      ? params.technicalPrompt
      : params.shoppingPrompt;

  const citationText = params.citations.length
    ? params.citations
        .map((citation, index) => `${index + 1}) ${citation.sourceLabel}${citation.sourceUrl ? ` (${citation.sourceUrl})` : ""}\n${citation.snippet}`)
        .join("\n\n")
    : "Žádné citace.";

  return {
    system,
    user: [
      `Dotaz zákazníka: ${params.message}`,
      `Předvybraný set:`,
      buildSetSummary(params.set) || "Není",
      `Podklady (citace):`,
      citationText,
      "Odpověz česky, věcně, stručně. Na konci jasně napiš doporučený set.",
    ].join("\n\n"),
  };
}

async function generateReply(params: {
  mode: ChatMode;
  message: string;
  citations: KnowledgeCitation[];
  set: RecommendedSet;
  shoppingPrompt: string;
  technicalPrompt: string;
  model: string;
  temperature: number;
  maxOutputTokens: number;
}) {
  const client = getOpenAIClient();
  if (!client) {
    return `${params.set.summary}\n\nNemám aktivní LLM klíč, proto vracím doporučení na základě katalogu a znalostní báze.`;
  }

  const { system, user } = buildPrompt(params);
  const response = await client.responses.create({
    model: params.model || process.env.LLM_MODEL || "gpt-4o-mini",
    temperature: params.temperature,
    max_output_tokens: params.maxOutputTokens,
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return response.output_text?.trim() || params.set.summary;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as ChatRequest;
  const message = payload.message?.trim();
  const mode: ChatMode = payload.mode === "technical" ? "technical" : "shopping";
  if (!message) {
    return NextResponse.json({ error: "Missing message." }, { status: 400 });
  }

  try {
    const [config, citations, products] = await Promise.all([
      getMemodoAdminConfig(),
      retrieveKnowledge("memodo", message, 6),
      getMemodoProducts(),
    ]);

    const aiEnabled =
      config.aiSearchEnabled &&
      (mode === "shopping" ? config.shoppingChatbotEnabled : config.technicalAdvisorEnabled);

    const set = pickRecommendedSet(products, message, {
      preferredInverterBrands: config.aiPreferredInverterBrands,
      preferredBatteryBrands: config.aiPreferredBatteryBrands,
      allowedBrandPairs: config.aiAllowedBrandPairs,
      blockedBrandPairs: config.aiBlockedBrandPairs,
      marginBias: config.aiMarginBias,
    });
    const limitedCitations = citations.slice(0, config.aiCitationLimit);
    const reply = aiEnabled
      ? await generateReply({
          mode,
          message,
          citations: limitedCitations,
          set,
          shoppingPrompt: config.shoppingAssistantPrompt,
          technicalPrompt: config.technicalAdvisorPrompt,
          model: config.aiModel,
          temperature: config.aiTemperature,
          maxOutputTokens: config.aiMaxOutputTokens,
        })
      : `${set.summary}\n\nAI je v adminu vypnuté. Zapni AI přepínače pro generované odpovědi.`;

    const offerMessage = `${set.summary}\n\nDotaz zákazníka:\n${message}`;
    const response: ChatResponse = {
      reply,
      citations: limitedCitations,
      recommendedSet: set,
      offerPrefill: {
        productId: set.inverter?.id,
        batteryId: set.battery?.id,
        message: offerMessage,
      },
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "AI chat failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
