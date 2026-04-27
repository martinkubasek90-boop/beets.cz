'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import {
  defaultBessAdminConfig,
  type BatteryScenario,
  type BessAdminConfig,
  type FveBessCalculatorDefaults,
  type PeakFrequency,
  type VoltageLevel,
} from '@/lib/bess-admin-config';

type IngestDiscoveryPayload = {
  error?: string;
  urls?: string[];
  totalUrls?: number;
};

type ModelPreview = {
  grossCapex: number;
  subsidyAmount: number;
  equityNeeded: number;
  annualProduction: number;
  annualSavings: number;
  annualExportRevenue: number;
  batteryBenefit: number;
  annualBenefit: number;
  simplePayback: number;
  selfConsumedEnergy: number;
  exportedEnergy: number;
  neededPeakCutKw: number;
  achievablePeakCutKw: number;
  shiftedSelfConsumptionKwh: number;
  shiftedVolatilityKwh: number;
};

const batteryScenarioOptions: BatteryScenario[] = [
  'Peak shaving',
  'Zvýšení vlastní spotřeby z FVE',
  'Ochrana proti volatilním cenám',
];
const voltageOptions: VoltageLevel[] = ['VN/VVN', 'NN'];
const peakFrequencyOptions: PeakFrequency[] = ['Pravidelně', 'Výjimečně'];

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return '-';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2).replace('.', ',')} mil. Kč`;
  return `${Math.round(value).toLocaleString('cs-CZ')} Kč`;
}

function formatNumber(value: number, digits = 0) {
  return Number(value || 0).toLocaleString('cs-CZ', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function calculateAdminPreview(config: BessAdminConfig): ModelPreview {
  const calc = config.calculatorDefaults;
  const tuning = config.modelTuning;
  const annualConsumptionKwh = calc.annualConsumptionMwh * 1000;
  const annualProduction = calc.pvSizeKwp * calc.annualYieldKwhPerKwp;
  const selfConsumedEnergy = Math.min(annualConsumptionKwh, annualProduction * (calc.baseSelfConsumptionPct / 100));
  const exportedEnergy = Math.max(0, annualProduction - selfConsumedEnergy);
  const purchasePrice = calc.powerPriceKwh + calc.distributionPriceKwh;
  const grossCapex = calc.pvSizeKwp * calc.pvCapexKwp + (calc.useBattery ? calc.batteryCapex : 0) + calc.otherCosts;
  const subsidyAmount = grossCapex * (calc.subsidyPct / 100);
  const equityNeeded = grossCapex - subsidyAmount;
  const annualSavings = selfConsumedEnergy * purchasePrice;
  const annualExportRevenue = exportedEnergy * calc.feedInPriceKwh;
  const neededPeakCutKw = Math.max(0, calc.highestPeakKw - calc.reservedCapacityKw);
  const achievablePeakCutKw = Math.min(calc.batteryPowerKw, neededPeakCutKw);
  const shiftedSelfConsumptionKwh = Math.min(
    exportedEnergy,
    calc.batteryCapacityKwh * tuning.batteryEfficiency * tuning.selfConsumptionCycles,
  );
  const shiftedVolatilityKwh = Math.min(
    annualConsumptionKwh * tuning.arbitrageConsumptionShare,
    calc.batteryCapacityKwh * tuning.batteryEfficiency * tuning.volatilityCycles,
  );
  const peakMonths = calc.peakFrequency === 'Pravidelně' ? tuning.regularPeakMonths : tuning.occasionalPeakMonths;
  const voltageCoefficient = calc.voltageLevel === 'VN/VVN' ? 1 : tuning.nnPeakRelevance;
  const scenarioBenefits: Record<BatteryScenario, number> = {
    'Peak shaving': achievablePeakCutKw * tuning.peakShavingValueKwMonth * peakMonths * voltageCoefficient,
    'Zvýšení vlastní spotřeby z FVE': shiftedSelfConsumptionKwh * (purchasePrice - calc.feedInPriceKwh),
    'Ochrana proti volatilním cenám': shiftedVolatilityKwh * calc.volatilitySpreadKwh,
  };
  const batteryBenefit = calc.useBattery ? scenarioBenefits[calc.batteryScenario] : 0;
  const annualBenefit = annualSavings + annualExportRevenue + batteryBenefit;

  return {
    grossCapex,
    subsidyAmount,
    equityNeeded,
    annualProduction,
    annualSavings,
    annualExportRevenue,
    batteryBenefit,
    annualBenefit,
    simplePayback: annualBenefit > 0 ? equityNeeded / annualBenefit : 99,
    selfConsumedEnergy,
    exportedEnergy,
    neededPeakCutKw,
    achievablePeakCutKw,
    shiftedSelfConsumptionKwh,
    shiftedVolatilityKwh,
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
  children: React.ReactNode;
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
      <div className="border-t border-slate-800 p-4 space-y-4">{children}</div>
    </details>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
      />
    </div>
  );
}

export default function KalkulackaAdminPage() {
  const [config, setConfig] = useState<BessAdminConfig>(defaultBessAdminConfig);
  const [adminToken, setAdminToken] = useState('');
  const [kbToken, setKbToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [embedHeight, setEmbedHeight] = useState(1900);
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
        if (active && response.ok && payload.config) setConfig(payload.config);
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
  const iframeEmbedCode = `<iframe src="${embedBaseUrl}" title="FVE + baterie kalkulačka" loading="lazy" style="width:100%;max-width:1200px;height:${embedHeight}px;border:0;border-radius:16px;overflow:hidden;" allow="clipboard-write"></iframe>`;
  const scriptEmbedCode = `<div id="beets-fve-bess-calculator"></div>
<script>
  (function () {
    var host = ${JSON.stringify(embedBaseUrl)};
    var target = document.getElementById('beets-fve-bess-calculator');
    if (!target) return;
    var iframe = document.createElement('iframe');
    iframe.src = host;
    iframe.title = 'FVE + baterie kalkulačka';
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

  const updateDefaults = <K extends keyof FveBessCalculatorDefaults>(key: K, value: FveBessCalculatorDefaults[K]) => {
    setConfig((prev) => ({
      ...prev,
      calculatorDefaults: {
        ...prev.calculatorDefaults,
        [key]: value,
      },
    }));
  };

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
      if (!response.ok) throw new Error(payload.error || 'Uložení selhalo.');
      if (payload.config) setConfig(payload.config);
      setStatus('Konfigurace byla uložena.');
    } catch (error: any) {
      setStatus(error?.message || 'Uložení selhalo.');
    } finally {
      setSaving(false);
    }
  };

  const resetToXlsxDefaults = () => {
    setConfig((prev) => ({
      ...defaultBessAdminConfig,
      assistant: prev.assistant,
      knowledge: prev.knowledge,
    }));
    setStatus('Nastaveny výchozí hodnoty z XLSX modelu. Nezapomeňte uložit.');
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
        if (!response.ok) throw new Error(payload.error || `Batch import selhal (index ${i}).`);
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
    setStatus(response.ok ? 'URL byla přidána do knowledge base.' : payload.error || 'URL ingest selhal.');
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
    setStatus(response.ok ? 'Textová znalost byla přidána do knowledge base.' : payload.error || 'Text ingest selhal.');
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
    setStatus(
      response.ok
        ? `Dokumenty byly přidány do KB. Zpracováno souborů: ${payload.processed ?? uploadFiles.length}.`
        : payload.error || 'File ingest selhal.',
    );
  };

  if (loading) return <div className="min-h-screen bg-slate-950 text-slate-200 p-6">Načítám admin konfiguraci...</div>;

  const calc = config.calculatorDefaults;
  const tuning = config.modelTuning;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Kalkulačka admin</h1>
          <p className="text-sm text-slate-400 mt-1">
            Editace aktuálního FVE + baterie modelu podle XLSX, chatbotu, knowledge base a embedu.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/kalkulacka" className="inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white">
              Otevřít kalkulačku
            </Link>
            <button type="button" onClick={resetToXlsxDefaults} className="rounded-lg bg-slate-800 hover:bg-slate-700 px-4 py-2 text-sm font-semibold">
              Vrátit XLSX defaulty
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-slate-200">Admin tokeny</h2>
            <label className="block text-xs text-slate-400">BESS_ADMIN_TOKEN (pro save config)</label>
            <input type="password" value={adminToken} onChange={(e) => setAdminToken(e.target.value)} className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm" />
            <label className="block text-xs text-slate-400">BESS_KB_ADMIN_TOKEN (pro KB ingest)</label>
            <input type="password" value={kbToken} onChange={(e) => setKbToken(e.target.value)} className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm" />
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2">
            <h2 className="text-sm font-semibold text-slate-200">Živý náhled modelu</h2>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500">Investice:</span> {formatCurrency(modelPreview.grossCapex)}</div>
              <div><span className="text-slate-500">Vlastní zdroje:</span> {formatCurrency(modelPreview.equityNeeded)}</div>
              <div><span className="text-slate-500">Roční výroba:</span> {formatNumber(modelPreview.annualProduction)} kWh</div>
              <div><span className="text-slate-500">Roční přínos:</span> {formatCurrency(modelPreview.annualBenefit)}</div>
              <div><span className="text-slate-500">Přínos baterie:</span> {formatCurrency(modelPreview.batteryBenefit)}</div>
              <div><span className="text-slate-500">Návratnost:</span> {formatNumber(modelPreview.simplePayback, 2)} let</div>
            </div>
          </div>
        </div>

        <AdminAccordionSection title="Kalkulačka - výchozí hodnoty z XLSX" description="Tyto hodnoty se načtou do veřejné kalkulačky při otevření." defaultOpen>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <NumberInput label="Velikost FVE (kWp)" value={calc.pvSizeKwp} onChange={(value) => updateDefaults('pvSizeKwp', value)} />
            <NumberInput label="Roční výroba (kWh/kWp/rok)" value={calc.annualYieldKwhPerKwp} onChange={(value) => updateDefaults('annualYieldKwhPerKwp', value)} />
            <NumberInput label="Vlastní spotřeba bez baterie (%)" value={calc.baseSelfConsumptionPct} onChange={(value) => updateDefaults('baseSelfConsumptionPct', value)} />
            <NumberInput label="Roční spotřeba (MWh)" value={calc.annualConsumptionMwh} onChange={(value) => updateDefaults('annualConsumptionMwh', value)} />
            <NumberInput label="Kapacita baterie (kWh)" value={calc.batteryCapacityKwh} onChange={(value) => updateDefaults('batteryCapacityKwh', value)} />
            <NumberInput label="Výkon baterie (kW)" value={calc.batteryPowerKw} onChange={(value) => updateDefaults('batteryPowerKw', value)} />
            <NumberInput label="Nejvyšší 15min špička (kW)" value={calc.highestPeakKw} onChange={(value) => updateDefaults('highestPeakKw', value)} />
            <NumberInput label="Rezervovaný příkon (kW)" value={calc.reservedCapacityKw} onChange={(value) => updateDefaults('reservedCapacityKw', value)} />
            <NumberInput label="Cenový spread / volatilita (Kč/kWh)" value={calc.volatilitySpreadKwh} step={0.1} onChange={(value) => updateDefaults('volatilitySpreadKwh', value)} />
            <NumberInput label="CAPEX FVE (Kč/kWp)" value={calc.pvCapexKwp} onChange={(value) => updateDefaults('pvCapexKwp', value)} />
            <NumberInput label="Dodatečný CAPEX baterie (Kč)" value={calc.batteryCapex} onChange={(value) => updateDefaults('batteryCapex', value)} />
            <NumberInput label="Další dodatečné náklady (Kč)" value={calc.otherCosts} onChange={(value) => updateDefaults('otherCosts', value)} />
            <NumberInput label="Silová část (Kč/kWh)" value={calc.powerPriceKwh} step={0.1} onChange={(value) => updateDefaults('powerPriceKwh', value)} />
            <NumberInput label="Distribuce (Kč/kWh)" value={calc.distributionPriceKwh} step={0.1} onChange={(value) => updateDefaults('distributionPriceKwh', value)} />
            <NumberInput label="Výkupní cena (Kč/kWh)" value={calc.feedInPriceKwh} step={0.1} onChange={(value) => updateDefaults('feedInPriceKwh', value)} />
            <NumberInput label="Dotace (%)" value={calc.subsidyPct} onChange={(value) => updateDefaults('subsidyPct', value)} />
          </div>

          <div className="grid sm:grid-cols-4 gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" checked={calc.useBattery} onChange={(e) => updateDefaults('useBattery', e.target.checked)} />
              Použít baterii
            </label>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Scénář baterie</label>
              <select value={calc.batteryScenario} onChange={(e) => updateDefaults('batteryScenario', e.target.value as BatteryScenario)} className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
                {batteryScenarioOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Napěťová hladina</label>
              <select value={calc.voltageLevel} onChange={(e) => updateDefaults('voltageLevel', e.target.value as VoltageLevel)} className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
                {voltageOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Frekvence špiček</label>
              <select value={calc.peakFrequency} onChange={(e) => updateDefaults('peakFrequency', e.target.value as PeakFrequency)} className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm">
                {peakFrequencyOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </div>
        </AdminAccordionSection>

        <AdminAccordionSection title="Modelové předpoklady pro scénáře" description="Hodnoty z pravé části XLSX tabulky.">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <NumberInput label="Round-trip účinnost baterie" value={tuning.batteryEfficiency} step={0.01} onChange={(value) => setConfig((prev) => ({ ...prev, modelTuning: { ...prev.modelTuning, batteryEfficiency: value } }))} />
            <NumberInput label="Cykly/rok - zvýšení vlastní spotřeby" value={tuning.selfConsumptionCycles} onChange={(value) => setConfig((prev) => ({ ...prev, modelTuning: { ...prev.modelTuning, selfConsumptionCycles: value } }))} />
            <NumberInput label="Cykly/rok - volatilita" value={tuning.volatilityCycles} onChange={(value) => setConfig((prev) => ({ ...prev, modelTuning: { ...prev.modelTuning, volatilityCycles: value } }))} />
            <NumberInput label="Podíl spotřeby pro arbitráž" value={tuning.arbitrageConsumptionShare} step={0.01} onChange={(value) => setConfig((prev) => ({ ...prev, modelTuning: { ...prev.modelTuning, arbitrageConsumptionShare: value } }))} />
            <NumberInput label="Hodnota peak shaving (Kč/kW/měsíc)" value={tuning.peakShavingValueKwMonth} onChange={(value) => setConfig((prev) => ({ ...prev, modelTuning: { ...prev.modelTuning, peakShavingValueKwMonth: value } }))} />
            <NumberInput label="Počet měsíců - pravidelně" value={tuning.regularPeakMonths} onChange={(value) => setConfig((prev) => ({ ...prev, modelTuning: { ...prev.modelTuning, regularPeakMonths: value } }))} />
            <NumberInput label="Počet měsíců - výjimečně" value={tuning.occasionalPeakMonths} onChange={(value) => setConfig((prev) => ({ ...prev, modelTuning: { ...prev.modelTuning, occasionalPeakMonths: value } }))} />
            <NumberInput label="Koeficient peak shaving pro NN" value={tuning.nnPeakRelevance} step={0.01} onChange={(value) => setConfig((prev) => ({ ...prev, modelTuning: { ...prev.modelTuning, nnPeakRelevance: value } }))} />
            <NumberInput label="Investiční horizont (roky)" value={tuning.projectLifetimeYears} onChange={(value) => setConfig((prev) => ({ ...prev, modelTuning: { ...prev.modelTuning, projectLifetimeYears: value } }))} />
          </div>
        </AdminAccordionSection>

        <AdminAccordionSection title="Chatbot a knowledge base" description="Zachované napojení na Memodo KB a textové znalosti.">
          <div className="grid lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="block text-xs text-slate-400">Uvítací zpráva</label>
              <textarea rows={3} value={config.assistant.welcomeMessage} onChange={(e) => setConfig((prev) => ({ ...prev, assistant: { ...prev.assistant, welcomeMessage: e.target.value } }))} className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm" />
              <label className="block text-xs text-slate-400">System prompt</label>
              <textarea rows={3} value={config.assistant.systemPrompt} onChange={(e) => setConfig((prev) => ({ ...prev, assistant: { ...prev.assistant, systemPrompt: e.target.value } }))} className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm" />
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={config.assistant.strictKnowledgeMode} onChange={(e) => setConfig((prev) => ({ ...prev, assistant: { ...prev.assistant, strictKnowledgeMode: e.target.checked } }))} />
                Striktní režim: bez citace neodpovídat
              </label>
            </div>
            <div className="space-y-3">
              <label className="block text-xs text-slate-400">Sitemap URL</label>
              <input value={config.knowledge.sitemapUrl} onChange={(e) => setConfig((prev) => ({ ...prev, knowledge: { ...prev.knowledge, sitemapUrl: e.target.value } }))} className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm" />
              <button type="button" onClick={importFromSitemap} disabled={importing} className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-2 text-sm font-medium">{importing ? 'Importuji URL...' : 'Načíst URL ze sitemapy do KB'}</button>
              <input value={singleUrl} onChange={(e) => setSingleUrl(e.target.value)} placeholder="Přidat jednu URL" className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm" />
              <button type="button" onClick={ingestSingleUrl} className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-2 text-sm font-medium">Přidat URL do KB</button>
              <input type="file" multiple onChange={(e) => setUploadFiles(e.target.files)} className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm" />
              <button type="button" onClick={ingestFiles} className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-2 text-sm font-medium">Nahrát dokumenty do KB</button>
            </div>
          </div>
          <div className="space-y-2">
            <input value={textLabel} onChange={(e) => setTextLabel(e.target.value)} placeholder="Název poznámky" className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm" />
            <textarea rows={4} value={freeText} onChange={(e) => setFreeText(e.target.value)} placeholder="Sem vložte interní instrukce nebo znalosti..." className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm" />
            <button type="button" onClick={ingestTextNote} className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-2 text-sm font-medium">Přidat text do KB</button>
          </div>
        </AdminAccordionSection>

        <AdminAccordionSection title="Embed skript pro externí weby" description="WordPress URL, iframe a JS embed na externí weby.">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs text-slate-400">WordPress URL embed</label>
              <button type="button" onClick={() => copyToClipboard(wordpressEmbedUrl, 'WordPress URL embed')} className="rounded-md bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-medium">Kopírovat URL</button>
            </div>
            <input readOnly value={wordpressEmbedUrl} className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-300" />
          </div>
          <div className="grid sm:grid-cols-[220px_1fr] gap-3 items-center">
            <label className="text-xs text-slate-400">Výška embedu (px)</label>
            <input type="number" min={900} max={2600} step={50} value={embedHeight} onChange={(e) => setEmbedHeight(Math.max(900, Math.min(2600, Number(e.target.value) || 1900)))} className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm" />
          </div>
          <textarea rows={4} readOnly value={iframeEmbedCode} className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-300" />
          <button type="button" onClick={() => copyToClipboard(iframeEmbedCode, 'IFRAME embed')} className="rounded-md bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-medium">Kopírovat iframe</button>
          <textarea rows={8} readOnly value={scriptEmbedCode} className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-300" />
          <button type="button" onClick={() => copyToClipboard(scriptEmbedCode, 'JS embed')} className="rounded-md bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-xs font-medium">Kopírovat JS embed</button>
        </AdminAccordionSection>

        <div className="flex items-center gap-3">
          <button type="button" onClick={saveConfig} disabled={saving} className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold">
            {saving ? 'Ukládám...' : 'Uložit konfiguraci'}
          </button>
          {status ? <p className="text-sm text-slate-300">{status}</p> : null}
        </div>
      </div>
    </div>
  );
}
