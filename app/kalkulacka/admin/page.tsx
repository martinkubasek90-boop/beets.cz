'use client';

import { useEffect, useMemo, useState } from 'react';
import { defaultBessAdminConfig, type BessAdminConfig } from '@/lib/bess-admin-config';

type IngestDiscoveryPayload = {
  error?: string;
  urls?: string[];
  totalUrls?: number;
};

export default function KalkulackaAdminPage() {
  const [config, setConfig] = useState<BessAdminConfig>(defaultBessAdminConfig);
  const [adminToken, setAdminToken] = useState('');
  const [kbToken, setKbToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [importing, setImporting] = useState(false);

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

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-slate-200 p-6">Načítám admin konfiguraci...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Kalkulačka admin</h1>
          <p className="text-sm text-slate-400 mt-1">Editace chatbotu, default parametrů kalkulačky a Memodo ingest.</p>
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
            {[0, 1, 2, 3].map((index) => (
              <div key={index}>
                <label className="block text-xs text-slate-400 mb-1">Quick action {index + 1}</label>
                <input
                  value={config.assistant.quickActions[index] || ''}
                  onChange={(e) => {
                    const next = [...config.assistant.quickActions];
                    next[index] = e.target.value;
                    setConfig((prev) => ({
                      ...prev,
                      assistant: { ...prev.assistant, quickActions: next.filter((item) => item.trim()) },
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

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
          <h2 className="text-sm font-semibold text-slate-200">Kalkulačka – výchozí hodnoty</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              ['Kapacita kWh', 'capacity'],
              ['Spotřeba MWh/rok', 'annualConsumption'],
              ['Cena elektřiny Kč/kWh', 'electricityPrice'],
              ['Dotace %', 'subsidyPct'],
              ['Úrok %', 'loanInterestRate'],
              ['Splatnost roky', 'loanTermYears'],
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
        </div>

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
