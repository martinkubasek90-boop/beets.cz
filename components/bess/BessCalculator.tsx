'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import InputPanel from '@/components/bess/InputPanel';
import ResultsPanel from '@/components/bess/ResultsPanel';
import SensitivityChart from '@/components/bess/SensitivityChart';
import FinancingSection from '@/components/bess/FinancingSection';
import ComparePanel from '@/components/bess/ComparePanel';
import SocialProof from '@/components/bess/SocialProof';
import LeadCaptureModal from '@/components/bess/LeadCaptureModal';
import BessAssistant from '@/components/bess/BessAssistant';
import {
  defaultBessAdminConfig,
  type BessAdminConfig,
  type BessModelTuning,
} from '@/lib/bess-admin-config';

const profiles = {
  stable: { fcrShare: 0.8, spread: 1.0, fcrPrice: 1900, degradation: 2 },
  combined: { fcrShare: 0.5, spread: 1.2, fcrPrice: 1900, degradation: 2 },
  arbitrage: { fcrShare: 0.0, spread: 1.5, fcrPrice: 1700, degradation: 2.2 },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
type UtilizationType = keyof typeof profiles;
type InvestmentMode = 'conservative' | 'realistic' | 'dynamic';
type FinancingType = 'own' | 'bank';

type AssistantPatch = Partial<{
  capacity: number;
  utilizationType: UtilizationType;
  annualConsumption: number;
  electricityPrice: number;
  investmentMode: InvestmentMode;
  financing: FinancingType;
  subsidyPct: number;
  loanInterestRate: number;
  loanTermYears: number;
  loanSharePct: number;
  spread: number;
  fcrPrice: number;
  degradation: number;
  omCosts: number;
}>;

const calculateProject = (inputs: {
  capacity: number;
  utilizationType: keyof typeof profiles;
  annualConsumption: number;
  electricityPrice: number;
  financing: 'own' | 'bank';
  loanInterestRate: number;
  loanTermYears: number;
  loanSharePct: number;
  subsidyPct: number;
  spread: number;
  fcrPrice: number;
  degradation: number;
  omCosts: number;
  capexMultiplier?: number;
  modelTuning: BessModelTuning;
}) => {
  const {
    capacity,
    utilizationType,
    annualConsumption,
    electricityPrice,
    financing,
    loanInterestRate,
    loanTermYears,
    loanSharePct,
    subsidyPct,
    spread,
    fcrPrice,
    degradation,
    omCosts,
    capexMultiplier = 1,
    modelTuning,
  } = inputs;
  const profile = profiles[utilizationType];
  const deg = degradation / 100;
  const omRate = omCosts / 100;
  const capacityMWh = capacity / 1000;
  const powerMW = capacityMWh;
  const batteryModules = capacityMWh * modelTuning.batteryCostPerMwh;
  const pcs = powerMW * modelTuning.pcsCostPerMw;
  const fixedCosts =
    modelTuning.gridConnectionCost +
    modelTuning.emsCost +
    modelTuning.engineeringCost +
    modelTuning.constructionCost +
    modelTuning.fireSafetyCost;
  const rawCapex = Math.round((batteryModules + pcs + fixedCosts) * capexMultiplier / 1000) * 1000;
  const effectiveCapex = rawCapex * (1 - subsidyPct / 100);
  const fcrNetFactor = Math.max(0, 1 - modelTuning.aggregatorFeePercent / 100);
  const fcrRevenue = powerMW * 1000 * profile.fcrShare * 12 * fcrPrice * fcrNetFactor;
  const maxByConsumption = annualConsumption * 1000 * 0.35;
  const maxByCycles = capacity * modelTuning.cyclesPerYear;
  const usedEnergy = Math.min(maxByConsumption, maxByCycles);
  const arbitrageRevenue = usedEnergy * spread * modelTuning.roundtripEfficiency;
  const annualEnergyMWh = usedEnergy / 1000;
  const actualSelfConsumption = Math.min(annualEnergyMWh * 0.25, annualConsumption * 0.1);
  const selfSavings = actualSelfConsumption * electricityPrice * 1000;
  const grossRevenue = fcrRevenue + arbitrageRevenue + selfSavings;

  let annualLoanCost = 0;
  if (financing === 'bank' && loanSharePct > 0) {
    const loanAmount = rawCapex * (loanSharePct / 100);
    const r = loanInterestRate / 100;
    const n = loanTermYears;
    annualLoanCost = r === 0 ? loanAmount / n : (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  const omCostVal = rawCapex * omRate;
  const netRevenue = grossRevenue - omCostVal - annualLoanCost;
  const simplePayback = netRevenue > 0 ? effectiveCapex / netRevenue : 99;
  const horizon = Math.max(1, Math.round(modelTuning.projectLifetimeYears));
  const yearlyRevenues = Array.from({ length: horizon }, (_, i) => netRevenue * Math.pow(1 - deg, i));
  const equityInvestment = financing === 'bank' ? effectiveCapex * (1 - loanSharePct / 100) : effectiveCapex;

  const calculateIRR = (cashFlows: number[], inv: number) => {
    if (inv <= 0) return 0;
    let irr = 0.1;
    for (let i = 0; i < 200; i += 1) {
      let npv = -inv;
      let dnpv = 0;
      for (let t = 0; t < cashFlows.length; t += 1) {
        npv += cashFlows[t] / Math.pow(1 + irr, t + 1);
        dnpv -= (t + 1) * cashFlows[t] / Math.pow(1 + irr, t + 2);
      }
      if (Math.abs(dnpv) < 1e-10) break;
      const ni = irr - npv / dnpv;
      if (Math.abs(ni - irr) < 0.00001) break;
      irr = ni;
    }
    return Math.max(0, Math.min(irr * 100, 80));
  };

  const irr = calculateIRR(yearlyRevenues, equityInvestment);
  const totalProfit = yearlyRevenues.reduce((s, r) => s + r, 0) - effectiveCapex;
  return { simplePayback, irr, netRevenue, totalProfit, capex: effectiveCapex, rawCapex };
};

export default function BessCalculator() {
  const [adminConfig, setAdminConfig] = useState<BessAdminConfig>(defaultBessAdminConfig);
  const [capacity, setCapacity] = useState(defaultBessAdminConfig.calculatorDefaults.capacity);
  const [utilizationType, setUtilizationType] = useState<UtilizationType>(
    defaultBessAdminConfig.calculatorDefaults.utilizationType,
  );
  const [annualConsumption, setAnnualConsumption] = useState(
    defaultBessAdminConfig.calculatorDefaults.annualConsumption,
  );
  const [electricityPrice, setElectricityPrice] = useState(
    defaultBessAdminConfig.calculatorDefaults.electricityPrice,
  );
  const [investmentMode, setInvestmentMode] = useState<InvestmentMode>(
    defaultBessAdminConfig.calculatorDefaults.investmentMode,
  );
  const [financing, setFinancing] = useState<FinancingType>(defaultBessAdminConfig.calculatorDefaults.financing);
  const [subsidyPct, setSubsidyPct] = useState(defaultBessAdminConfig.calculatorDefaults.subsidyPct);
  const [loanInterestRate, setLoanInterestRate] = useState(
    defaultBessAdminConfig.calculatorDefaults.loanInterestRate,
  );
  const [loanTermYears, setLoanTermYears] = useState(defaultBessAdminConfig.calculatorDefaults.loanTermYears);
  const [loanSharePct, setLoanSharePct] = useState(defaultBessAdminConfig.calculatorDefaults.loanSharePct);
  const [advancedSettings, setAdvancedSettings] = useState({
    spread: defaultBessAdminConfig.calculatorDefaults.advancedSettings.spread,
    fcrPrice: defaultBessAdminConfig.calculatorDefaults.advancedSettings.fcrPrice,
    degradation: defaultBessAdminConfig.calculatorDefaults.advancedSettings.degradation,
    omCosts: defaultBessAdminConfig.calculatorDefaults.advancedSettings.omCosts,
    discountRate: defaultBessAdminConfig.calculatorDefaults.advancedSettings.discountRate,
  });
  const [modalType, setModalType] = useState<'pdf' | 'analysis' | null>(null);

  useEffect(() => {
    let active = true;
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/kalkulacka/admin-config', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = (await response.json().catch(() => ({}))) as { config?: BessAdminConfig };
        if (!active || !payload.config) return;
        const next = payload.config;
        setAdminConfig(next);
        setCapacity(next.calculatorDefaults.capacity);
        setUtilizationType(next.calculatorDefaults.utilizationType);
        setAnnualConsumption(next.calculatorDefaults.annualConsumption);
        setElectricityPrice(next.calculatorDefaults.electricityPrice);
        setInvestmentMode(next.calculatorDefaults.investmentMode);
        setFinancing(next.calculatorDefaults.financing);
        setSubsidyPct(next.calculatorDefaults.subsidyPct);
        setLoanInterestRate(next.calculatorDefaults.loanInterestRate);
        setLoanTermYears(next.calculatorDefaults.loanTermYears);
        setLoanSharePct(next.calculatorDefaults.loanSharePct);
        setAdvancedSettings(next.calculatorDefaults.advancedSettings);
      } catch {
        // keep defaults when config API is unavailable
      }
    };
    void loadConfig();
    return () => {
      active = false;
    };
  }, []);

  const handleCapacityChange = (value: number) =>
    setCapacity(clamp(Math.round(value / 100) * 100, 200, 5000));
  const handleUtilizationTypeChange = (value: UtilizationType) => setUtilizationType(value);
  const handleAnnualConsumptionChange = (value: number) =>
    setAnnualConsumption(clamp(Math.round(value / 100) * 100, 100, 20000));
  const handleElectricityPriceChange = (value: number) =>
    setElectricityPrice(clamp(Number(value.toFixed(1)), 3, 8));
  const handleInvestmentModeChange = (value: InvestmentMode) => setInvestmentMode(value);
  const handleFinancingChange = (value: FinancingType) => setFinancing(value);
  const handleSubsidyChange = (value: number) => setSubsidyPct(clamp(Math.round(value / 5) * 5, 0, 50));
  const handleLoanInterestRateChange = (value: number) =>
    setLoanInterestRate(clamp(Number(value.toFixed(1)), 3, 10));
  const handleLoanTermYearsChange = (value: number) => setLoanTermYears(clamp(Math.round(value), 5, 12));
  const handleLoanSharePctChange = (value: number) => setLoanSharePct(clamp(Math.round(value), 10, 90));

  const applyAssistantPatch = (patch: AssistantPatch) => {
    if (patch.capacity !== undefined) setCapacity(clamp(Math.round(patch.capacity / 100) * 100, 200, 5000));
    if (patch.utilizationType) setUtilizationType(patch.utilizationType);
    if (patch.annualConsumption !== undefined) setAnnualConsumption(clamp(Math.round(patch.annualConsumption / 100) * 100, 100, 20000));
    if (patch.electricityPrice !== undefined) setElectricityPrice(clamp(patch.electricityPrice, 3, 8));
    if (patch.investmentMode) setInvestmentMode(patch.investmentMode);
    if (patch.financing) setFinancing(patch.financing);
    if (patch.subsidyPct !== undefined) setSubsidyPct(clamp(Math.round(patch.subsidyPct / 5) * 5, 0, 50));
    if (patch.loanInterestRate !== undefined) setLoanInterestRate(clamp(patch.loanInterestRate, 3, 10));
    if (patch.loanTermYears !== undefined) setLoanTermYears(clamp(Math.round(patch.loanTermYears), 5, 12));
    if (patch.loanSharePct !== undefined) setLoanSharePct(clamp(Math.round(patch.loanSharePct), 10, 90));
    if (
      patch.spread !== undefined ||
      patch.fcrPrice !== undefined ||
      patch.degradation !== undefined ||
      patch.omCosts !== undefined
    ) {
      setAdvancedSettings((prev) => ({
        ...prev,
        ...(patch.spread !== undefined ? { spread: clamp(patch.spread, 0.8, 2) } : {}),
        ...(patch.fcrPrice !== undefined ? { fcrPrice: clamp(Math.round(patch.fcrPrice / 50) * 50, 1500, 3000) } : {}),
        ...(patch.degradation !== undefined ? { degradation: clamp(patch.degradation, 1, 3) } : {}),
        ...(patch.omCosts !== undefined ? { omCosts: clamp(patch.omCosts, 2, 3) } : {}),
      }));
    }
  };

  const calculations = useMemo(() => {
    const base = calculateProject({
      capacity,
      utilizationType,
      annualConsumption,
      electricityPrice,
      financing,
      loanInterestRate,
      loanTermYears,
      loanSharePct,
      subsidyPct,
      spread: advancedSettings.spread,
      fcrPrice: advancedSettings.fcrPrice,
      degradation: advancedSettings.degradation,
      omCosts: advancedSettings.omCosts,
      modelTuning: adminConfig.modelTuning,
    });

    const riskLevel: 'low' | 'medium' | 'high' =
      base.simplePayback <= 7 ? 'low' : base.simplePayback <= 10 ? 'medium' : 'high';
    let confidenceScore = 90 - base.simplePayback * 4;
    if (utilizationType === 'stable') confidenceScore += 6;
    if (subsidyPct > 0) confidenceScore += 4;
    if (electricityPrice >= 6) confidenceScore += 3;
    if (base.netRevenue <= 0) confidenceScore -= 20;
    confidenceScore = clamp(Math.round(confidenceScore), 40, 95);

    return { ...base, riskLevel, confidenceScore };
  }, [
    capacity,
    utilizationType,
    annualConsumption,
    electricityPrice,
    financing,
    loanInterestRate,
    loanTermYears,
    loanSharePct,
    subsidyPct,
    advancedSettings,
    adminConfig.modelTuning,
  ]);

  const sensitivityData = useMemo(() => {
    const deltas = [-0.4, -0.2, 0, 0.2, 0.4];
    return deltas.map((delta) => {
      const scenario = calculateProject({
        capacity,
        utilizationType,
        annualConsumption,
        electricityPrice,
        financing,
        loanInterestRate,
        loanTermYears,
        loanSharePct,
        subsidyPct,
        spread: Math.max(0.6, advancedSettings.spread + delta),
        fcrPrice: advancedSettings.fcrPrice,
        degradation: advancedSettings.degradation,
        omCosts: advancedSettings.omCosts,
        modelTuning: adminConfig.modelTuning,
      });
      const label = delta === 0 ? '0' : `${delta > 0 ? '+' : ''}${delta.toFixed(1)}`.replace('.', ',');
      return { delta: label, payback: scenario.simplePayback };
    });
  }, [
    capacity,
    utilizationType,
    annualConsumption,
    electricityPrice,
    financing,
    loanInterestRate,
    loanTermYears,
    loanSharePct,
    subsidyPct,
    advancedSettings,
    adminConfig.modelTuning,
  ]);

  const capexSensitivityData = useMemo(() => {
    const deltas = [-0.2, -0.1, 0, 0.1, 0.2];
    return deltas.map((delta) => {
      const scenario = calculateProject({
        capacity,
        utilizationType,
        annualConsumption,
        electricityPrice,
        financing,
        loanInterestRate,
        loanTermYears,
        loanSharePct,
        subsidyPct,
        spread: advancedSettings.spread,
        fcrPrice: advancedSettings.fcrPrice,
        degradation: advancedSettings.degradation,
        omCosts: advancedSettings.omCosts,
        capexMultiplier: 1 + delta,
        modelTuning: adminConfig.modelTuning,
      });
      const label = `${delta > 0 ? '+' : ''}${Math.round(delta * 100)}%`;
      return { delta: label, payback: scenario.simplePayback };
    });
  }, [
    capacity,
    utilizationType,
    annualConsumption,
    electricityPrice,
    financing,
    loanInterestRate,
    loanTermYears,
    loanSharePct,
    subsidyPct,
    advancedSettings,
    adminConfig.modelTuning,
  ]);

  const scenarioA = {
    ...calculations,
    capacity,
    financingType: financing,
    subsidyPct,
    loanSharePct,
  };

  const validationHints = useMemo(() => {
    const hints: string[] = [];
    const maxArbitrageByConsumption = annualConsumption * 1000 * 0.35;
    const maxArbitrageByCycles = capacity * adminConfig.modelTuning.cyclesPerYear;
    if (maxArbitrageByConsumption < maxArbitrageByCycles * 0.55) {
      hints.push('Nízká spotřeba vůči kapacitě může snižovat reálně využitelnou arbitráž.');
    }
    if (financing === 'bank' && loanInterestRate >= 8) {
      hints.push('Vyšší úrok významně zatěžuje roční cashflow projektu.');
    }
    if (financing === 'bank' && loanSharePct >= 75) {
      hints.push('Vysoký podíl úvěru zvyšuje citlivost projektu na změny tržních podmínek.');
    }
    if (utilizationType === 'arbitrage' && advancedSettings.spread < 1.1) {
      hints.push('U čisté arbitráže je nízký spread citlivý na volatilitu trhu.');
    }
    return hints;
  }, [annualConsumption, capacity, financing, loanInterestRate, loanSharePct, utilizationType, advancedSettings.spread, adminConfig.modelTuning.cyclesPerYear]);

  return (
    <div className="relative overflow-x-hidden w-full min-w-0 max-w-full">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.25),_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(59,130,246,0.2),_transparent_55%)]" />
      <div className="relative w-full min-w-0 max-w-6xl mx-auto pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:px-6 lg:px-8 py-6 sm:py-16">
        <div className="flex flex-col gap-4 max-w-3xl text-center sm:text-left items-center sm:items-start">
          <motion.span
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center justify-center sm:justify-start gap-2 text-xs uppercase tracking-[0.3em] text-emerald-300/80"
          >
            BESS Kalkulačka
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-4xl lg:text-5xl font-semibold text-white leading-tight"
          >
            Ekonomický model pro bateriové úložiště energie
          </motion.h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto sm:mx-0">
            Nastavte parametry projektu a během pár vteřin získáte modelované cash-flow, návratnost
            a investiční robustnost pro C&amp;I projekty v ČR.
          </p>
        </div>

        <div className="mt-8 grid lg:grid-cols-[1.1fr_0.9fr] gap-6 w-full min-w-0">
          <div className="space-y-6 min-w-0 rounded-3xl border border-blue-500/15 bg-blue-500/[0.03] p-3 sm:p-4">
            <InputPanel
              capacity={capacity}
              setCapacity={handleCapacityChange}
              utilizationType={utilizationType}
              setUtilizationType={handleUtilizationTypeChange}
              annualConsumption={annualConsumption}
              setAnnualConsumption={handleAnnualConsumptionChange}
              electricityPrice={electricityPrice}
              setElectricityPrice={handleElectricityPriceChange}
              investmentMode={investmentMode}
              setInvestmentMode={handleInvestmentModeChange}
              advancedSettings={advancedSettings}
              setAdvancedSettings={setAdvancedSettings}
              profiles={profiles}
            />

            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-5 sm:p-6">
              <FinancingSection
                financing={financing}
                setFinancing={handleFinancingChange}
                subsidyPct={subsidyPct}
                setSubsidyPct={handleSubsidyChange}
                loanInterestRate={loanInterestRate}
                setLoanInterestRate={handleLoanInterestRateChange}
                loanTermYears={loanTermYears}
                setLoanTermYears={handleLoanTermYearsChange}
                loanSharePct={loanSharePct}
                setLoanSharePct={handleLoanSharePctChange}
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

            <ComparePanel scenarioA={scenarioA} />
          </div>

          <div className="space-y-6 min-w-0 rounded-3xl border border-emerald-500/15 bg-emerald-500/[0.03] p-3 sm:p-4">
            <ResultsPanel
              calculations={calculations}
              onRequestAnalysis={() => setModalType('analysis')}
              onDownloadPdf={() => setModalType('pdf')}
            />
            <SensitivityChart data={sensitivityData} />
            <SensitivityChart
              data={capexSensitivityData}
              title="Citlivost návratnosti na CAPEX"
              subtitle="Vliv změny investičních nákladů ±20 %"
              tooltipLabel="Změna CAPEX"
            />
          </div>
        </div>

        <SocialProof />
      </div>

      {modalType && (
        <LeadCaptureModal
          type={modalType}
          calculations={calculations}
          inputs={{ capacity }}
          onClose={() => setModalType(null)}
        />
      )}

      <BessAssistant
        context={{
          capacity,
          utilizationType,
          annualConsumption,
          electricityPrice,
          investmentMode,
          financing,
          subsidyPct,
          loanInterestRate,
          loanTermYears,
          loanSharePct,
          spread: advancedSettings.spread,
          fcrPrice: advancedSettings.fcrPrice,
          degradation: advancedSettings.degradation,
          omCosts: advancedSettings.omCosts,
        }}
        applyPatch={applyAssistantPatch}
        welcomeMessage={adminConfig.assistant.welcomeMessage}
        quickActions={adminConfig.assistant.quickActions}
        defaultSitemapUrl={adminConfig.knowledge.sitemapUrl}
      />
    </div>
  );
}
