'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import InputPanel from '@/components/fve/InputPanel';
import ResultsPanel from '@/components/fve/ResultsPanel';
import SensitivityChart from '@/components/fve/SensitivityChart';
import FinancingSection from '@/components/fve/FinancingSection';
import ComparePanel from '@/components/fve/ComparePanel';
import SocialProof from '@/components/fve/SocialProof';
import LeadCaptureModal from '@/components/fve/LeadCaptureModal';
import { defaultFveAdminConfig, type FveAdminConfig } from '@/lib/fve-admin-config';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

type AdvancedSettings = {
  capexPerKw: number;
  additionalCosts: number;
};

type SolarCalculationInput = {
  systemSizeKw: number;
  annualProductionPerKw: number;
  selfConsumptionPct: number;
  powerPrice: number;
  distributionPrice: number;
  sellPrice: number;
  subsidyPct: number;
  advancedSettings: AdvancedSettings;
};

export function calculateSolarProject(inputs: SolarCalculationInput) {
  const {
    systemSizeKw,
    annualProductionPerKw,
    selfConsumptionPct,
    powerPrice,
    distributionPrice,
    sellPrice,
    subsidyPct,
    advancedSettings,
  } = inputs;

  const annualProduction = systemSizeKw * annualProductionPerKw;
  const selfConsumedEnergy = annualProduction * (selfConsumptionPct / 100);
  const exportedEnergy = annualProduction - selfConsumedEnergy;
  const purchasePrice = powerPrice + distributionPrice;
  const grossCapex = systemSizeKw * advancedSettings.capexPerKw + advancedSettings.additionalCosts;
  const subsidyAmount = grossCapex * (subsidyPct / 100);
  const equityNeeded = grossCapex - subsidyAmount;
  const annualSavings = selfConsumedEnergy * purchasePrice;
  const annualExportRevenue = exportedEnergy * sellPrice;
  const annualBenefit = annualSavings + annualExportRevenue;
  const simplePayback = annualBenefit > 0 ? equityNeeded / annualBenefit : 99;

  return {
    annualProduction,
    selfConsumedEnergy,
    exportedEnergy,
    purchasePrice,
    grossCapex,
    subsidyAmount,
    equityNeeded,
    annualSavings,
    annualExportRevenue,
    annualBenefit,
    simplePayback,
  };
}

export default function FveCalculator() {
  const [adminConfig, setAdminConfig] = useState<FveAdminConfig>(defaultFveAdminConfig);
  const [systemSizeKw, setSystemSizeKw] = useState(defaultFveAdminConfig.calculatorDefaults.systemSizeKw);
  const [annualProductionPerKw, setAnnualProductionPerKw] = useState(defaultFveAdminConfig.calculatorDefaults.annualProductionPerKw);
  const [selfConsumptionPct, setSelfConsumptionPct] = useState(defaultFveAdminConfig.calculatorDefaults.selfConsumptionPct);
  const [powerPrice, setPowerPrice] = useState(defaultFveAdminConfig.calculatorDefaults.powerPrice);
  const [distributionPrice, setDistributionPrice] = useState(defaultFveAdminConfig.calculatorDefaults.distributionPrice);
  const [sellPrice, setSellPrice] = useState(defaultFveAdminConfig.calculatorDefaults.sellPrice);
  const [subsidyPct, setSubsidyPct] = useState(defaultFveAdminConfig.calculatorDefaults.subsidyPct);
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>({
    capexPerKw: defaultFveAdminConfig.calculatorDefaults.advancedSettings.capexPerKw,
    additionalCosts: defaultFveAdminConfig.calculatorDefaults.advancedSettings.additionalCosts,
  });
  const [modalType, setModalType] = useState<'pdf' | 'analysis' | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch('/api/fve-kalkulacka/admin-config', { cache: 'no-store' });
        const payload = (await response.json().catch(() => ({}))) as { config?: FveAdminConfig };
        if (!active || !response.ok || !payload.config) return;

        const next = payload.config;
        setAdminConfig(next);
        setSystemSizeKw(next.calculatorDefaults.systemSizeKw);
        setAnnualProductionPerKw(next.calculatorDefaults.annualProductionPerKw);
        setSelfConsumptionPct(next.calculatorDefaults.selfConsumptionPct);
        setPowerPrice(next.calculatorDefaults.powerPrice);
        setDistributionPrice(next.calculatorDefaults.distributionPrice);
        setSellPrice(next.calculatorDefaults.sellPrice);
        setSubsidyPct(next.calculatorDefaults.subsidyPct);
        setAdvancedSettings(next.calculatorDefaults.advancedSettings);
      } catch {
        // Keep local defaults when config endpoint is unavailable.
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  const calculations = useMemo(() => {
    const base = calculateSolarProject({
      systemSizeKw,
      annualProductionPerKw,
      selfConsumptionPct,
      powerPrice,
      distributionPrice,
      sellPrice,
      subsidyPct,
      advancedSettings,
    });

    const riskLevel: 'low' | 'medium' | 'high' =
      base.simplePayback <= 7 ? 'low' : base.simplePayback <= 10 ? 'medium' : 'high';

    let confidenceScore = 55;
    if (selfConsumptionPct >= 65) confidenceScore += 16;
    else if (selfConsumptionPct >= 45) confidenceScore += 10;
    else confidenceScore += 4;
    if (subsidyPct >= 20) confidenceScore += 10;
    else if (subsidyPct > 0) confidenceScore += 5;
    if (powerPrice + distributionPrice >= 5) confidenceScore += 8;
    if (advancedSettings.capexPerKw <= 25000) confidenceScore += 7;
    if (base.simplePayback > 12) confidenceScore -= 20;
    else if (base.simplePayback > 9) confidenceScore -= 10;

    return {
      ...base,
      riskLevel,
      confidenceScore: clamp(Math.round(confidenceScore), 35, 95),
    };
  }, [
    systemSizeKw,
    annualProductionPerKw,
    selfConsumptionPct,
    powerPrice,
    distributionPrice,
    sellPrice,
    subsidyPct,
    advancedSettings,
  ]);

  const electricitySensitivityData = useMemo(() => {
    const deltas = [-1, -0.5, 0, 0.5, 1];
    return deltas.map((delta) => {
      const scenario = calculateSolarProject({
        systemSizeKw,
        annualProductionPerKw,
        selfConsumptionPct,
        powerPrice: Math.max(0, powerPrice + delta),
        distributionPrice,
        sellPrice,
        subsidyPct,
        advancedSettings,
      });
      const label = `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`.replace('.', ',');
      return { delta: label, payback: scenario.simplePayback };
    });
  }, [
    systemSizeKw,
    annualProductionPerKw,
    selfConsumptionPct,
    powerPrice,
    distributionPrice,
    sellPrice,
    subsidyPct,
    advancedSettings,
  ]);

  const capexSensitivityData = useMemo(() => {
    const deltas = [-5000, -2500, 0, 2500, 5000];
    return deltas.map((delta) => {
      const scenario = calculateSolarProject({
        systemSizeKw,
        annualProductionPerKw,
        selfConsumptionPct,
        powerPrice,
        distributionPrice,
        sellPrice,
        subsidyPct,
        advancedSettings: {
          ...advancedSettings,
          capexPerKw: Math.max(10000, advancedSettings.capexPerKw + delta),
        },
      });
      const label = `${delta > 0 ? '+' : ''}${Math.round(delta).toLocaleString('cs-CZ')}`;
      return { delta: label, payback: scenario.simplePayback };
    });
  }, [
    systemSizeKw,
    annualProductionPerKw,
    selfConsumptionPct,
    powerPrice,
    distributionPrice,
    sellPrice,
    subsidyPct,
    advancedSettings,
  ]);

  const validationHints = useMemo(() => {
    const hints: string[] = [];

    if (selfConsumptionPct < 30) {
      hints.push('Nízký podíl vlastní spotřeby posouvá ekonomiku projektu více do závislosti na výkupní ceně.');
    }
    if (sellPrice > powerPrice + distributionPrice) {
      hints.push('Výkupní cena je vyšší než celková nákupní cena. Ověřte, zda vstup odpovídá reálné smlouvě.');
    }
    if (advancedSettings.capexPerKw > 30000) {
      hints.push('Vyšší CAPEX na kWp výrazně zhoršuje prostou návratnost menších instalací.');
    }
    if (advancedSettings.additionalCosts > 500000) {
      hints.push('Dodatečné náklady mají u menších FVE výrazný dopad na celkovou investici.');
    }

    return hints;
  }, [selfConsumptionPct, sellPrice, powerPrice, distributionPrice, advancedSettings.capexPerKw, advancedSettings.additionalCosts]);

  return (
    <div className="relative overflow-x-hidden w-full min-w-0 max-w-full">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(250,204,21,0.18),_transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(16,185,129,0.15),_transparent_50%)]" />
      <div className="relative w-full min-w-0 max-w-6xl mx-auto pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:px-6 lg:px-8 py-6 sm:py-16">
        <div className="flex flex-col gap-4 max-w-3xl text-center sm:text-left items-center sm:items-start">
          <motion.span
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center sm:justify-start gap-2 text-xs uppercase tracking-[0.3em] text-amber-200/80"
          >
            FVE Kalkulačka
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-4xl lg:text-5xl font-semibold text-white leading-tight"
          >
            Model návratnosti fotovoltaické elektrárny
          </motion.h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto sm:mx-0">
            Upravte základní parametry FVE a během pár vteřin získáte odhad investice, ročních úspor,
            výnosu z přetoků a prosté návratnosti podle dodaného modelu.
          </p>
        </div>

        <div className="mt-8 grid lg:grid-cols-[1.1fr_0.9fr] gap-6 w-full min-w-0">
          <div className="space-y-6 min-w-0 rounded-3xl border border-amber-500/15 bg-amber-500/[0.03] p-3 sm:p-4">
            <InputPanel
              systemSizeKw={systemSizeKw}
              setSystemSizeKw={(value) => setSystemSizeKw(clamp(Math.round(value), 50, 1000))}
              annualProductionPerKw={annualProductionPerKw}
              setAnnualProductionPerKw={(value) => setAnnualProductionPerKw(clamp(Math.round(value), 600, 1400))}
              selfConsumptionPct={selfConsumptionPct}
              setSelfConsumptionPct={(value) => setSelfConsumptionPct(clamp(Math.round(value), 0, 100))}
              powerPrice={powerPrice}
              setPowerPrice={(value) => setPowerPrice(clamp(Number(value.toFixed(1)), 0, 8))}
              distributionPrice={distributionPrice}
              setDistributionPrice={(value) => setDistributionPrice(clamp(Number(value.toFixed(1)), 0, 4))}
              sellPrice={sellPrice}
              setSellPrice={(value) => setSellPrice(clamp(Number(value.toFixed(1)), 0, 5))}
              advancedSettings={advancedSettings}
              setAdvancedSettings={setAdvancedSettings}
            />

            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-5 sm:p-6">
              <FinancingSection
                subsidyPct={subsidyPct}
                setSubsidyPct={(value) => setSubsidyPct(clamp(Math.round(value), 0, 80))}
                grossCapex={calculations.grossCapex}
                subsidyAmount={calculations.subsidyAmount}
                equityNeeded={calculations.equityNeeded}
              />
            </div>

            {validationHints.length > 0 ? (
              <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-300 mb-2">Kontrola vstupů</p>
                <div className="space-y-1.5">
                  {validationHints.map((hint) => (
                    <p key={hint} className="text-xs text-amber-100/90">
                      • {hint}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            <ComparePanel
              scenarioA={{
                systemSizeKw,
                selfConsumptionPct,
                subsidyPct,
                capexPerKw: advancedSettings.capexPerKw,
                annualBenefit: calculations.annualBenefit,
                simplePayback: calculations.simplePayback,
                grossCapex: calculations.grossCapex,
                equityNeeded: calculations.equityNeeded,
              }}
            />
          </div>

          <div className="space-y-6 min-w-0 rounded-3xl border border-emerald-500/15 bg-emerald-500/[0.03] p-3 sm:p-4">
            <ResultsPanel
              calculations={calculations}
              onRequestAnalysis={() => setModalType('analysis')}
              onDownloadPdf={() => setModalType('pdf')}
            />
            <SensitivityChart
              data={electricitySensitivityData}
              title="Citlivost návratnosti na cenu silové elektřiny"
              subtitle="Vliv změny silové části nákupu o ±1 Kč/kWh"
              tooltipLabel="Změna silové ceny"
            />
            <SensitivityChart
              data={capexSensitivityData}
              title="Citlivost návratnosti na CAPEX / kWp"
              subtitle="Vliv změny investičních nákladů o ±5 000 Kč/kWp"
              tooltipLabel="Změna CAPEX / kWp"
            />
          </div>
        </div>

        <SocialProof />
      </div>

      {modalType && (
        <LeadCaptureModal
          type={modalType}
          calculations={{
            netRevenue: calculations.annualBenefit,
            simplePayback: calculations.simplePayback,
            irr: 0,
          }}
          inputs={{ systemSizeKw }}
          leadCaptureConfig={adminConfig.leadCapture}
          onClose={() => setModalType(null)}
        />
      )}
    </div>
  );
}
