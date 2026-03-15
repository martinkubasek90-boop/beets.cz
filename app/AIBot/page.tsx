import { AIBotClient } from "@/components/aibot/aibot-client";

export const metadata = {
  title: "AIBot | BEETS.CZ",
};

function getFeatureState() {
  return {
    assistantName: process.env.AIBOT_ASSISTANT_NAME || "Beets AI Assistant",
    voiceEnabled: process.env.AIBOT_VOICE_ENABLED !== "false",
    n8nReady: Boolean(process.env.N8N_AIBOT_WEBHOOK_URL),
    webhookConfigured: Boolean(process.env.N8N_AIBOT_WEBHOOK_URL),
    webhookProtected: Boolean(process.env.N8N_AIBOT_WEBHOOK_TOKEN),
    integrations: {
      gmail: Boolean(process.env.AIBOT_GMAIL_ENABLED),
      asana: Boolean(process.env.AIBOT_ASANA_ENABLED),
      hubspot: Boolean(process.env.HUBSPOT_PRIVATE_APP_TOKEN),
      analytics: Boolean(process.env.AIBOT_GA_ENABLED),
      ads: Boolean(process.env.AIBOT_GOOGLE_ADS_ENABLED),
    },
  };
}

export default function AIBotPage() {
  const featureState = getFeatureState();

  return <AIBotClient featureState={featureState} />;
}
