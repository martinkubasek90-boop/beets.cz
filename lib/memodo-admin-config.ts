import { getMemodoServiceClient } from "@/lib/memodo-catalog";

export type MemodoAdminConfig = {
  featuredProductIds: string[];
  catalogRequiresSearch: boolean;
  aiSearchEnabled: boolean;
  shoppingChatbotEnabled: boolean;
  technicalAdvisorEnabled: boolean;
  aiDefaultMode: "shopping" | "technical";
  aiFabLabel: string;
  aiWelcomeMessage: string;
  aiCitationLimit: number;
  aiModel: string;
  aiTemperature: number;
  aiMaxOutputTokens: number;
  shoppingAssistantPrompt: string;
  technicalAdvisorPrompt: string;
};

export const defaultMemodoAdminConfig: MemodoAdminConfig = {
  featuredProductIds: [],
  catalogRequiresSearch: true,
  aiSearchEnabled: false,
  shoppingChatbotEnabled: false,
  technicalAdvisorEnabled: false,
  aiDefaultMode: "shopping",
  aiFabLabel: "AI rádce",
  aiWelcomeMessage:
    "Ahoj, jsem AI rádce. Popiš požadavek a doporučím set střídač + baterie. Klikem ho rovnou propíšeš do nabídky.",
  aiCitationLimit: 5,
  aiModel: "gpt-4o-mini",
  aiTemperature: 0.2,
  aiMaxOutputTokens: 500,
  shoppingAssistantPrompt:
    "Pomoz zákazníkovi vybrat vhodný produkt podle účelu, výkonu, kompatibility a rozpočtu.",
  technicalAdvisorPrompt:
    "Buď technický poradce. Odpovídej stručně, uváděj parametry, kompatibility a limity řešení.",
};

type ConfigRow = {
  key: string;
  config: MemodoAdminConfig;
  updated_at: string;
};

function sanitizeConfig(input: unknown): MemodoAdminConfig {
  const source = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const featuredIds = Array.isArray(source.featuredProductIds)
    ? source.featuredProductIds.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];

  return {
    featuredProductIds: featuredIds,
    catalogRequiresSearch:
      typeof source.catalogRequiresSearch === "boolean"
        ? source.catalogRequiresSearch
        : defaultMemodoAdminConfig.catalogRequiresSearch,
    aiSearchEnabled:
      typeof source.aiSearchEnabled === "boolean"
        ? source.aiSearchEnabled
        : defaultMemodoAdminConfig.aiSearchEnabled,
    shoppingChatbotEnabled:
      typeof source.shoppingChatbotEnabled === "boolean"
        ? source.shoppingChatbotEnabled
        : defaultMemodoAdminConfig.shoppingChatbotEnabled,
    technicalAdvisorEnabled:
      typeof source.technicalAdvisorEnabled === "boolean"
        ? source.technicalAdvisorEnabled
        : defaultMemodoAdminConfig.technicalAdvisorEnabled,
    aiDefaultMode:
      source.aiDefaultMode === "technical" || source.aiDefaultMode === "shopping"
        ? source.aiDefaultMode
        : defaultMemodoAdminConfig.aiDefaultMode,
    aiFabLabel:
      typeof source.aiFabLabel === "string" && source.aiFabLabel.trim()
        ? source.aiFabLabel.trim()
        : defaultMemodoAdminConfig.aiFabLabel,
    aiWelcomeMessage:
      typeof source.aiWelcomeMessage === "string" && source.aiWelcomeMessage.trim()
        ? source.aiWelcomeMessage
        : defaultMemodoAdminConfig.aiWelcomeMessage,
    aiCitationLimit:
      typeof source.aiCitationLimit === "number" && Number.isFinite(source.aiCitationLimit)
        ? Math.min(8, Math.max(1, Math.floor(source.aiCitationLimit)))
        : defaultMemodoAdminConfig.aiCitationLimit,
    aiModel:
      typeof source.aiModel === "string" && source.aiModel.trim()
        ? source.aiModel.trim()
        : defaultMemodoAdminConfig.aiModel,
    aiTemperature:
      typeof source.aiTemperature === "number" && Number.isFinite(source.aiTemperature)
        ? Math.min(1, Math.max(0, source.aiTemperature))
        : defaultMemodoAdminConfig.aiTemperature,
    aiMaxOutputTokens:
      typeof source.aiMaxOutputTokens === "number" && Number.isFinite(source.aiMaxOutputTokens)
        ? Math.min(2000, Math.max(100, Math.floor(source.aiMaxOutputTokens)))
        : defaultMemodoAdminConfig.aiMaxOutputTokens,
    shoppingAssistantPrompt:
      typeof source.shoppingAssistantPrompt === "string" && source.shoppingAssistantPrompt.trim()
        ? source.shoppingAssistantPrompt
        : defaultMemodoAdminConfig.shoppingAssistantPrompt,
    technicalAdvisorPrompt:
      typeof source.technicalAdvisorPrompt === "string" && source.technicalAdvisorPrompt.trim()
        ? source.technicalAdvisorPrompt
        : defaultMemodoAdminConfig.technicalAdvisorPrompt,
  };
}

export async function getMemodoAdminConfig(): Promise<MemodoAdminConfig> {
  const supabase = getMemodoServiceClient();
  if (!supabase) return defaultMemodoAdminConfig;

  const { data, error } = await supabase
    .from("memodo_admin_config")
    .select("key,config,updated_at")
    .eq("key", "default")
    .limit(1)
    .maybeSingle();

  if (error || !data) return defaultMemodoAdminConfig;
  return sanitizeConfig((data as ConfigRow).config);
}

export async function saveMemodoAdminConfig(input: MemodoAdminConfig): Promise<MemodoAdminConfig> {
  const supabase = getMemodoServiceClient();
  if (!supabase) return sanitizeConfig(input);

  const payload = sanitizeConfig(input);
  const { error } = await supabase.from("memodo_admin_config").upsert(
    {
      key: "default",
      config: payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) {
    throw new Error(error.message);
  }

  return payload;
}
