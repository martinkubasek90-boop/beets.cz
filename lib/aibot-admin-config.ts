import { createClient } from "@supabase/supabase-js";

export type AIBotAdminConfig = {
  assistant: {
    name: string;
    welcomeMessage: string;
    systemPrompt: string;
    voiceEnabled: boolean;
    autonomousMode: boolean;
  };
  n8n: {
    webhookUrl: string;
    webhookToken: string;
    workflowIds: {
      realtime: string;
      morningBrief: string;
      campaignWatchdog: string;
    };
  };
  anthropic: {
    apiKey: string;
    model: string;
  };
  integrations: {
    gmail: {
      enabled: boolean;
      inboxLabel: string;
      clientId: string;
      clientSecret: string;
      refreshToken: string;
    };
    asana: {
      enabled: boolean;
      pat: string;
      workspaceGid: string;
      projectGids: string[];
    };
    hubspot: {
      enabled: boolean;
      privateAppToken: string;
      pipelineId: string;
      stageId: string;
    };
    ga4: {
      enabled: boolean;
      propertyId: string;
    };
    googleAds: {
      enabled: boolean;
      developerToken: string;
      customerId: string;
      loginCustomerId: string;
    };
  };
};

export const defaultAIBotAdminConfig: AIBotAdminConfig = {
  assistant: {
    name: "Beets AI Assistant",
    welcomeMessage:
      "Ahoj, jsem osobní AI asistent pro BEETS.CZ. Můžu shrnovat leady, úkoly, kampaně i e-maily a navrhovat další kroky.",
    systemPrompt:
      "Jsi osobní executive assistant pro Martina Kubáska a BEETS.CZ. Odpovídej česky, stručně a prakticky.",
    voiceEnabled: true,
    autonomousMode: false,
  },
  n8n: {
    webhookUrl: "",
    webhookToken: "",
    workflowIds: {
      realtime: "beets-aibot-starter",
      morningBrief: "beets-aibot-morning-brief",
      campaignWatchdog: "beets-aibot-campaign-watchdog",
    },
  },
  anthropic: {
    apiKey: "",
    model: "claude-sonnet-4-6",
  },
  integrations: {
    gmail: {
      enabled: false,
      inboxLabel: "INBOX",
      clientId: "",
      clientSecret: "",
      refreshToken: "",
    },
    asana: {
      enabled: false,
      pat: "",
      workspaceGid: "",
      projectGids: [],
    },
    hubspot: {
      enabled: false,
      privateAppToken: "",
      pipelineId: "",
      stageId: "",
    },
    ga4: {
      enabled: false,
      propertyId: "",
    },
    googleAds: {
      enabled: false,
      developerToken: "",
      customerId: "",
      loginCustomerId: "",
    },
  },
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function toString(value: unknown, fallback: string) {
  return typeof value === "string" ? value.trim() : fallback;
}

function toBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function toStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

export function mergeAIBotAdminConfig(raw: unknown): AIBotAdminConfig {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, any>;
  const assistant = source.assistant || {};
  const n8n = source.n8n || {};
  const workflowIds = n8n.workflowIds || {};
  const anthropic = source.anthropic || {};
  const integrations = source.integrations || {};
  const gmail = integrations.gmail || {};
  const asana = integrations.asana || {};
  const hubspot = integrations.hubspot || {};
  const ga4 = integrations.ga4 || {};
  const googleAds = integrations.googleAds || {};

  return {
    assistant: {
      name: toString(assistant.name, defaultAIBotAdminConfig.assistant.name),
      welcomeMessage: toString(
        assistant.welcomeMessage,
        defaultAIBotAdminConfig.assistant.welcomeMessage,
      ),
      systemPrompt: toString(
        assistant.systemPrompt,
        defaultAIBotAdminConfig.assistant.systemPrompt,
      ),
      voiceEnabled: toBoolean(
        assistant.voiceEnabled,
        defaultAIBotAdminConfig.assistant.voiceEnabled,
      ),
      autonomousMode: toBoolean(
        assistant.autonomousMode,
        defaultAIBotAdminConfig.assistant.autonomousMode,
      ),
    },
    n8n: {
      webhookUrl: toString(n8n.webhookUrl, defaultAIBotAdminConfig.n8n.webhookUrl),
      webhookToken: toString(
        n8n.webhookToken,
        defaultAIBotAdminConfig.n8n.webhookToken,
      ),
      workflowIds: {
        realtime: toString(
          workflowIds.realtime,
          defaultAIBotAdminConfig.n8n.workflowIds.realtime,
        ),
        morningBrief: toString(
          workflowIds.morningBrief,
          defaultAIBotAdminConfig.n8n.workflowIds.morningBrief,
        ),
        campaignWatchdog: toString(
          workflowIds.campaignWatchdog,
          defaultAIBotAdminConfig.n8n.workflowIds.campaignWatchdog,
        ),
      },
    },
    anthropic: {
      apiKey: toString(anthropic.apiKey, defaultAIBotAdminConfig.anthropic.apiKey),
      model: toString(anthropic.model, defaultAIBotAdminConfig.anthropic.model),
    },
    integrations: {
      gmail: {
        enabled: toBoolean(
          gmail.enabled,
          defaultAIBotAdminConfig.integrations.gmail.enabled,
        ),
        inboxLabel: toString(
          gmail.inboxLabel,
          defaultAIBotAdminConfig.integrations.gmail.inboxLabel,
        ),
        clientId: toString(
          gmail.clientId,
          defaultAIBotAdminConfig.integrations.gmail.clientId,
        ),
        clientSecret: toString(
          gmail.clientSecret,
          defaultAIBotAdminConfig.integrations.gmail.clientSecret,
        ),
        refreshToken: toString(
          gmail.refreshToken,
          defaultAIBotAdminConfig.integrations.gmail.refreshToken,
        ),
      },
      asana: {
        enabled: toBoolean(
          asana.enabled,
          defaultAIBotAdminConfig.integrations.asana.enabled,
        ),
        pat: toString(asana.pat, defaultAIBotAdminConfig.integrations.asana.pat),
        workspaceGid: toString(
          asana.workspaceGid,
          defaultAIBotAdminConfig.integrations.asana.workspaceGid,
        ),
        projectGids: toStringArray(
          asana.projectGids,
          defaultAIBotAdminConfig.integrations.asana.projectGids,
        ),
      },
      hubspot: {
        enabled: toBoolean(
          hubspot.enabled,
          defaultAIBotAdminConfig.integrations.hubspot.enabled,
        ),
        privateAppToken: toString(
          hubspot.privateAppToken,
          defaultAIBotAdminConfig.integrations.hubspot.privateAppToken,
        ),
        pipelineId: toString(
          hubspot.pipelineId,
          defaultAIBotAdminConfig.integrations.hubspot.pipelineId,
        ),
        stageId: toString(
          hubspot.stageId,
          defaultAIBotAdminConfig.integrations.hubspot.stageId,
        ),
      },
      ga4: {
        enabled: toBoolean(
          ga4.enabled,
          defaultAIBotAdminConfig.integrations.ga4.enabled,
        ),
        propertyId: toString(
          ga4.propertyId,
          defaultAIBotAdminConfig.integrations.ga4.propertyId,
        ),
      },
      googleAds: {
        enabled: toBoolean(
          googleAds.enabled,
          defaultAIBotAdminConfig.integrations.googleAds.enabled,
        ),
        developerToken: toString(
          googleAds.developerToken,
          defaultAIBotAdminConfig.integrations.googleAds.developerToken,
        ),
        customerId: toString(
          googleAds.customerId,
          defaultAIBotAdminConfig.integrations.googleAds.customerId,
        ),
        loginCustomerId: toString(
          googleAds.loginCustomerId,
          defaultAIBotAdminConfig.integrations.googleAds.loginCustomerId,
        ),
      },
    },
  };
}

export async function getAIBotAdminConfig(): Promise<AIBotAdminConfig> {
  const supabase = getServiceClient();
  if (!supabase) return defaultAIBotAdminConfig;

  const { data, error } = await supabase
    .from("aibot_admin_config")
    .select("config")
    .eq("key", "default")
    .maybeSingle();

  if (error || !data?.config) return defaultAIBotAdminConfig;
  return mergeAIBotAdminConfig(data.config);
}

export async function saveAIBotAdminConfig(
  config: AIBotAdminConfig,
): Promise<AIBotAdminConfig> {
  const supabase = getServiceClient();
  if (!supabase) {
    throw new Error("Missing Supabase service configuration.");
  }

  const merged = mergeAIBotAdminConfig(config);
  const { error } = await supabase.from("aibot_admin_config").upsert(
    {
      key: "default",
      config: merged,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) {
    throw new Error(error.message);
  }

  return merged;
}
