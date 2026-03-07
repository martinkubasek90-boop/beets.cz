"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  defaultMemodoAdminConfig,
  type MemodoAdminConfig,
} from "@/lib/memodo-admin-config";

export default function MemodoAdminPage() {
  const [config, setConfig] = useState<MemodoAdminConfig>(defaultMemodoAdminConfig);
  const [adminToken, setAdminToken] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [feedUrl, setFeedUrl] = useState("");
  const [kbSitemapUrl, setKbSitemapUrl] = useState("https://memodo.cz/sitemap.xml");
  const [kbBatchSize, setKbBatchSize] = useState(60);
  const [kbMaxUrls, setKbMaxUrls] = useState(1500);
  const [kbDiscovering, setKbDiscovering] = useState(false);
  const [kbIngesting, setKbIngesting] = useState(false);
  const [kbTotalUrls, setKbTotalUrls] = useState<number | null>(null);
  const [kbLastProcessed, setKbLastProcessed] = useState(0);
  const [kbStatus, setKbStatus] = useState("");

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
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const headers = useMemo(() => {
    const out: Record<string, string> = { "Content-Type": "application/json" };
    if (adminToken.trim()) out.Authorization = `Bearer ${adminToken.trim()}`;
    return out;
  }, [adminToken]);

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
          <h2 className="text-sm font-semibold text-slate-200">AI přepínače</h2>
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
