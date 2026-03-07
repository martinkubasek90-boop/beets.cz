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

function pickRecommendedSet(products: Product[], message: string): RecommendedSet {
  const lower = message.toLowerCase();
  const inStock = products.filter((item) => item.in_stock);
  const inverters = inStock.filter((item) => item.category === "stridace");
  const batteries = inStock.filter((item) => item.category === "baterie");

  const prioritizePromo = (list: Product[]) =>
    [...list].sort(
      (a, b) =>
        Number(Boolean(b.is_promo)) - Number(Boolean(a.is_promo)) ||
        (a.price || Number.MAX_SAFE_INTEGER) - (b.price || Number.MAX_SAFE_INTEGER),
    );

  const sortedInverters = prioritizePromo(inverters);
  const sortedBatteries = prioritizePromo(batteries);

  const kwMatch = lower.match(/(\d+(?:[.,]\d+)?)\s*k?w/i);
  const hintPower = kwMatch ? Number(kwMatch[1].replace(",", ".")) : null;

  const inverter =
    (hintPower
      ? sortedInverters.find((item) => item.name.toLowerCase().includes(String(Math.round(hintPower))))
      : null) || sortedInverters[0];
  const battery = sortedBatteries[0];

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

    const set = pickRecommendedSet(products, message);
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
