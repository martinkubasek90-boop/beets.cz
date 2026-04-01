'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { calculateSolarProject } from '@/components/fve/FveCalculator';
import { defaultFveAdminConfig, type FveAdminConfig } from '@/lib/fve-admin-config-shared';

function formatCurrency(value: number) {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} mil. Kč`;
  return `${Math.round(value).toLocaleString('cs-CZ')} Kč`;
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
      <div className="border-t border-slate-800 p-4">{children}</div>
    </details>
  );
}

export default function FveAdminPage() {
  const [config, setConfig] = useState<FveAdminConfig>(defaultFveAdminConfig);
  const [adminToken, setAdminToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState('');
  const [embedHeight, setEmbedHeight] = useState(1720);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch('/api/fve-kalkulacka/admin-config', { cache: 'no-store' });
        const payload = (await response.json().catch(() => ({}))) as { config?: FveAdminConfig };
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

  const modelPreview = useMemo(() => {
    const result = calculateSolarProject(config.calculatorDefaults);
    const tuning = config.modelTuning;
    const confidenceScore = Math.max(
      tuning.confidenceMin,
      Math.min(
        tuning.confidenceMax,
        Math.round(
          tuning.confidenceBaseScore +
            (config.calculatorDefaults.selfConsumptionPct >= tuning.confidenceSelfConsumptionHighThreshold
              ? tuning.confidenceSelfConsumptionHighBonus
              : config.calculatorDefaults.selfConsumptionPct >= tuning.confidenceSelfConsumptionMediumThreshold
                ? tuning.confidenceSelfConsumptionMediumBonus
                : tuning.confidenceSelfConsumptionLowBonus) +
            (config.calculatorDefaults.subsidyPct >= tuning.confidenceSubsidyHighThreshold
              ? tuning.confidenceSubsidyHighBonus
              : config.calculatorDefaults.subsidyPct > 0
                ? tuning.confidenceSubsidyLowBonus
                : 0) +
            (config.calculatorDefaults.powerPrice + config.calculatorDefaults.distributionPrice >= tuning.confidencePurchasePriceThreshold
              ? tuning.confidencePurchasePriceBonus
              : 0) +
            (config.calculatorDefaults.advancedSettings.capexPerKw <= tuning.confidenceCapexThreshold
              ? tuning.confidenceCapexBonus
              : 0) -
            (result.simplePayback > tuning.confidencePaybackHighPenaltyThreshold
              ? tuning.confidencePaybackHighPenalty
              : result.simplePayback > tuning.confidencePaybackMediumPenaltyThreshold
                ? tuning.confidencePaybackMediumPenalty
                : 0),
        ),
      ),
    );

    return {
      ...result,
      confidenceScore,
    };
  }, [config]);

  const embedBaseUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/fve-kalkulacka` : 'https://beets.cz/fve-kalkulacka';
  const iframeEmbedCode = `<iframe src="${embedBaseUrl}" title="FVE kalkulačka" loading="lazy" style="width:100%;max-width:1200px;height:${embedHeight}px;border:0;border-radius:16px;overflow:hidden;" allow="clipboard-write"></iframe>`;

  const saveConfig = async () => {
    setSaving(true);
    setStatus('');
    try {
      const response = await fetch('/api/fve-kalkulacka/admin-config', {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({ config }),
      });
      const payload = (await response.json().catch(() => ({}))) as { error?: string; config?: FveAdminConfig };
      if (!response.ok) {
        throw new Error(payload.error || 'Uložení selhalo.');
      }
      if (payload.config) setConfig(payload.config);
      setStatus('FVE konfigurace byla uložena.');
    } catch (error: any) {
      setStatus(error?.message || 'Uložení selhalo.');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(`${label} zkopírován do schránky.`);
    } catch {
      setStatus(`Nepodařilo se zkopírovat ${label.toLowerCase()}.`);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-slate-200 p-6">Načítám FVE admin konfiguraci...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">FVE kalkulačka admin</h1>
          <p className="text-sm text-slate-400 mt-1">Editace výchozích hodnot, lead modalu a embed kódu bez Supabase závislosti.</p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link
              href="/fve-kalkulacka"
              className="inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Otevřít kalkulačku
            </Link>
            <button
              type="button"
              onClick={saveConfig}
              disabled={saving}
              className="inline-flex items-center rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 text-sm font-semibold text-white"
            >
              {saving ? 'Ukládám...' : 'Uložit konfiguraci'}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">Admin token</h2>
          <label className="block text-xs text-slate-400">FVE_ADMIN_TOKEN</label>
          <input
            type="password"
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
            placeholder="Bearer token"
          />
          <p className="text-xs text-slate-500">
            Konfigurace se ukládá do `data/fve-admin-config.json`. Na serverless deployi bez persistentního disku se změny neudrží.
          </p>
        </div>

        <AdminAccordionSection
          title="Výchozí parametry kalkulačky"
          description="Tyto hodnoty se načtou při otevření veřejné FVE kalkulačky."
          defaultOpen
        >
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              ['systemSizeKw', 'Velikost FVE (kWp)'],
              ['annualProductionPerKw', 'Roční výroba (kWh/kWp/rok)'],
              ['selfConsumptionPct', 'Vlastní spotřeba (%)'],
              ['powerPrice', 'Silová cena (Kč/kWh)'],
              ['distributionPrice', 'Distribuce (Kč/kWh)'],
              ['sellPrice', 'Výkupní cena (Kč/kWh)'],
              ['subsidyPct', 'Dotace (%)'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs text-slate-400 mb-1">{label}</label>
                <input
                  type="number"
                  value={config.calculatorDefaults[key as keyof FveAdminConfig['calculatorDefaults']] as number}
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
            <div>
              <label className="block text-xs text-slate-400 mb-1">CAPEX / kWp</label>
              <input
                type="number"
                value={config.calculatorDefaults.advancedSettings.capexPerKw}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    calculatorDefaults: {
                      ...prev.calculatorDefaults,
                      advancedSettings: {
                        ...prev.calculatorDefaults.advancedSettings,
                        capexPerKw: Number(e.target.value),
                      },
                    },
                  }))
                }
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Dodatečné náklady</label>
              <input
                type="number"
                value={config.calculatorDefaults.advancedSettings.additionalCosts}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    calculatorDefaults: {
                      ...prev.calculatorDefaults,
                      advancedSettings: {
                        ...prev.calculatorDefaults.advancedSettings,
                        additionalCosts: Number(e.target.value),
                      },
                    },
                  }))
                }
                className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </AdminAccordionSection>

        <AdminAccordionSection
          title="Texty lead modalu"
          description="Obsah CTA modalu pro PDF a investiční posouzení."
          defaultOpen
        >
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              ['pdfTitle', 'PDF titul'],
              ['pdfSubtitle', 'PDF subtitle'],
              ['analysisTitle', 'Analýza titul'],
              ['analysisSubtitle', 'Analýza subtitle'],
              ['pdfSuccessTitle', 'PDF success titul'],
              ['analysisSuccessTitle', 'Analýza success titul'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs text-slate-400 mb-1">{label}</label>
                <input
                  value={config.leadCapture[key as keyof FveAdminConfig['leadCapture']]}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      leadCapture: {
                        ...prev.leadCapture,
                        [key]: e.target.value,
                      },
                    }))
                  }
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-2 gap-3 mt-3">
            {[
              ['pdfSuccessMessage', 'PDF success text'],
              ['analysisSuccessMessage', 'Analýza success text'],
              ['consentNote', 'Consent poznámka'],
            ].map(([key, label]) => (
              <div key={key} className={key === 'consentNote' ? 'sm:col-span-2' : ''}>
                <label className="block text-xs text-slate-400 mb-1">{label}</label>
                <textarea
                  rows={key === 'consentNote' ? 2 : 3}
                  value={config.leadCapture[key as keyof FveAdminConfig['leadCapture']]}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      leadCapture: {
                        ...prev.leadCapture,
                        [key]: e.target.value,
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
          title="Model tuning"
          description="Interní koeficienty a prahy modelu, podobně jako editovatelné parametry ve standalone python skriptu."
          defaultOpen
        >
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              ['riskPaybackLowYears', 'Nízké riziko do (let)'],
              ['riskPaybackMediumYears', 'Střední riziko do (let)'],
              ['confidenceBaseScore', 'Base confidence'],
              ['confidenceSelfConsumptionMediumThreshold', 'Self-consumption medium threshold'],
              ['confidenceSelfConsumptionHighThreshold', 'Self-consumption high threshold'],
              ['confidenceSelfConsumptionMediumBonus', 'Self-consumption medium bonus'],
              ['confidenceSelfConsumptionHighBonus', 'Self-consumption high bonus'],
              ['confidenceSelfConsumptionLowBonus', 'Self-consumption low bonus'],
              ['confidenceSubsidyLowBonus', 'Subsidy low bonus'],
              ['confidenceSubsidyHighThreshold', 'Subsidy high threshold'],
              ['confidenceSubsidyHighBonus', 'Subsidy high bonus'],
              ['confidencePurchasePriceThreshold', 'Purchase price threshold'],
              ['confidencePurchasePriceBonus', 'Purchase price bonus'],
              ['confidenceCapexThreshold', 'CAPEX threshold'],
              ['confidenceCapexBonus', 'CAPEX bonus'],
              ['confidencePaybackMediumPenaltyThreshold', 'Payback medium penalty threshold'],
              ['confidencePaybackHighPenaltyThreshold', 'Payback high penalty threshold'],
              ['confidencePaybackMediumPenalty', 'Payback medium penalty'],
              ['confidencePaybackHighPenalty', 'Payback high penalty'],
              ['confidenceMin', 'Confidence min'],
              ['confidenceMax', 'Confidence max'],
              ['lowSelfConsumptionHintThreshold', 'Hint low self-consumption threshold'],
              ['highCapexHintThreshold', 'Hint high CAPEX threshold'],
              ['highAdditionalCostsHintThreshold', 'Hint additional costs threshold'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="block text-xs text-slate-400 mb-1">{label}</label>
                <input
                  type="number"
                  value={config.modelTuning[key as keyof FveAdminConfig['modelTuning']] as number}
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

          <div className="mt-5 border-t border-slate-800 pt-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-3">Defaulty porovnávacího scénáře B</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                ['systemSizeKw', 'Velikost FVE B'],
                ['annualProductionPerKw', 'Roční výroba B'],
                ['selfConsumptionPct', 'Vlastní spotřeba B'],
                ['powerPrice', 'Silová cena B'],
                ['distributionPrice', 'Distribuce B'],
                ['sellPrice', 'Výkupní cena B'],
                ['subsidyPct', 'Dotace B'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className="block text-xs text-slate-400 mb-1">{label}</label>
                  <input
                    type="number"
                    value={config.modelTuning.compareDefaults[key as keyof FveAdminConfig['modelTuning']['compareDefaults']] as number}
                    onChange={(e) =>
                      setConfig((prev) => ({
                        ...prev,
                        modelTuning: {
                          ...prev.modelTuning,
                          compareDefaults: {
                            ...prev.modelTuning.compareDefaults,
                            [key]: Number(e.target.value),
                          },
                        },
                      }))
                    }
                    className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-slate-400 mb-1">CAPEX / kWp B</label>
                <input
                  type="number"
                  value={config.modelTuning.compareDefaults.advancedSettings.capexPerKw}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      modelTuning: {
                        ...prev.modelTuning,
                        compareDefaults: {
                          ...prev.modelTuning.compareDefaults,
                          advancedSettings: {
                            ...prev.modelTuning.compareDefaults.advancedSettings,
                            capexPerKw: Number(e.target.value),
                          },
                        },
                      },
                    }))
                  }
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Dodatečné náklady B</label>
                <input
                  type="number"
                  value={config.modelTuning.compareDefaults.advancedSettings.additionalCosts}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      modelTuning: {
                        ...prev.modelTuning,
                        compareDefaults: {
                          ...prev.modelTuning.compareDefaults,
                          advancedSettings: {
                            ...prev.modelTuning.compareDefaults.advancedSettings,
                            additionalCosts: Number(e.target.value),
                          },
                        },
                      },
                    }))
                  }
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </AdminAccordionSection>

        <AdminAccordionSection
          title="Model preview"
          description="Rychlá kontrola, jak vychází defaultní scénář po změně parametrů."
          defaultOpen
        >
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              ['Roční výroba', `${Math.round(modelPreview.annualProduction).toLocaleString('cs-CZ')} kWh`],
              ['Roční úspora', formatCurrency(modelPreview.annualSavings)],
              ['Roční přínos', formatCurrency(modelPreview.annualBenefit)],
              ['Návratnost', `${modelPreview.simplePayback.toFixed(1)} let`],
              ['Investice', formatCurrency(modelPreview.grossCapex)],
              ['Dotace', formatCurrency(modelPreview.subsidyAmount)],
              ['Vlastní zdroje', formatCurrency(modelPreview.equityNeeded)],
              ['Robustnost', `${modelPreview.confidenceScore} %`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="text-xs text-slate-400 mb-2">{label}</div>
                <div className="text-lg font-semibold text-white">{value}</div>
              </div>
            ))}
          </div>
        </AdminAccordionSection>

        <AdminAccordionSection
          title="Embed"
          description="Stejný styl vložení jako u BESS administrace."
        >
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Výška iframe (px)</label>
              <input
                type="number"
                value={embedHeight}
                onChange={(e) => setEmbedHeight(Number(e.target.value) || 1720)}
                className="w-full max-w-xs rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
              />
            </div>
            <textarea
              readOnly
              rows={5}
              value={iframeEmbedCode}
              className="w-full rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-slate-300"
            />
            <button
              type="button"
              onClick={() => copyToClipboard(iframeEmbedCode, 'Iframe embed')}
              className="rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2 text-sm font-semibold text-white"
            >
              Kopírovat iframe embed
            </button>
          </div>
        </AdminAccordionSection>

        {status ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">{status}</div>
        ) : null}
      </div>
    </div>
  );
}
