'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { defaultBessAdminConfig, type BessAdminConfig } from '@/lib/bess-admin-config';

type IngestDiscoveryPayload = {
  error?: string;
  urls?: string[];
  totalUrls?: number;
};

const utilizationProfiles = {
  stable: { label: 'Stabilní výnos', fcrShare: 0.8 },
  combined: { label: 'Kombinovaný', fcrShare: 0.5 },
  arbitrage: { label: 'Dynamická arbitráž', fcrShare: 0.0 },
} as const;

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} mil. Kč`;
  return `${Math.round(value).toLocaleString('cs-CZ')} Kč`;
}

function formatNumber(value: number, digits = 1) {
  return Number(value || 0).toLocaleString('cs-CZ', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function calculateAdminPreview(config: BessAdminConfig) {
  const calc = config.calculatorDefaults;
  const tuning = config.modelTuning;
  const profile = utilizationProfiles[calc.utilizationType];
  const capacityMWh = calc.capacity / 1000;
  const powerMW = capacityMWh;
  const batteryModules = capacityMWh * tuning.batteryCostPerMwh;
  const pcs = powerMW * tuning.pcsCostPerMw;
  const fixedCosts =
    tuning.gridConnectionCost +
    tuning.emsCost +
    tuning.engineeringCost +
    tuning.constructionCost +
    tuning.fireSafetyCost;
  const rawCapex = Math.round((batteryModules + pcs + fixedCosts) / 1000) * 1000;
  const effectiveCapex = rawCapex * (1 - calc.subsidyPct / 100);

  const fcrNetFactor = Math.max(0, 1 - tuning.aggregatorFeePercent / 100);
  const fcrRevenue = powerMW * 1000 * profile.fcrShare * 12 * calc.advancedSettings.fcrPrice * fcrNetFactor;
  const maxByConsumption = calc.annualConsumption * 1000 * 0.35;
  const maxByCycles = calc.capacity * tuning.cyclesPerYear;
  const usedEnergy = Math.min(maxByConsumption, maxByCycles);
  const arbitrageRevenue = usedEnergy * calc.advancedSettings.spread * tuning.roundtripEfficiency;
  const annualEnergyMWh = usedEnergy / 1000;
  const actualSelfConsumption = Math.min(annualEnergyMWh * 0.25, calc.annualConsumption * 0.1);
  const selfSavings = actualSelfConsumption * calc.electricityPrice * 1000;
  const grossRevenue = fcrRevenue + arbitrageRevenue + selfSavings;

  let annualLoanCost = 0;
  if (calc.financing === 'bank' && calc.loanSharePct > 0) {
    const loanAmount = rawCapex * (calc.loanSharePct / 100);
    const r = calc.loanInterestRate / 100;
    const n = calc.loanTermYears;
    annualLoanCost = r === 0 ? loanAmount / n : (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  const omCost = rawCapex * (calc.advancedSettings.omCosts / 100);
  const netRevenue = grossRevenue - omCost - annualLoanCost;
  const simplePayback = netRevenue > 0 ? effectiveCapex / netRevenue : 99;
  const horizon = Math.max(1, Math.round(tuning.projectLifetimeYears));
  const yearlyRevenues = Array.from({ length: horizon }, (_, i) => netRevenue * Math.pow(1 - calc.advancedSettings.degradation / 100, i));
  const totalProfit = yearlyRevenues.reduce((sum, yearRevenue) => sum + yearRevenue, 0) - effectiveCapex;
  const selfSavingsShare = grossRevenue > 0 ? (selfSavings / grossRevenue) * 100 : 0;
  const electricityPricePlusOne = actualSelfConsumption * 1000;

  return {
    profile,
    capacityMWh,
    powerMW,
    batteryModules,
    pcs,
    fixedCosts,
    rawCapex,
    effectiveCapex,
    fcrRevenue,
    maxByConsumption,
    maxByCycles,
    usedEnergy,
    arbitrageRevenue,
    actualSelfConsumption,
    selfSavings,
    grossRevenue,
    annualLoanCost,
    omCost,
    netRevenue,
    simplePayback,
    yearlyRevenues,
    totalProfit,
    selfSavingsShare,
    electricityPricePlusOne,
  };
}

function AdminAccordionSection({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: any;
}) {
  return (
    <details open={defaultOpen} className="group rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 p-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
          {description ? <p className="text-xs text-slate-400">{description}</p> : null}
        </div>
        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/60 text-slate-400 transition-transform group-open:rotate-180">
          <ChevronDown className="h-4 w-4" />
        </span>
      </summary>
      <div className="border-t border-slate-800 p-4">{children}</div>
    </details>
  );
}

export default function KalkulackaAdminPage() {
  const [config, setConfig] = useState<BessAdminConfig>(defaultBessAdminConfig);
  const [adminToken, setAdminToken] = useState('');
  const [kbToken, setKbToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [embedHeight, setEmbedHeight] = useState(1700);
  const [importing, setImporting] = useState(false);
  const [singleUrl, setSingleUrl] = useState('');
  const [freeText, setFreeText] = useState('');
  const [textLabel, setTextLabel] = useState('Interní poznámka');
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await fetch('/api/kalkulacka/admin-config', { cache: 'no-store' });
        const payload = (await response.json().catch(() => ({}))) as { config?: BessAdminConfig };
        if (active && response.ok && payload.config) {
          setConfig(payload.config);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  const adminHeaders = useMemo(() => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (adminToken.trim()) headers.Authorization = `Bearer ${adminToken.trim()}`;
    return headers;
  }, [adminToken]);

  const kbHeaders = useMemo(() => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (kbToken.trim()) headers.Authorization = `Bearer ${kbToken.trim()}`;
    return headers;
  }, [kbToken]);
  const modelPreview = useMemo(() => calculateAdminPreview(config), [config]);

  const embedBaseUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/kalkulacka` : 'https://beets.cz/kalkulacka';
  const wordpressEmbedUrl = `${embedBaseUrl}?embed=wordpress`;

  const iframeEmbedCode = `<iframe src="${embedBaseUrl}" title="BESS kalkulačka" loading="lazy" style="width:100%;max-width:1200px;height:${embedHeight}px;border:0;border-radius:16px;overflow:hidden;" allow="clipboard-write"></iframe>`;

  const scriptEmbedCode = `<div id="beets-bess-calculator"></div>
<script>
  (function () {
    var host = ${JSON.stringify(embedBaseUrl)};
    var target = document.getElementById('beets-bess-calculator');
    if (!target) return;
    var iframe = document.createElement('iframe');
    iframe.src = host;
    iframe.title = 'BESS kalkulačka';
    iframe.loading = 'lazy';
    iframe.style.width = '100%';
    iframe.style.maxWidth = '1200px';
    iframe.style.height = '${embedHeight}px';
    iframe.style.border = '0';
    iframe.style.borderRadius = '16px';
    iframe.style.overflow = 'hidden';
    target.appendChild(iframe);
  })();
</script>`;

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(`${label} zkopírován do schránky.`);
    } catch {
      setStatus(`Nepodařilo se zkopírovat ${label.toLowerCase()}.`);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setStatus('');
    try {
      const response = await fetch('/api/kalkulacka/admin-config', {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ config }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; config?: BessAdminConfig };
      if (!response.ok) {
        throw new Error(payload.error || 'Uložení selhalo.');
      }
      if (payload.config) setConfig(payload.config);
      setStatus('Konfigurace byla uložena.');
    } catch (error: any) {
      setStatus(error?.message || 'Uložení selhalo.');
    } finally {
      setSaving(false);
    }
  };

  const importFromSitemap = async () => {
    if (importing) return;
    setImporting(true);
    setStatus('');

    try {
      const discoveryResponse = await fetch('/api/bess-kb/ingest', {
        method: 'POST',
        headers: kbHeaders,
        body: JSON.stringify({
          namespace: 'bess',
          sitemapUrl: config.knowledge.sitemapUrl,
          discoverOnly: true,
          maxUrls: 3500,
        }),
      });

      const discoveryPayload = (await discoveryResponse.json().catch(() => ({}))) as IngestDiscoveryPayload;
      if (!discoveryResponse.ok || !discoveryPayload.urls?.length) {
        throw new Error(discoveryPayload.error || 'Sitemap nevrátila žádná URL.');
      }

      const urls = discoveryPayload.urls;
      const batchSize = 30;
      let processed = 0;

      for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        const response = await fetch('/api/bess-kb/ingest', {
          method: 'POST',
          headers: kbHeaders,
          body: JSON.stringify({
            namespace: 'bess',
            items: batch.map((url) => ({ type: 'url', url, label: url })),
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) {
          throw new Error(payload.error || `Batch import selhal (index ${i}).`);
        }

        processed += batch.length;
        setStatus(`Importuji Memodo URL: ${processed}/${urls.length}`);
      }

      setStatus(`Import dokončen. Zpracováno ${processed} URL.`);
    } catch (error: any) {
      setStatus(error?.message || 'Import selhal.');
    } finally {
      setImporting(false);
    }
  };

  const ingestSingleUrl = async () => {
    if (!singleUrl.trim()) return;
    setStatus('');
    const response = await fetch('/api/bess-kb/ingest', {
      method: 'POST',
      headers: kbHeaders,
      body: JSON.stringify({
        namespace: 'bess',
        items: [{ type: 'url', url: singleUrl.trim(), label: singleUrl.trim() }],
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setStatus(payload.error || 'URL ingest selhal.');
      return;
    }
    setStatus('URL byla přidána do knowledge base.');
  };

  const ingestTextNote = async () => {
    if (!freeText.trim()) return;
    setStatus('');
    const response = await fetch('/api/bess-kb/ingest', {
      method: 'POST',
      headers: kbHeaders,
      body: JSON.stringify({
        namespace: 'bess',
        items: [{ type: 'text', label: textLabel.trim() || 'Interní poznámka', text: freeText }],
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setStatus(payload.error || 'Text ingest selhal.');
      return;
    }
    setStatus('Textová znalost byla přidána do knowledge base.');
  };

  const ingestFiles = async () => {
    if (!uploadFiles?.length) return;
    setStatus('');
    const form = new FormData();
    form.set('namespace', 'bess');
    Array.from(uploadFiles).forEach((file) => form.append('files', file));

    const response = await fetch('/api/bess-kb/upload', {
      method: 'POST',
      headers: kbToken.trim() ? { Authorization: `Bearer ${kbToken.trim()}` } : undefined,
      body: form,
    });

    const payload = (await response.json().catch(() => ({}))) as { error?: string; processed?: number };
    if (!response.ok) {
      setStatus(payload.error || 'File ingest selhal.');
      return;
    }
    setStatus(`Dokumenty byly přidány do KB. Zpracováno souborů: ${payload.processed ?? uploadFiles.length}.`);
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-slate-200 p-6">Načítám admin konfiguraci...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Kalkulačka admin</h1>
          <p className="text-sm text-slate-400 mt-1">Editace chatbotu, default parametrů kalkulačky a Memodo ingest.</p>
          <div className="mt-3">
            <Link
              href="/kalkulacka"
              className="inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Otevřít kalkulačku
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-200">Admin tokeny</h2>
            <label className="block text-xs text-slate-400">BESS_ADMIN_TOKEN (pro save config)</label>
            <input
              type="password"
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
              placeholder="Bearer token"
            />
            <label className="block text-xs text-slate-400">BESS_KB_ADMIN_TOKEN (pro KB ingest)</label>
            <input
              type="password"
              value={kbToken}
              onChange={(e) => setKbToken(e.target.value)}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
              placeholder="Bearer token"
            />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-200">Memodo knowledge base</h2>
            <label className="block text-xs text-slate-400">Sitemap URL</label>
            <input
              value={config.knowledge.sitemapUrl}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  knowledge: { ...prev.knowledge, sitemapUrl: e.target.value },
                }))
              }
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={importFromSitemap}
              disabled={importing}
              className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-2 text-sm font-medium"
            >
              {importing ? 'Importuji URL...' : 'Načíst všechny URL ze sitemapy do KB'}
            </button>
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="block text-xs text-slate-400">Přidat jednu URL</label>
              <input
                value={singleUrl}
                onChange={(e) => setSingleUrl(e.target.value)}
                placeholder="https://www.memodo.cz/..."
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={ingestSingleUrl}
                className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-2 text-sm font-medium"
              >
                Přidat URL do KB
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="block text-xs text-slate-400">Nahrát dokumenty (PDF, TXT, MD, CSV, JSON, XML, HTML)</label>
              <input
                type="file"
                multiple
                onChange={(e) => setUploadFiles(e.target.files)}
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={ingestFiles}
                className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-2 text-sm font-medium"
              >
                Nahrát dokumenty do KB
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="block text-xs text-slate-400">Interní textová znalost</label>
              <input
                value={textLabel}
                onChange={(e) => setTextLabel(e.target.value)}
                placeholder="Název poznámky"
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
              />
              <textarea
                rows={4}
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                placeholder="Sem vložte interní instrukce nebo znalosti..."
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={ingestTextNote}
                className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-2 text-sm font-medium"
              >
                Přidat text do KB
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">Chatbot</h2>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Uvítací zpráva</label>
            <textarea
              rows={3}
              value={config.assistant.welcomeMessage}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  assistant: { ...prev.assistant, welcomeMessage: e.target.value },
                }))
              }
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">System prompt</label>
            <textarea
              rows={3}
              value={config.assistant.systemPrompt}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  assistant: { ...prev.assistant, systemPrompt: e.target.value },
                }))
              }
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div key={index}>
                <label className="block text-xs text-slate-400 mb-1">Quick action {index + 1}</label>
                <input
                  value={config.assistant.quickActions[index] || ''}
                  onChange={(e) => {
                    const next = [...config.assistant.quickActions];
                    next[index] = e.target.value;
                    setConfig((prev) => ({
                      ...prev,
                      assistant: { ...prev.assistant, quickActions: next },
                    }));
                  }}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div key={index}>
                <label className="block text-xs text-slate-400 mb-1">Krok konzultace {index + 1}</label>
                <input
                  value={config.assistant.guidanceSteps[index] || ''}
                  onChange={(e) => {
                    const next = [...config.assistant.guidanceSteps];
                    next[index] = e.target.value;
                    setConfig((prev) => ({
                      ...prev,
                      assistant: { ...prev.assistant, guidanceSteps: next },
                    }));
                  }}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={config.assistant.strictKnowledgeMode}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  assistant: { ...prev.assistant, strictKnowledgeMode: e.target.checked },
                }))
              }
            />
            Striktní režim: bez citace neodpovídat
          </label>
        </div>

        <AdminAccordionSection
          title="Kalkulačka – výchozí hodnoty"
          description="Defaultní vstupy pro veřejnou kalkulačku."
          defaultOpen
        >
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              ['Kapacita kWh', 'capacity'],
              ['Spotřeba MWh/rok', 'annualConsumption'],
              ['Cena elektřiny Kč/kWh', 'electricityPrice'],
              ['Dotace %', 'subsidyPct'],
              ['Úrok %', 'loanInterestRate'],
              ['Splatnost roky', 'loanTermYears'],
              ['Podíl úvěru %', 'loanSharePct'],
            ].map(([label, key]) => (
              <div key={key}>
                <label className="block text-xs text-slate-400 mb-1">{label}</label>
                <input
                  type="number"
                  value={config.calculatorDefaults[key as keyof BessAdminConfig['calculatorDefaults']] as number}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      calculatorDefaults: {
                        ...prev.calculatorDefaults,
                        [key]: Number(e.target.value),
                      },
                    }))
                  }
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Typ využití</label>
              <select
                value={config.calculatorDefaults.utilizationType}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    calculatorDefaults: {
                      ...prev.calculatorDefaults,
                      utilizationType: e.target.value as BessAdminConfig['calculatorDefaults']['utilizationType'],
                    },
                  }))
                }
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
              >
                <option value="stable">stable</option>
                <option value="combined">combined</option>
                <option value="arbitrage">arbitrage</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Investiční režim</label>
              <select
                value={config.calculatorDefaults.investmentMode}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    calculatorDefaults: {
                      ...prev.calculatorDefaults,
                      investmentMode: e.target.value as BessAdminConfig['calculatorDefaults']['investmentMode'],
                    },
                  }))
                }
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
              >
                <option value="conservative">conservative</option>
                <option value="realistic">realistic</option>
                <option value="dynamic">dynamic</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Financování</label>
              <select
                value={config.calculatorDefaults.financing}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    calculatorDefaults: {
                      ...prev.calculatorDefaults,
                      financing: e.target.value as BessAdminConfig['calculatorDefaults']['financing'],
                    },
                  }))
                }
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
              >
                <option value="own">own</option>
                <option value="bank">bank</option>
              </select>
            </div>
          </div>
        </AdminAccordionSection>

        <AdminAccordionSection
          title="Python model tuning (výpočetní jádro)"
          description="CAPEX, cykly, účinnost a další parametry napojené na model."
        >
          <p className="text-xs text-slate-400">
            Tyto parametry jsou napojené na výpočet CAPEX/FCR/arbitráže v kalkulačce.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              ['Battery cost / MWh (Kč)', 'batteryCostPerMwh'],
              ['PCS cost / MW (Kč)', 'pcsCostPerMw'],
              ['Grid connection (Kč)', 'gridConnectionCost'],
              ['EMS (Kč)', 'emsCost'],
              ['Engineering (Kč)', 'engineeringCost'],
              ['Construction (Kč)', 'constructionCost'],
              ['Fire safety (Kč)', 'fireSafetyCost'],
              ['Cycles / year', 'cyclesPerYear'],
              ['Roundtrip efficiency (0-1)', 'roundtripEfficiency'],
              ['Aggregator fee (%)', 'aggregatorFeePercent'],
              ['Project lifetime (years)', 'projectLifetimeYears'],
            ].map(([label, key]) => (
              <div key={key}>
                <label className="block text-xs text-slate-400 mb-1">{label}</label>
                <input
                  type="number"
                  step={key === 'roundtripEfficiency' ? '0.01' : '1'}
                  value={config.modelTuning[key as keyof BessAdminConfig['modelTuning']] as number}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      modelTuning: {
                        ...prev.modelTuning,
                        [key]: Number(e.target.value),
                      },
                    }))
                  }
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
        </AdminAccordionSection>

        <AdminAccordionSection
          title="Jak kalkulačka přesně funguje"
          description="Interní vysvětlení modelu a FAQ pro prezentaci ve firmě."
        >
          <div className="space-y-2">
            <p className="text-sm text-slate-400">
              Tohle je interní vysvětlení modelu pro prezentaci ve firmě. Vychází přímo z logiky v BESS kalkulačce a níže
              je živý příklad z aktuální admin konfigurace.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-1">
              <div className="text-xs uppercase tracking-wide text-slate-500">Výchozí scénář</div>
              <div className="text-lg font-semibold text-white">{utilizationProfiles[config.calculatorDefaults.utilizationType].label}</div>
              <div className="text-sm text-slate-400">
                {config.calculatorDefaults.capacity.toLocaleString('cs-CZ')} kWh • {config.calculatorDefaults.annualConsumption.toLocaleString('cs-CZ')} MWh/rok
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-1">
              <div className="text-xs uppercase tracking-wide text-slate-500">Roční čistý výnos</div>
              <div className="text-lg font-semibold text-emerald-400">{formatCurrency(modelPreview.netRevenue)}</div>
              <div className="text-sm text-slate-400">Po O&amp;M a po splátkách úvěru</div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-1">
              <div className="text-xs uppercase tracking-wide text-slate-500">Prostá návratnost</div>
              <div className="text-lg font-semibold text-blue-400">{formatNumber(modelPreview.simplePayback, 1)} let</div>
              <div className="text-sm text-slate-400">Čistý CAPEX / čistý výnos roku 1</div>
            </div>
          </div>

          <div className="grid xl:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">1. Jak se počítá investice</h3>
              <div className="space-y-2 text-sm text-slate-300">
                <p>
                  <span className="text-slate-500">Kapacita:</span> {formatNumber(modelPreview.capacityMWh, 2)} MWh
                  <span className="text-slate-500"> | Výkon:</span> {formatNumber(modelPreview.powerMW, 2)} MW
                </p>
                <p>
                  <span className="text-slate-500">Bateriové moduly:</span> {formatCurrency(modelPreview.batteryModules)}
                </p>
                <p>
                  <span className="text-slate-500">PCS:</span> {formatCurrency(modelPreview.pcs)}
                </p>
                <p>
                  <span className="text-slate-500">Fixní náklady:</span> {formatCurrency(modelPreview.fixedCosts)}
                </p>
                <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3 text-xs text-slate-300">
                  <div>Raw CAPEX = baterie + PCS + připojení + EMS + engineering + construction + fire safety</div>
                  <div className="mt-1 text-slate-500">
                    {formatCurrency(modelPreview.rawCapex)} = {formatCurrency(modelPreview.batteryModules)} + {formatCurrency(modelPreview.pcs)} + {formatCurrency(modelPreview.fixedCosts)}
                  </div>
                  <div className="mt-2">Čistý CAPEX po dotaci = Raw CAPEX × (1 − dotace)</div>
                  <div className="mt-1 text-slate-500">
                    {formatCurrency(modelPreview.effectiveCapex)} při dotaci {config.calculatorDefaults.subsidyPct} %
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">2. Jak se počítají roční výnosy</h3>
              <div className="space-y-2 text-sm text-slate-300">
                <p>
                  <span className="text-slate-500">FCR výnos:</span> {formatCurrency(modelPreview.fcrRevenue)}
                </p>
                <p>
                  <span className="text-slate-500">Arbitráž:</span> {formatCurrency(modelPreview.arbitrageRevenue)}
                </p>
                <p>
                  <span className="text-slate-500">Úspora z vlastní spotřeby:</span> {formatCurrency(modelPreview.selfSavings)}
                </p>
                <p>
                  <span className="text-slate-500">Hrubý výnos celkem:</span> {formatCurrency(modelPreview.grossRevenue)}
                </p>
                <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3 text-xs text-slate-300 space-y-1">
                  <div>
                    Využitelná energie = min(spotřeba × 35 %, kapacita × cykly/rok)
                  </div>
                  <div className="text-slate-500">
                    min({formatNumber(modelPreview.maxByConsumption, 0)} kWh, {formatNumber(modelPreview.maxByCycles, 0)} kWh) = {formatNumber(modelPreview.usedEnergy, 0)} kWh/rok
                  </div>
                  <div className="pt-1">
                    Úspora z ceny elektřiny se počítá jen z omezené části energie, ne z celého projektu.
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid xl:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">3. Co jde dolů z výnosu</h3>
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">O&amp;M</div>
                  <div className="mt-1 text-base font-semibold text-white">{formatCurrency(modelPreview.omCost)}</div>
                  <div className="mt-1 text-xs text-slate-500">{config.calculatorDefaults.advancedSettings.omCosts} % z raw CAPEX</div>
                </div>
                <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Splátka úvěru</div>
                  <div className="mt-1 text-base font-semibold text-white">{formatCurrency(modelPreview.annualLoanCost)}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {config.calculatorDefaults.financing === 'bank'
                      ? `${config.calculatorDefaults.loanSharePct} % úvěr, ${config.calculatorDefaults.loanInterestRate} % p.a., ${config.calculatorDefaults.loanTermYears} let`
                      : 'Vlastní kapitál, bez úvěru'}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Čistý výnos roku 1</div>
                  <div className="mt-1 text-base font-semibold text-emerald-400">{formatCurrency(modelPreview.netRevenue)}</div>
                  <div className="mt-1 text-xs text-slate-500">Hrubý výnos − O&amp;M − úvěr</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
              <h3 className="text-sm font-semibold text-white">4. Návratnost, degradace a dlouhodobý zisk</h3>
              <div className="space-y-2 text-sm text-slate-300">
                <p>
                  Prostá návratnost počítáme jako <span className="text-white">čistý CAPEX / čistý výnos roku 1</span>.
                </p>
                <p>
                  Degradace se promítá do dalších let přes faktor <span className="text-white">(1 − degradace)^rok</span>, takže ovlivňuje IRR a kumulovaný zisk, ale
                  ne přímo prostou návratnost.
                </p>
                <div className="rounded-lg bg-slate-900/80 border border-slate-800 p-3 text-xs text-slate-300 space-y-1">
                  <div>Rok 1 cashflow: {formatCurrency(modelPreview.yearlyRevenues[0] || 0)}</div>
                  <div>Rok 2 cashflow: {formatCurrency(modelPreview.yearlyRevenues[1] || 0)}</div>
                  <div>Rok 3 cashflow: {formatCurrency(modelPreview.yearlyRevenues[2] || 0)}</div>
                  <div className="pt-1 text-slate-500">
                    12letý kumulovaný zisk modelu: {formatCurrency(modelPreview.totalProfit)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <h3 className="text-sm font-semibold text-white mb-3">FAQ pro interní prezentaci</h3>
            <div className="space-y-3">
              <details className="group rounded-lg border border-slate-800 bg-slate-950/50 p-3" open>
                <summary className="cursor-pointer list-none text-sm font-medium text-slate-100">
                  Proč se někdy skoro nemění doba návratnosti, když změním cenu elektřiny?
                </summary>
                <p className="mt-2 text-sm text-slate-400 leading-6">
                  Protože v tomhle modelu není hlavní driver návratnosti cena silové elektřiny, ale hlavně FCR a arbitráž.
                  Úspora z ceny elektřiny vstupuje jen přes omezenou část energie určené pro vlastní spotřebu.
                  V aktuálním nastavení tvoří tato složka jen {formatNumber(modelPreview.selfSavingsShare, 1)} % hrubého ročního výnosu.
                  Změna ceny elektřiny o 1 Kč/kWh tedy přidá přibližně {formatCurrency(modelPreview.electricityPricePlusOne)} ročně, což nemusí být proti FCR a arbitráži zásadní.
                </p>
              </details>

              <details className="group rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <summary className="cursor-pointer list-none text-sm font-medium text-slate-100">
                  Co má na návratnost největší vliv?
                </summary>
                <p className="mt-2 text-sm text-slate-400 leading-6">
                  Typicky čistý CAPEX, dotace, využitelný roční throughput, spread arbitráže, FCR cena a struktura financování.
                  Oproti tomu malé změny ceny elektřiny nebo drobné změny degradace se víc projeví v dlouhodobém zisku a IRR než v prosté návratnosti roku 1.
                </p>
              </details>

              <details className="group rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <summary className="cursor-pointer list-none text-sm font-medium text-slate-100">
                  Proč dotace zkracuje návratnost hned, ale úvěr ji může naopak zhoršit?
                </summary>
                <p className="mt-2 text-sm text-slate-400 leading-6">
                  Dotace snižuje jmenovatel investice přímo na vstupu, takže čistý CAPEX padá okamžitě.
                  Úvěr naopak přidává roční anuitní splátku do cashflow roku 1, takže snižuje čistý výnos použitý pro výpočet návratnosti.
                  Úvěr ale může současně zlepšit equity IRR investora, protože snižuje vlastní vložený kapitál.
                </p>
              </details>

              <details className="group rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <summary className="cursor-pointer list-none text-sm font-medium text-slate-100">
                  Proč degradace baterie neprodlouží prostou návratnost tolik, jak čekáme?
                </summary>
                <p className="mt-2 text-sm text-slate-400 leading-6">
                  Prostá návratnost v kalkulačce vychází z cashflow prvního roku. Degradace je aplikovaná až do dalších let,
                  takže její dopad se víc propisuje do IRR a 12letého kumulovaného zisku než do headline čísla „návratnost“.
                </p>
              </details>

              <details className="group rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <summary className="cursor-pointer list-none text-sm font-medium text-slate-100">
                  Co přesně znamená „investiční robustnost“ a „riziko“ ve veřejné kalkulačce?
                </summary>
                <p className="mt-2 text-sm text-slate-400 leading-6">
                  Jsou to pomocné scoringové vrstvy pro rychlou orientaci. Riziko je odvozené hlavně z výsledné návratnosti.
                  Robustnost je heuristika navázaná na návratnost, typ využití, dotaci, cenu elektřiny a případně negativní cashflow.
                  Nejde o bankovní rating ani o plnohodnotný due diligence model.
                </p>
              </details>
            </div>
          </div>
        </AdminAccordionSection>

        <AdminAccordionSection
          title="Embed skript pro externí weby"
          description="WordPress URL, iframe a JS embed na externí weby."
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs text-slate-400">WordPress URL embed</label>
              <button
                type="button"
                onClick={() => copyToClipboard(wordpressEmbedUrl, 'WordPress URL embed')}
                className="rounded-md bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-medium"
              >
                Kopírovat URL
              </button>
            </div>
            <input
              readOnly
              value={wordpressEmbedUrl}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-300"
            />
            <p className="text-[11px] text-slate-500">
              Ve WordPressu vložte do Custom HTML bloku jako iframe src nebo použijte plugin pro iframe embed.
            </p>
          </div>
          <div className="grid sm:grid-cols-[220px_1fr] gap-3 items-center">
            <label className="text-xs text-slate-400">Výška embedu (px)</label>
            <input
              type="number"
              min={900}
              max={2600}
              step={50}
              value={embedHeight}
              onChange={(e) => setEmbedHeight(Math.max(900, Math.min(2600, Number(e.target.value) || 1700)))}
              className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs text-slate-400">IFRAME embed</label>
              <button
                type="button"
                onClick={() => copyToClipboard(iframeEmbedCode, 'IFRAME embed')}
                className="rounded-md bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-medium"
              >
                Kopírovat
              </button>
            </div>
            <textarea
              rows={4}
              readOnly
              value={iframeEmbedCode}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-300"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs text-slate-400">JS embed</label>
              <button
                type="button"
                onClick={() => copyToClipboard(scriptEmbedCode, 'JS embed')}
                className="rounded-md bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-medium"
              >
                Kopírovat
              </button>
            </div>
            <textarea
              rows={8}
              readOnly
              value={scriptEmbedCode}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-300"
            />
          </div>
        </AdminAccordionSection>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={saveConfig}
            disabled={saving}
            className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold"
          >
            {saving ? 'Ukládám...' : 'Uložit konfiguraci'}
          </button>
          {status ? <p className="text-sm text-slate-300">{status}</p> : null}
        </div>
      </div>
    </div>
  );
}
