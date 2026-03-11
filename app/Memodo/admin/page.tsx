"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  defaultMemodoAdminConfig,
  type MemodoAdminConfig,
} from "@/lib/memodo-admin-config";

type UatTask = {
  id: string;
  label: string;
  group: "iOS" | "Android" | "Flow";
};

const UAT_STORAGE_KEY = "memodo_uat_checklist_v1";

const uatTasks: UatTask[] = [
  { id: "ios_open_safari", group: "iOS", label: "iPhone: otevřít app v Safari" },
  { id: "ios_add_home", group: "iOS", label: "iPhone: Přidat na plochu + ověřit ikonu" },
  { id: "ios_reopen", group: "iOS", label: "iPhone: otevřít z plochy bez browser lišty" },
  { id: "android_install", group: "Android", label: "Android: nainstalovat přes install prompt" },
  { id: "android_reopen", group: "Android", label: "Android: otevřít z launcheru" },
  { id: "flow_search", group: "Flow", label: "Flow: vyhledat produkt v katalogu" },
  { id: "flow_detail", group: "Flow", label: "Flow: otevřít detail produktu" },
  { id: "flow_inquiry", group: "Flow", label: "Flow: odeslat test poptávku" },
  { id: "flow_hubspot", group: "Flow", label: "Flow: ověřit propsání do HubSpotu" },
];

type DashboardState = {
  productsActive: number;
  productsInStock: number;
  productsPromo: number;
  productsWithImage: number;
  kbSources: number;
  lastProductUpdate: string | null;
  checks: {
    hubspotToken: boolean;
    xmlFeedUrl: boolean;
    importTokenProtected: boolean;
  };
  ai: {
    enabled: boolean;
    shopping: boolean;
    technical: boolean;
  };
  analytics?: {
    eventsTracked: boolean;
    periodDays: number;
    funnel: {
      views: number;
      searches: number;
      productDetailOpens: number;
      inquiryAttempts: number;
      inquirySuccess: number;
      aiMessages: number;
    };
    topSearches: Array<{ query: string; count: number }>;
  };
};

export default function MemodoAdminPage() {
  const [config, setConfig] = useState<MemodoAdminConfig>(defaultMemodoAdminConfig);
  const [adminToken, setAdminToken] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [feedUrl, setFeedUrl] = useState("");
  const [feedAuthType, setFeedAuthType] = useState<"none" | "basic" | "bearer" | "header" | "query">("none");
  const [feedUsername, setFeedUsername] = useState("");
  const [feedPassword, setFeedPassword] = useState("");
  const [feedToken, setFeedToken] = useState("");
  const [feedHeaderName, setFeedHeaderName] = useState("X-Feed-Token");
  const [feedQueryParam, setFeedQueryParam] = useState("token");
  const [feedUseProxy, setFeedUseProxy] = useState(false);
  const [feedProxyUrl, setFeedProxyUrl] = useState("");
  const [feedProxyAuthType, setFeedProxyAuthType] = useState<"none" | "basic" | "bearer" | "header">("none");
  const [feedProxyUsername, setFeedProxyUsername] = useState("");
  const [feedProxyPassword, setFeedProxyPassword] = useState("");
  const [feedProxyToken, setFeedProxyToken] = useState("");
  const [feedProxyHeaderName, setFeedProxyHeaderName] = useState("X-Proxy-Token");
  const [kbSitemapUrl, setKbSitemapUrl] = useState("https://memodo.cz/sitemap.xml");
  const [kbBatchSize, setKbBatchSize] = useState(60);
  const [kbMaxUrls, setKbMaxUrls] = useState(1500);
  const [kbDiscovering, setKbDiscovering] = useState(false);
  const [kbIngesting, setKbIngesting] = useState(false);
  const [kbTotalUrls, setKbTotalUrls] = useState<number | null>(null);
  const [kbLastProcessed, setKbLastProcessed] = useState(0);
  const [kbStatus, setKbStatus] = useState("");
  const [kbSources, setKbSources] = useState<number | null>(null);
  const [kbResetting, setKbResetting] = useState(false);
  const [aiTestMode, setAiTestMode] = useState<"shopping" | "technical">("shopping");
  const [aiTestMessage, setAiTestMessage] = useState("Potřebuji set střídač + baterie pro rodinný dům 10 kW.");
  const [aiTesting, setAiTesting] = useState(false);
  const [aiTestReply, setAiTestReply] = useState("");
  const [hubspotTestRunning, setHubspotTestRunning] = useState(false);
  const [hubspotTestEmail, setHubspotTestEmail] = useState("");
  const [hubspotTestResult, setHubspotTestResult] = useState("");
  const [allowlistText, setAllowlistText] = useState("");
  const [allowlistLoading, setAllowlistLoading] = useState(false);
  const [allowlistSaving, setAllowlistSaving] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [dashboard, setDashboard] = useState<DashboardState | null>(null);
  const [uatState, setUatState] = useState<Record<string, boolean>>({});

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true);
    setDashboardError("");
    try {
      const response = await fetch("/api/memodo/admin-dashboard", { cache: "no-store" });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        dashboard?: DashboardState;
      };
      if (!response.ok || !payload.dashboard) {
        throw new Error(payload.error || "Nepodařilo se načíst dashboard.");
      }
      setDashboard(payload.dashboard);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Nepodařilo se načíst dashboard.";
      setDashboardError(message);
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/memodo/admin-config", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Load failed"))))
      .then((payload: { config?: MemodoAdminConfig }) => {
        if (!active || !payload?.config) return;
        setConfig(payload.config);
      })
      .catch(() => {
        setStatus("Nepodařilo se načíst konfiguraci, zobrazuji default.");
      })
      .finally(() => {
        if (active) {
          void fetch("/api/memodo-ai/stats", { cache: "no-store" })
            .then((response) => (response.ok ? response.json() : null))
            .then((payload: { sources?: number } | null) => {
              if (typeof payload?.sources === "number") setKbSources(payload.sources);
            })
            .catch(() => null);
          void loadDashboard();
          const rawUat = window.localStorage.getItem(UAT_STORAGE_KEY);
          if (rawUat) {
            try {
              const parsed = JSON.parse(rawUat) as Record<string, boolean>;
              setUatState(parsed || {});
            } catch {
              setUatState({});
            }
          }
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [loadDashboard]);

  const headers = useMemo(() => {
    const out: Record<string, string> = { "Content-Type": "application/json" };
    if (adminToken.trim()) out.Authorization = `Bearer ${adminToken.trim()}`;
    return out;
  }, [adminToken]);

  const loadPriceAllowlist = useCallback(async () => {
    setAllowlistLoading(true);
    try {
      const response = await fetch("/api/memodo/price-allowlist", {
        method: "GET",
        headers,
      });
      const payload = (await response.json().catch(() => ({}))) as { emails?: string[] };
      if (!response.ok || !Array.isArray(payload.emails)) {
        setAllowlistText("");
        return;
      }
      setAllowlistText(payload.emails.join("\n"));
    } finally {
      setAllowlistLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    void loadPriceAllowlist();
  }, [loadPriceAllowlist]);

  const saveConfig = async () => {
    setSaving(true);
    setStatus("");
    try {
      const response = await fetch("/api/memodo/admin-config", {
        method: "PUT",
        headers,
        body: JSON.stringify({ config }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        config?: MemodoAdminConfig;
      };
      if (!response.ok) throw new Error(payload.error || "Uložení selhalo.");
      if (payload.config) setConfig(payload.config);
      setStatus("Nastavení uloženo.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Uložení selhalo.";
      setStatus(message);
    } finally {
      setSaving(false);
    }
  };

  const runImport = async () => {
    setImporting(true);
    setStatus("");
    try {
      const response = await fetch("/api/memodo/import-xml", {
        method: "POST",
        headers,
        body: JSON.stringify({
          feedUrl: feedUrl.trim() || undefined,
          deactivateMissing: true,
          onlyWithImage: true,
          feedAuthType,
          feedUsername: feedUsername.trim() || undefined,
          feedPassword: feedPassword || undefined,
          feedToken: feedToken.trim() || undefined,
          feedHeaderName: feedHeaderName.trim() || undefined,
          feedQueryParam: feedQueryParam.trim() || undefined,
          useProxy: feedUseProxy,
          proxyUrl: feedProxyUrl.trim() || undefined,
          proxyAuthType: feedProxyAuthType,
          proxyUsername: feedProxyUsername.trim() || undefined,
          proxyPassword: feedProxyPassword || undefined,
          proxyToken: feedProxyToken.trim() || undefined,
          proxyHeaderName: feedProxyHeaderName.trim() || undefined,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        processedCount?: number;
        done?: boolean;
        nextStartIndex?: number | null;
      };
      if (!response.ok) throw new Error(payload.error || "Import selhal.");

      setStatus(
        payload.done
          ? `Import dokončen. Poslední dávka: ${payload.processedCount ?? 0} produktů.`
          : `Import dávky hotový (${payload.processedCount ?? 0}). Pokračuj dalším během od indexu ${payload.nextStartIndex}.`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Import selhal.";
      setStatus(message);
    } finally {
      setImporting(false);
    }
  };

  const runKnowledgeDiscovery = async () => {
    setKbDiscovering(true);
    setKbStatus("");
    setKbLastProcessed(0);
    setKbTotalUrls(null);
    try {
      const response = await fetch("/api/memodo-ai/ingest", {
        method: "POST",
        headers,
        body: JSON.stringify({
          sitemapUrl: kbSitemapUrl.trim(),
          discoverOnly: true,
          maxUrls: kbMaxUrls,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        totalUrls?: number;
        sitemapSourceCount?: number;
      };
      if (!response.ok) throw new Error(payload.error || "Discovery selhalo.");
      const total = payload.totalUrls ?? 0;
      setKbTotalUrls(total);
      setKbStatus(
        `Discovery hotové. Nalezeno ${total} URL (zdrojů v sitemap indexu: ${payload.sitemapSourceCount ?? 1}).`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Discovery selhalo.";
      setKbStatus(message);
    } finally {
      setKbDiscovering(false);
    }
  };

  const runKnowledgeIngest = async () => {
    setKbIngesting(true);
    setKbStatus("");
    setKbLastProcessed(0);
    try {
      let startIndex = 0;
      let processedTotal = 0;
      let discoveredTotal: number | null = null;
      const safeBatchSize = Math.min(200, Math.max(10, Math.floor(kbBatchSize)));
      const safeMaxUrls = Math.min(1500, Math.max(1, Math.floor(kbMaxUrls)));

      while (true) {
        const response = await fetch("/api/memodo-ai/ingest", {
          method: "POST",
          headers,
          body: JSON.stringify({
            sitemapUrl: kbSitemapUrl.trim(),
            startIndex,
            batchSize: safeBatchSize,
            maxUrls: safeMaxUrls,
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
          totalUrls?: number;
          processed?: number;
          nextStartIndex?: number | null;
          done?: boolean;
        };
        if (!response.ok) throw new Error(payload.error || "Ingest selhal.");

        const processed = payload.processed ?? 0;
        processedTotal += processed;
        setKbLastProcessed(processedTotal);
        if (typeof payload.totalUrls === "number") {
          discoveredTotal = payload.totalUrls;
          setKbTotalUrls(payload.totalUrls);
        }

        if (payload.done || payload.nextStartIndex === null || processed === 0) {
          const totalLabel =
            discoveredTotal !== null
              ? `${processedTotal}/${discoveredTotal}`
              : String(processedTotal);
          setKbStatus(`AI ingest dokončen. Zpracováno ${totalLabel} URL.`);
          void fetch("/api/memodo-ai/stats", { cache: "no-store" })
            .then((response) => (response.ok ? response.json() : null))
            .then((stats: { sources?: number } | null) => {
              if (typeof stats?.sources === "number") setKbSources(stats.sources);
            })
            .catch(() => null);
          break;
        }

        startIndex = payload.nextStartIndex ?? startIndex + processed;
        setKbStatus(`AI ingest běží... zpracováno ${processedTotal}${discoveredTotal ? `/${discoveredTotal}` : ""} URL`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Ingest selhal.";
      setKbStatus(message);
    } finally {
      setKbIngesting(false);
    }
  };

  const runKnowledgeReset = async () => {
    if (!window.confirm("Opravdu chceš smazat celou AI znalostní bázi pro Memodo?")) return;
    setKbResetting(true);
    setKbStatus("");
    try {
      const response = await fetch("/api/memodo-ai/stats", {
        method: "DELETE",
        headers,
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Reset selhal.");
      setKbSources(0);
      setKbTotalUrls(null);
      setKbLastProcessed(0);
      setKbStatus("AI znalostní báze byla vymazána.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Reset selhal.";
      setKbStatus(message);
    } finally {
      setKbResetting(false);
    }
  };

  const runAiTest = async () => {
    const message = aiTestMessage.trim();
    if (!message) return;
    setAiTesting(true);
    setAiTestReply("");
    try {
      const response = await fetch("/api/memodo-ai/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          mode: aiTestMode,
          message,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        reply?: string;
      };
      if (!response.ok || !payload.reply) {
        throw new Error(payload.error || "AI test selhal.");
      }
      setAiTestReply(payload.reply);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "AI test selhal.";
      setAiTestReply(message);
    } finally {
      setAiTesting(false);
    }
  };

  const runHubspotSmokeTest = async () => {
    const email = hubspotTestEmail.trim();
    if (!email) {
      setHubspotTestResult("Zadej testovací e-mail.");
      return;
    }

    setHubspotTestRunning(true);
    setHubspotTestResult("");
    try {
      const response = await fetch("/api/hubspot/memodo-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: "Memodo",
          last_name: "UAT",
          contact_name: "Memodo UAT",
          email,
          phone: "+420000000000",
          company: "UAT Test",
          product_interest: "kompletni_sestava",
          message: "Automatický smoke test propsání poptávky do HubSpotu z Memodo adminu.",
          sourceUrl: "/Memodo/admin",
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        contactId?: string;
        dealId?: string | null;
      };
      if (!response.ok) {
        throw new Error(payload.error || "HubSpot smoke test selhal.");
      }
      setHubspotTestResult(
        `OK. Kontakt: ${payload.contactId || "-"}, Deal: ${payload.dealId || "nevytvořen"}`
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "HubSpot smoke test selhal.";
      setHubspotTestResult(message);
    } finally {
      setHubspotTestRunning(false);
    }
  };

  const savePriceAllowlist = async () => {
    setAllowlistSaving(true);
    setStatus("");
    try {
      const emails = allowlistText
        .split(/\n|,|;|\s+/)
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);

      const response = await fetch("/api/memodo/price-allowlist", {
        method: "PUT",
        headers,
        body: JSON.stringify({ emails }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; count?: number };
      if (!response.ok) throw new Error(payload.error || "Uložení allowlistu selhalo.");
      setStatus(`Allowlist uložen (${payload.count ?? emails.length} e-mailů).`);
      void loadPriceAllowlist();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Uložení allowlistu selhalo.";
      setStatus(message);
    } finally {
      setAllowlistSaving(false);
    }
  };

  const toggleUatTask = (id: string) => {
    setUatState((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      window.localStorage.setItem(UAT_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const resetUatChecklist = () => {
    setUatState({});
    window.localStorage.removeItem(UAT_STORAGE_KEY);
  };

  const copyUatReport = async () => {
    const done = uatTasks.filter((task) => uatState[task.id]).length;
    const rows = uatTasks.map((task) => `- [${uatState[task.id] ? "x" : " "}] ${task.group}: ${task.label}`);
    const report = [
      `Memodo UAT report`,
      `Datum: ${new Date().toISOString()}`,
      `Hotovo: ${done}/${uatTasks.length}`,
      "",
      ...rows,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(report);
      setStatus("UAT report zkopírován do schránky.");
    } catch {
      setStatus("Nepodařilo se zkopírovat UAT report.");
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 p-6 text-slate-200">Načítám Memodo admin...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-semibold">Memodo admin</h1>
          <p className="mt-1 text-sm text-slate-400">Nastavení akčních produktů, katalog režimu, AI a importu feedu.</p>
          <div className="mt-3">
            <Link
              href="/Memodo"
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Otevřít Memodo aplikaci
            </Link>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">Provozní dashboard</h2>
            <button
              type="button"
              onClick={loadDashboard}
              disabled={dashboardLoading}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-600 disabled:opacity-50"
            >
              {dashboardLoading ? "Načítám..." : "Obnovit"}
            </button>
          </div>
          {dashboardError ? <p className="text-xs text-rose-300">{dashboardError}</p> : null}
          {dashboard ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-slate-700 bg-slate-950 p-2">
                  Aktivní produkty: <span className="font-semibold">{dashboard.productsActive}</span>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-950 p-2">
                  Skladem: <span className="font-semibold">{dashboard.productsInStock}</span>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-950 p-2">
                  Promo: <span className="font-semibold">{dashboard.productsPromo}</span>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-950 p-2">
                  S obrázkem: <span className="font-semibold">{dashboard.productsWithImage}</span>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-950 p-2">
                  KB zdroje: <span className="font-semibold">{dashboard.kbSources}</span>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-950 p-2">
                  Posl. update:{" "}
                  <span className="font-semibold">
                    {dashboard.lastProductUpdate
                      ? new Date(dashboard.lastProductUpdate).toLocaleString("cs-CZ")
                      : "-"}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-950 p-2">
                  HubSpot token:{" "}
                  <span className={dashboard.checks.hubspotToken ? "text-emerald-300" : "text-rose-300"}>
                    {dashboard.checks.hubspotToken ? "OK" : "Chybí"}
                  </span>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-950 p-2">
                  XML feed URL:{" "}
                  <span className={dashboard.checks.xmlFeedUrl ? "text-emerald-300" : "text-rose-300"}>
                    {dashboard.checks.xmlFeedUrl ? "OK" : "Chybí"}
                  </span>
                </div>
              </div>

              {dashboard.analytics ? (
                <div className="rounded-lg border border-slate-700 bg-slate-950 p-3 text-xs">
                  <p className="font-semibold text-slate-200">
                    Funnel ({dashboard.analytics.periodDays} dní)
                    {!dashboard.analytics.eventsTracked ? " - event tabulka zatím není dostupná" : ""}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-slate-300">
                    <div>Zobrazení: {dashboard.analytics.funnel.views}</div>
                    <div>Hledání: {dashboard.analytics.funnel.searches}</div>
                    <div>Detail produktu: {dashboard.analytics.funnel.productDetailOpens}</div>
                    <div>Poptávka start: {dashboard.analytics.funnel.inquiryAttempts}</div>
                    <div>Poptávka úspěch: {dashboard.analytics.funnel.inquirySuccess}</div>
                    <div>AI zprávy: {dashboard.analytics.funnel.aiMessages}</div>
                  </div>
                  {dashboard.analytics.topSearches.length > 0 ? (
                    <div className="mt-3">
                      <p className="font-semibold text-slate-200">Top hledání</p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {dashboard.analytics.topSearches.map((item) => (
                          <span
                            key={item.query}
                            className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300"
                          >
                            {item.query} ({item.count})
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">UAT checklist (mobil)</h2>
          <p className="text-xs text-slate-400">
            Projdi test instalace i flow poptávky. Stav se ukládá lokálně v tomto prohlížeči.
          </p>
          <div className="space-y-1">
            {uatTasks.map((task) => (
              <label key={task.id} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={Boolean(uatState[task.id])}
                  onChange={() => toggleUatTask(task.id)}
                />
                <span className="text-slate-400">{task.group}</span>
                <span className="text-slate-200">{task.label}</span>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyUatReport}
              className="rounded-lg bg-cyan-700 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-600"
            >
              Kopírovat UAT report
            </button>
            <button
              type="button"
              onClick={resetUatChecklist}
              className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-600"
            >
              Reset checklistu
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">HubSpot smoke test</h2>
          <p className="text-xs text-slate-400">
            Ověří propsání poptávky do HubSpotu bez čekání na ruční mobilní test.
          </p>
          <input
            type="email"
            value={hubspotTestEmail}
            onChange={(e) => setHubspotTestEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            placeholder="test@email.cz"
          />
          <button
            type="button"
            onClick={runHubspotSmokeTest}
            disabled={hubspotTestRunning}
            className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
          >
            {hubspotTestRunning ? "Ověřuji..." : "Spustit HubSpot smoke test"}
          </button>
          {hubspotTestResult ? (
            <p className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200">
              {hubspotTestResult}
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <label className="mb-1 block text-xs text-slate-400">MEMODO_ADMIN_TOKEN</label>
          <input
            type="password"
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            placeholder="Bearer token pro save/import"
          />
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">Allowlist pro zobrazení cen</h2>
          <p className="text-xs text-slate-400">
            Ceny uvidí pouze přihlášení uživatelé s e-mailem v tomto seznamu.
          </p>
          <textarea
            rows={8}
            value={allowlistText}
            onChange={(e) => setAllowlistText(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs"
            placeholder="partner1@firma.cz&#10;partner2@firma.cz"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={savePriceAllowlist}
              disabled={allowlistSaving}
              className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {allowlistSaving ? "Ukládám..." : "Uložit allowlist"}
            </button>
            <button
              type="button"
              onClick={() => void loadPriceAllowlist()}
              disabled={allowlistLoading}
              className="rounded-lg bg-slate-700 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-600 disabled:opacity-50"
            >
              {allowlistLoading ? "Načítám..." : "Obnovit seznam"}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">Akční produkty a katalog</h2>
          <label className="block text-xs text-slate-400">
            Featured product IDs (oddělené čárkou) - tyto produkty se zobrazí v menu „Akční produkty“
          </label>
          <textarea
            rows={3}
            value={config.featuredProductIds.join(", ")}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                featuredProductIds: e.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              }))
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            placeholder="např. p1,p2,p3"
          />
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={config.catalogRequiresSearch}
              onChange={(e) => setConfig((prev) => ({ ...prev, catalogRequiresSearch: e.target.checked }))}
            />
            V katalogu zobrazovat produkty až po fulltext dotazu
          </label>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">AI chatbot nastavení</h2>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={config.aiSearchEnabled}
              onChange={(e) => setConfig((prev) => ({ ...prev, aiSearchEnabled: e.target.checked }))}
            />
            AI vyhledávání (semantic search)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={config.shoppingChatbotEnabled}
              onChange={(e) => setConfig((prev) => ({ ...prev, shoppingChatbotEnabled: e.target.checked }))}
            />
            Nákupní chatbot
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={config.technicalAdvisorEnabled}
              onChange={(e) => setConfig((prev) => ({ ...prev, technicalAdvisorEnabled: e.target.checked }))}
            />
            Technický poradce
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-400">
              Výchozí režim
              <select
                value={config.aiDefaultMode}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, aiDefaultMode: e.target.value as "shopping" | "technical" }))
                }
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100"
              >
                <option value="shopping">Nákupní</option>
                <option value="technical">Technický</option>
              </select>
            </label>
            <label className="text-xs text-slate-400">
              Max citací na odpověď
              <input
                type="number"
                min={1}
                max={8}
                value={config.aiCitationLimit}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    aiCitationLimit: Math.min(8, Math.max(1, Number(e.target.value) || 5)),
                  }))
                }
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100"
              />
            </label>
          </div>

          <label className="block text-xs text-slate-400">Text tlačítka (floating button)</label>
          <input
            value={config.aiFabLabel}
            onChange={(e) => setConfig((prev) => ({ ...prev, aiFabLabel: e.target.value }))}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          />

          <label className="block text-xs text-slate-400">Uvítací zpráva chatbota</label>
          <textarea
            rows={2}
            value={config.aiWelcomeMessage}
            onChange={(e) => setConfig((prev) => ({ ...prev, aiWelcomeMessage: e.target.value }))}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          />

          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs text-slate-400">
              LLM model
              <input
                value={config.aiModel}
                onChange={(e) => setConfig((prev) => ({ ...prev, aiModel: e.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100"
              />
            </label>
            <label className="text-xs text-slate-400">
              Temperature
              <input
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={config.aiTemperature}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    aiTemperature: Math.min(1, Math.max(0, Number(e.target.value) || 0)),
                  }))
                }
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100"
              />
            </label>
            <label className="text-xs text-slate-400">
              Max output tokens
              <input
                type="number"
                min={100}
                max={2000}
                value={config.aiMaxOutputTokens}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    aiMaxOutputTokens: Math.min(2000, Math.max(100, Number(e.target.value) || 500)),
                  }))
                }
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-400">
              Preferované značky střídačů (čárkou)
              <input
                value={config.aiPreferredInverterBrands.join(", ")}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    aiPreferredInverterBrands: e.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  }))
                }
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100"
              />
            </label>
            <label className="text-xs text-slate-400">
              Preferované značky baterií (čárkou)
              <input
                value={config.aiPreferredBatteryBrands.join(", ")}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    aiPreferredBatteryBrands: e.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  }))
                }
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-400">
              Povolené páry značek (INV:BAT, po řádcích)
              <textarea
                rows={3}
                value={config.aiAllowedBrandPairs.join("\n")}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    aiAllowedBrandPairs: e.target.value
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100"
                placeholder="Huawei:BYD"
              />
            </label>
            <label className="text-xs text-slate-400">
              Blokované páry značek (INV:BAT, po řádcích)
              <textarea
                rows={3}
                value={config.aiBlockedBrandPairs.join("\n")}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    aiBlockedBrandPairs: e.target.value
                      .split("\n")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100"
                placeholder="GoodWe:Dyness"
              />
            </label>
          </div>

          <label className="text-xs text-slate-400">
            Maržový bias (0-1, vyšší = preference dražšího setu)
            <input
              type="number"
              min={0}
              max={1}
              step={0.1}
              value={config.aiMarginBias}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  aiMarginBias: Math.min(1, Math.max(0, Number(e.target.value) || 0)),
                }))
              }
              className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100"
            />
          </label>

          <label className="block text-xs text-slate-400">Prompt - nákupní chatbot</label>
          <textarea
            rows={2}
            value={config.shoppingAssistantPrompt}
            onChange={(e) => setConfig((prev) => ({ ...prev, shoppingAssistantPrompt: e.target.value }))}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          />

          <label className="block text-xs text-slate-400">Prompt - technický poradce</label>
          <textarea
            rows={2}
            value={config.technicalAdvisorPrompt}
            onChange={(e) => setConfig((prev) => ({ ...prev, technicalAdvisorPrompt: e.target.value }))}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
          />

          <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-3 space-y-2">
            <p className="text-xs font-semibold text-slate-200">Rychlý AI test</p>
            <div className="flex gap-2">
              <select
                value={aiTestMode}
                onChange={(e) => setAiTestMode(e.target.value as "shopping" | "technical")}
                className="h-10 rounded-lg border border-slate-700 bg-slate-800 px-3 text-xs text-slate-100"
              >
                <option value="shopping">Nákupní mód</option>
                <option value="technical">Technický mód</option>
              </select>
              <button
                type="button"
                onClick={runAiTest}
                disabled={aiTesting}
                className="h-10 rounded-lg bg-cyan-600 px-3 text-xs font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
              >
                {aiTesting ? "Testuji..." : "Spustit test odpovědi"}
              </button>
            </div>
            <textarea
              rows={2}
              value={aiTestMessage}
              onChange={(e) => setAiTestMessage(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
              placeholder="Testovací dotaz"
            />
            {aiTestReply ? (
              <div className="whitespace-pre-wrap rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-200">
                {aiTestReply}
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">XML import</h2>
          <label className="block text-xs text-slate-400">Feed URL (volitelné, jinak se použije MEMODO_XML_FEED_URL)</label>
          <input
            value={feedUrl}
            onChange={(e) => setFeedUrl(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            placeholder="https://..."
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-400">
              Feed auth
              <select
                value={feedAuthType}
                onChange={(e) =>
                  setFeedAuthType(e.target.value as "none" | "basic" | "bearer" | "header" | "query")
                }
                className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100"
              >
                <option value="none">Bez autentizace</option>
                <option value="basic">Basic Auth</option>
                <option value="bearer">Bearer token</option>
                <option value="header">Custom header token</option>
                <option value="query">Query token</option>
              </select>
            </label>
            {feedAuthType === "basic" ? (
              <label className="text-xs text-slate-400">
                Username
                <input
                  value={feedUsername}
                  onChange={(e) => setFeedUsername(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100"
                />
              </label>
            ) : null}
            {feedAuthType === "basic" ? (
              <label className="text-xs text-slate-400">
                Password
                <input
                  type="password"
                  value={feedPassword}
                  onChange={(e) => setFeedPassword(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100"
                />
              </label>
            ) : null}
            {feedAuthType === "bearer" ? (
              <label className="text-xs text-slate-400 col-span-2">
                Bearer token
                <input
                  type="password"
                  value={feedToken}
                  onChange={(e) => setFeedToken(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100"
                />
              </label>
            ) : null}
            {feedAuthType === "header" ? (
              <>
                <label className="text-xs text-slate-400">
                  Header name
                  <input
                    value={feedHeaderName}
                    onChange={(e) => setFeedHeaderName(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100"
                  />
                </label>
                <label className="text-xs text-slate-400">
                  Header token
                  <input
                    type="password"
                    value={feedToken}
                    onChange={(e) => setFeedToken(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100"
                  />
                </label>
              </>
            ) : null}
            {feedAuthType === "query" ? (
              <>
                <label className="text-xs text-slate-400">
                  Query param
                  <input
                    value={feedQueryParam}
                    onChange={(e) => setFeedQueryParam(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100"
                  />
                </label>
                <label className="text-xs text-slate-400">
                  Query token
                  <input
                    type="password"
                    value={feedToken}
                    onChange={(e) => setFeedToken(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100"
                  />
                </label>
              </>
            ) : null}
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={feedUseProxy}
              onChange={(e) => setFeedUseProxy(e.target.checked)}
            />
            Stahovat feed přes externí proxy endpoint (pro statickou IP)
          </label>
          {feedUseProxy ? (
            <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3 space-y-2">
              <label className="block text-xs text-slate-400">Proxy endpoint URL</label>
              <input
                value={feedProxyUrl}
                onChange={(e) => setFeedProxyUrl(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
                placeholder="https://proxy.example.com/fetch"
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-400">
                  Proxy auth
                  <select
                    value={feedProxyAuthType}
                    onChange={(e) =>
                      setFeedProxyAuthType(e.target.value as "none" | "basic" | "bearer" | "header")
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100"
                  >
                    <option value="none">Bez autentizace</option>
                    <option value="basic">Basic Auth</option>
                    <option value="bearer">Bearer token</option>
                    <option value="header">Custom header token</option>
                  </select>
                </label>
                {feedProxyAuthType === "basic" ? (
                  <label className="text-xs text-slate-400">
                    Proxy username
                    <input
                      value={feedProxyUsername}
                      onChange={(e) => setFeedProxyUsername(e.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100"
                    />
                  </label>
                ) : null}
                {feedProxyAuthType === "basic" ? (
                  <label className="text-xs text-slate-400">
                    Proxy password
                    <input
                      type="password"
                      value={feedProxyPassword}
                      onChange={(e) => setFeedProxyPassword(e.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100"
                    />
                  </label>
                ) : null}
                {feedProxyAuthType === "bearer" ? (
                  <label className="text-xs text-slate-400 col-span-2">
                    Proxy bearer token
                    <input
                      type="password"
                      value={feedProxyToken}
                      onChange={(e) => setFeedProxyToken(e.target.value)}
                      className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100"
                    />
                  </label>
                ) : null}
                {feedProxyAuthType === "header" ? (
                  <>
                    <label className="text-xs text-slate-400">
                      Proxy header name
                      <input
                        value={feedProxyHeaderName}
                        onChange={(e) => setFeedProxyHeaderName(e.target.value)}
                        className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100"
                      />
                    </label>
                    <label className="text-xs text-slate-400">
                      Proxy header token
                      <input
                        type="password"
                        value={feedProxyToken}
                        onChange={(e) => setFeedProxyToken(e.target.value)}
                        className="mt-1 h-10 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100"
                      />
                    </label>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
          <button
            type="button"
            onClick={runImport}
            disabled={importing}
            className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {importing ? "Importuji..." : "Spustit import XML (1 dávka)"}
          </button>
          <p className="text-xs text-slate-400">
            Pro velké feedy (30k+) spusť endpoint opakovaně, dokud nevrátí `done: true`.
          </p>
          <p className="text-xs text-slate-500">
            Přihlašovací údaje se používají jen pro aktuální spuštění importu. Pro trvalé nastavení použij `.env`.
          </p>
          <p className="text-xs text-slate-500">
            Proxy endpoint má dostat payload: targetUrl, method, headers a vrátit XML text nebo JSON objekt s polem
            xml.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">AI znalostní báze (Memodo.cz)</h2>
          <label className="block text-xs text-slate-400">Sitemap URL</label>
          <input
            value={kbSitemapUrl}
            onChange={(e) => setKbSitemapUrl(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm"
            placeholder="https://memodo.cz/sitemap.xml"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-slate-400">
              Batch size
              <input
                type="number"
                min={10}
                max={200}
                value={kbBatchSize}
                onChange={(e) => setKbBatchSize(Number(e.target.value) || 60)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </label>
            <label className="text-xs text-slate-400">
              Max URL (1-1500)
              <input
                type="number"
                min={1}
                max={1500}
                value={kbMaxUrls}
                onChange={(e) => setKbMaxUrls(Number(e.target.value) || 1500)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={runKnowledgeDiscovery}
              disabled={kbDiscovering || kbIngesting}
              className="w-full rounded-lg bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50"
            >
              {kbDiscovering ? "Načítám URL..." : "1) Discovery URL"}
            </button>
            <button
              type="button"
              onClick={runKnowledgeIngest}
              disabled={kbDiscovering || kbIngesting}
              className="w-full rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-50"
            >
              {kbIngesting ? "Ingestuji..." : "2) Spustit AI ingest"}
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Stav: {kbLastProcessed}
            {kbTotalUrls !== null ? ` / ${kbTotalUrls}` : ""} URL
          </p>
          <p className="text-xs text-slate-400">
            Uložené zdroje v KB: {kbSources !== null ? kbSources : "-"}
          </p>
          <button
            type="button"
            onClick={runKnowledgeReset}
            disabled={kbResetting || kbIngesting || kbDiscovering}
            className="w-full rounded-lg bg-rose-700 px-3 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50"
          >
            {kbResetting ? "Mažu znalostní bázi..." : "Reset AI znalostní báze"}
          </button>
          {kbStatus ? <p className="text-xs text-slate-300">{kbStatus}</p> : null}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={saveConfig}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? "Ukládám..." : "Uložit nastavení"}
          </button>
          {status ? <span className="text-sm text-slate-300">{status}</span> : null}
        </div>
      </div>
    </div>
  );
}
