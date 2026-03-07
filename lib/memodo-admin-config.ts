import { getMemodoServiceClient } from "@/lib/memodo-catalog";

export type MemodoAdminConfig = {
  featuredProductIds: string[];
  catalogRequiresSearch: boolean;
  aiSearchEnabled: boolean;
  shoppingChatbotEnabled: boolean;
  technicalAdvisorEnabled: boolean;
  shoppingAssistantPrompt: string;
  technicalAdvisorPrompt: string;
};

export const defaultMemodoAdminConfig: MemodoAdminConfig = {
  featuredProductIds: [],
  catalogRequiresSearch: true,
  aiSearchEnabled: false,
  shoppingChatbotEnabled: false,
  technicalAdvisorEnabled: false,
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

