"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  defaultAIBotAdminConfig,
  type AIBotAdminConfig,
} from "@/lib/aibot-admin-config";

const ADMIN_TOKEN_STORAGE_KEY = "aibot_admin_token_v1";
const ADMIN_CONFIG_STORAGE_KEY = "aibot_admin_config_v1";

const checklist = [
  "Claude API key",
  "n8n webhook URL + bearer token",
  "HubSpot private app token",
  "Asana PAT + workspace",
  "Gmail OAuth údaje",
  "GA4 property ID",
  "Google Ads developer token + customer IDs",
];

function toLines(value: string[]) {
  return value.join("\n");
}

function fromLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function configStatus(config: AIBotAdminConfig) {
  return {
    coreReady:
      Boolean(config.anthropic.apiKey) &&
      Boolean(config.n8n.webhookUrl) &&
      Boolean(config.n8n.webhookToken),
    hubspotReady:
      config.integrations.hubspot.enabled &&
      Boolean(config.integrations.hubspot.privateAppToken),
    asanaReady:
      config.integrations.asana.enabled &&
      Boolean(config.integrations.asana.pat) &&
      Boolean(config.integrations.asana.workspaceGid),
    gmailReady:
      config.integrations.gmail.enabled &&
      Boolean(config.integrations.gmail.clientId) &&
      Boolean(config.integrations.gmail.clientSecret) &&
      Boolean(config.integrations.gmail.refreshToken),
    ga4Ready:
      config.integrations.ga4.enabled && Boolean(config.integrations.ga4.propertyId),
    adsReady:
      config.integrations.googleAds.enabled &&
      Boolean(config.integrations.googleAds.developerToken) &&
      Boolean(config.integrations.googleAds.customerId),
  };
}

export default function AIBotAdminPage() {
  const [adminToken, setAdminToken] = useState("");
  const [config, setConfig] = useState<AIBotAdminConfig>(defaultAIBotAdminConfig);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [hasLocalSnapshot, setHasLocalSnapshot] = useState(false);

  const headers = useMemo(() => {
    const next: Record<string, string> = { "Content-Type": "application/json" };
    if (adminToken.trim()) {
      next.Authorization = `Bearer ${adminToken.trim()}`;
    }
    return next;
  }, [adminToken]);

  const readiness = configStatus(config);

  useEffect(() => {
    const savedToken = window.localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
    if (savedToken) {
      setAdminToken(savedToken);
    }
    const savedConfig = window.localStorage.getItem(ADMIN_CONFIG_STORAGE_KEY);
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig) as AIBotAdminConfig;
        setConfig(parsed);
        setHasLocalSnapshot(true);
      } catch {
        window.localStorage.removeItem(ADMIN_CONFIG_STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    if (!adminToken.trim()) {
      window.localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, adminToken.trim());
  }, [adminToken]);

  async function loadConfig() {
    setLoading(true);
    setStatus("");
    try {
      const response = await fetch("/api/aibot/admin-config", {
        method: "GET",
        headers: adminToken.trim() ? { Authorization: `Bearer ${adminToken.trim()}` } : undefined,
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        config?: AIBotAdminConfig;
      };
      if (!response.ok || !payload.config) {
        throw new Error(payload.error || "Načtení selhalo.");
      }
      setConfig(payload.config);
      window.localStorage.setItem(
        ADMIN_CONFIG_STORAGE_KEY,
        JSON.stringify(payload.config),
      );
      setHasLocalSnapshot(true);
      setStatus("Konfigurace načtena.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Načtení selhalo.";
      setStatus(message);
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    setSaving(true);
    setStatus("");
    try {
      const response = await fetch("/api/aibot/admin-config", {
        method: "PUT",
        headers,
        body: JSON.stringify({ config }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        config?: AIBotAdminConfig;
      };
      if (!response.ok || !payload.config) {
        throw new Error(payload.error || "Uložení selhalo.");
      }
      setConfig(payload.config);
      window.localStorage.setItem(
        ADMIN_CONFIG_STORAGE_KEY,
        JSON.stringify(payload.config),
      );
      setHasLocalSnapshot(true);
      setStatus("AIBot konfigurace uložena.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Uložení selhalo.";
      setStatus(message);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!adminToken.trim() || hasLocalSnapshot) return;
    void loadConfig();
    // Re-load only when a token becomes available or changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminToken, hasLocalSnapshot]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold">AIBot Admin</h1>
            <p className="mt-1 text-sm text-slate-400">
              Sem doplníš klíče, integrace, workflow IDs a základní chování asistenta.
            </p>
          </div>
          <Link
            href="/AIBot"
            className="inline-flex rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-900"
          >
            Otevřít AIBot
          </Link>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold">Přístup</h2>
          <p className="mt-1 text-sm text-slate-400">
            Pokud nastavíš `AIBOT_ADMIN_TOKEN`, tato stránka a API budou vyžadovat bearer token.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
              placeholder="AIBOT_ADMIN_TOKEN"
              value={adminToken}
              onChange={(event) => setAdminToken(event.target.value)}
            />
            <button
              type="button"
              onClick={() => void loadConfig()}
              disabled={loading}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
            >
              {loading ? "Načítám..." : "Načíst konfiguraci"}
            </button>
            <button
              type="button"
              onClick={() => void saveConfig()}
              disabled={saving}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
            >
              {saving ? "Ukládám..." : "Uložit konfiguraci"}
            </button>
          </div>
          {status ? <p className="mt-3 text-sm text-slate-300">{status}</p> : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-lg font-semibold">Assistant</h2>
              <div className="mt-4 grid gap-4">
                <input
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  placeholder="Jméno asistenta"
                  value={config.assistant.name}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      assistant: { ...current.assistant, name: event.target.value },
                    }))
                  }
                />
                <textarea
                  className="min-h-24 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  placeholder="Welcome message"
                  value={config.assistant.welcomeMessage}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      assistant: { ...current.assistant, welcomeMessage: event.target.value },
                    }))
                  }
                />
                <textarea
                  className="min-h-32 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  placeholder="System prompt"
                  value={config.assistant.systemPrompt}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      assistant: { ...current.assistant, systemPrompt: event.target.value },
                    }))
                  }
                />
                <label className="flex items-center gap-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={config.assistant.voiceEnabled}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        assistant: { ...current.assistant, voiceEnabled: event.target.checked },
                      }))
                    }
                  />
                  Voice enabled
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={config.assistant.autonomousMode}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        assistant: { ...current.assistant, autonomousMode: event.target.checked },
                      }))
                    }
                  />
                  Autonomous mode
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-lg font-semibold">Core Connections</h2>
              <div className="mt-4 grid gap-4">
                <input
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  placeholder="n8n webhook URL"
                  value={config.n8n.webhookUrl}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      n8n: { ...current.n8n, webhookUrl: event.target.value },
                    }))
                  }
                />
                <input
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  placeholder="n8n webhook bearer token"
                  value={config.n8n.webhookToken}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      n8n: { ...current.n8n, webhookToken: event.target.value },
                    }))
                  }
                />
                <input
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  placeholder="Anthropic API key"
                  value={config.anthropic.apiKey}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      anthropic: { ...current.anthropic, apiKey: event.target.value },
                    }))
                  }
                />
                <input
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  placeholder="Claude model"
                  value={config.anthropic.model}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      anthropic: { ...current.anthropic, model: event.target.value },
                    }))
                  }
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-lg font-semibold">Workflow IDs</h2>
              <div className="mt-4 grid gap-4">
                <input
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  value={config.n8n.workflowIds.realtime}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      n8n: {
                        ...current.n8n,
                        workflowIds: { ...current.n8n.workflowIds, realtime: event.target.value },
                      },
                    }))
                  }
                />
                <input
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  value={config.n8n.workflowIds.morningBrief}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      n8n: {
                        ...current.n8n,
                        workflowIds: {
                          ...current.n8n.workflowIds,
                          morningBrief: event.target.value,
                        },
                      },
                    }))
                  }
                />
                <input
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                  value={config.n8n.workflowIds.campaignWatchdog}
                  onChange={(event) =>
                    setConfig((current) => ({
                      ...current,
                      n8n: {
                        ...current.n8n,
                        workflowIds: {
                          ...current.n8n.workflowIds,
                          campaignWatchdog: event.target.value,
                        },
                      },
                    }))
                  }
                />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-lg font-semibold">Integrations</h2>
              <div className="mt-4 space-y-6">
                <div className="space-y-3 rounded-xl border border-slate-800 p-4">
                  <label className="flex items-center gap-3 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={config.integrations.hubspot.enabled}
                      onChange={(event) =>
                        setConfig((current) => ({
                          ...current,
                          integrations: {
                            ...current.integrations,
                            hubspot: {
                              ...current.integrations.hubspot,
                              enabled: event.target.checked,
                            },
                          },
                        }))
                      }
                    />
                    HubSpot enabled
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    placeholder="HubSpot private app token"
                    value={config.integrations.hubspot.privateAppToken}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        integrations: {
                          ...current.integrations,
                          hubspot: {
                            ...current.integrations.hubspot,
                            privateAppToken: event.target.value,
                          },
                        },
                      }))
                    }
                  />
                </div>

                <div className="space-y-3 rounded-xl border border-slate-800 p-4">
                  <label className="flex items-center gap-3 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={config.integrations.asana.enabled}
                      onChange={(event) =>
                        setConfig((current) => ({
                          ...current,
                          integrations: {
                            ...current.integrations,
                            asana: {
                              ...current.integrations.asana,
                              enabled: event.target.checked,
                            },
                          },
                        }))
                      }
                    />
                    Asana enabled
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    placeholder="Asana PAT"
                    value={config.integrations.asana.pat}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        integrations: {
                          ...current.integrations,
                          asana: {
                            ...current.integrations.asana,
                            pat: event.target.value,
                          },
                        },
                      }))
                    }
                  />
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    placeholder="Asana workspace GID"
                    value={config.integrations.asana.workspaceGid}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        integrations: {
                          ...current.integrations,
                          asana: {
                            ...current.integrations.asana,
                            workspaceGid: event.target.value,
                          },
                        },
                      }))
                    }
                  />
                  <textarea
                    className="min-h-24 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    placeholder="Asana project GIDs, jeden na řádek"
                    value={toLines(config.integrations.asana.projectGids)}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        integrations: {
                          ...current.integrations,
                          asana: {
                            ...current.integrations.asana,
                            projectGids: fromLines(event.target.value),
                          },
                        },
                      }))
                    }
                  />
                </div>

                <div className="space-y-3 rounded-xl border border-slate-800 p-4">
                  <label className="flex items-center gap-3 text-sm text-slate-300">
                    <input
                      type="checkbox"
                      checked={config.integrations.gmail.enabled}
                      onChange={(event) =>
                        setConfig((current) => ({
                          ...current,
                          integrations: {
                            ...current.integrations,
                            gmail: {
                              ...current.integrations.gmail,
                              enabled: event.target.checked,
                            },
                          },
                        }))
                      }
                    />
                    Gmail enabled
                  </label>
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    placeholder="Google client ID"
                    value={config.integrations.gmail.clientId}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        integrations: {
                          ...current.integrations,
                          gmail: {
                            ...current.integrations.gmail,
                            clientId: event.target.value,
                          },
                        },
                      }))
                    }
                  />
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    placeholder="Google client secret"
                    value={config.integrations.gmail.clientSecret}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        integrations: {
                          ...current.integrations,
                          gmail: {
                            ...current.integrations.gmail,
                            clientSecret: event.target.value,
                          },
                        },
                      }))
                    }
                  />
                  <input
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                    placeholder="Google refresh token"
                    value={config.integrations.gmail.refreshToken}
                    onChange={(event) =>
                      setConfig((current) => ({
                        ...current,
                        integrations: {
                          ...current.integrations,
                          gmail: {
                            ...current.integrations.gmail,
                            refreshToken: event.target.value,
                          },
                        },
                      }))
                    }
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-3 rounded-xl border border-slate-800 p-4">
                    <label className="flex items-center gap-3 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={config.integrations.ga4.enabled}
                        onChange={(event) =>
                          setConfig((current) => ({
                            ...current,
                            integrations: {
                              ...current.integrations,
                              ga4: {
                                ...current.integrations.ga4,
                                enabled: event.target.checked,
                              },
                            },
                          }))
                        }
                      />
                      GA4 enabled
                    </label>
                    <input
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                      placeholder="GA4 property ID"
                      value={config.integrations.ga4.propertyId}
                      onChange={(event) =>
                        setConfig((current) => ({
                          ...current,
                          integrations: {
                            ...current.integrations,
                            ga4: {
                              ...current.integrations.ga4,
                              propertyId: event.target.value,
                            },
                          },
                        }))
                      }
                    />
                  </div>

                  <div className="space-y-3 rounded-xl border border-slate-800 p-4">
                    <label className="flex items-center gap-3 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={config.integrations.googleAds.enabled}
                        onChange={(event) =>
                          setConfig((current) => ({
                            ...current,
                            integrations: {
                              ...current.integrations,
                              googleAds: {
                                ...current.integrations.googleAds,
                                enabled: event.target.checked,
                              },
                            },
                          }))
                        }
                      />
                      Google Ads enabled
                    </label>
                    <input
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                      placeholder="Developer token"
                      value={config.integrations.googleAds.developerToken}
                      onChange={(event) =>
                        setConfig((current) => ({
                          ...current,
                          integrations: {
                            ...current.integrations,
                            googleAds: {
                              ...current.integrations.googleAds,
                              developerToken: event.target.value,
                            },
                          },
                        }))
                      }
                    />
                    <input
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                      placeholder="Customer ID"
                      value={config.integrations.googleAds.customerId}
                      onChange={(event) =>
                        setConfig((current) => ({
                          ...current,
                          integrations: {
                            ...current.integrations,
                            googleAds: {
                              ...current.integrations.googleAds,
                              customerId: event.target.value,
                            },
                          },
                        }))
                      }
                    />
                    <input
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                      placeholder="Login customer ID"
                      value={config.integrations.googleAds.loginCustomerId}
                      onChange={(event) =>
                        setConfig((current) => ({
                          ...current,
                          integrations: {
                            ...current.integrations,
                            googleAds: {
                              ...current.integrations.googleAds,
                              loginCustomerId: event.target.value,
                            },
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-lg font-semibold">Checklist</h2>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {checklist.map((item) => (
                  <li key={item} className="rounded-lg border border-slate-800 px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-slate-500">
                Poznámka: tato konfigurace se ukládá jako JSON do Supabase. Pro produkci je lepší
                mít `AIBOT_ADMIN_TOKEN` a přístup jen pro interní admin použití.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-lg font-semibold">Readiness</h2>
              <div className="mt-4 space-y-2 text-sm">
                <div>Core: {readiness.coreReady ? "ready" : "missing"}</div>
                <div>HubSpot: {readiness.hubspotReady ? "ready" : "missing"}</div>
                <div>Asana: {readiness.asanaReady ? "ready" : "missing"}</div>
                <div>Gmail: {readiness.gmailReady ? "ready" : "missing"}</div>
                <div>GA4: {readiness.ga4Ready ? "ready" : "missing"}</div>
                <div>Google Ads: {readiness.adsReady ? "ready" : "missing"}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
              <h2 className="text-lg font-semibold">Docs</h2>
              <div className="mt-4 space-y-2 text-sm text-cyan-300">
                <p>/docs/aibot-credentials-checklist.md</p>
                <p>/docs/aibot-node-map.md</p>
                <p>/docs/aibot-http-configs.md</p>
                <p>/docs/aibot-setup.md</p>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
