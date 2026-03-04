'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import InputPanel from '@/components/bess/InputPanel';
import ResultsPanel from '@/components/bess/ResultsPanel';
import SensitivityChart from '@/components/bess/SensitivityChart';
import FinancingSection from '@/components/bess/FinancingSection';
import ComparePanel from '@/components/bess/ComparePanel';
import SocialProof from '@/components/bess/SocialProof';
import LeadCaptureModal from '@/components/bess/LeadCaptureModal';

const profiles = {
  stable: { fcrShare: 0.8, spread: 1.0, fcrPrice: 1900, degradation: 2 },
  combined: { fcrShare: 0.5, spread: 1.2, fcrPrice: 1900, degradation: 2 },
  arbitrage: { fcrShare: 0.0, spread: 1.5, fcrPrice: 1700, degradation: 2.2 },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const calculateProject = (inputs: {
  capacity: number;
  utilizationType: keyof typeof profiles;
  annualConsumption: number;
  electricityPrice: number;
  financing: 'own' | 'bank';
  loanInterestRate: number;
  loanTermYears: number;
  subsidyPct: number;
  spread: number;
  fcrPrice: number;
  degradation: number;
  omCosts: number;
  capexMultiplier?: number;
}) => {
  const {
    capacity,
    utilizationType,
    annualConsumption,
    electricityPrice,
    financing,
    loanInterestRate,
    loanTermYears,
    subsidyPct,
    spread,
    fcrPrice,
    degradation,
    omCosts,
    capexMultiplier = 1,
  } = inputs;
  const profile = profiles[utilizationType];
  const deg = degradation / 100;
  const omRate = omCosts / 100;
  const capacityMWh = capacity / 1000;
  const powerMW = capacityMWh;
  const batteryModules = capacityMWh * 6_000_000;
  const pcs = powerMW * 2_000_000;
  const fixedCosts = 4_000_000 + 1_500_000 + 1_500_000 + 2_000_000 + 1_000_000;
  const rawCapex = Math.round((batteryModules + pcs + fixedCosts) * capexMultiplier / 1000) * 1000;
  const effectiveCapex = rawCapex * (1 - subsidyPct / 100);
  const power = capacity;
  const fcrRevenue = power * profile.fcrShare * 12 * fcrPrice * 0.85;
  const maxByConsumption = annualConsumption * 1000 * 0.35;
  const maxByCycles = capacity * 300;
  const usedEnergy = Math.min(maxByConsumption, maxByCycles);
  const arbitrageRevenue = usedEnergy * spread;
  const annualEnergyMWh = usedEnergy / 1000;
  const actualSelfConsumption = Math.min(annualEnergyMWh * 0.25, annualConsumption * 0.1);
  const selfSavings = actualSelfConsumption * electricityPrice * 1000;
  const grossRevenue = fcrRevenue + arbitrageRevenue + selfSavings;

  let annualLoanCost = 0;
  if (financing === 'bank') {
    const loanAmount = rawCapex * 0.5;
    const r = loanInterestRate / 100;
    const n = loanTermYears;
    annualLoanCost = r === 0 ? loanAmount / n : (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  const omCostVal = rawCapex * omRate;
  const netRevenue = grossRevenue - omCostVal - annualLoanCost;
  const simplePayback = netRevenue > 0 ? effectiveCapex / netRevenue : 99;
  const yearlyRevenues = Array.from({ length: 12 }, (_, i) => netRevenue * Math.pow(1 - deg, i));
  const equityInvestment = financing === 'bank' ? effectiveCapex * 0.5 : effectiveCapex;

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
  const [capacity, setCapacity] = useState(500);
  const [utilizationType, setUtilizationType] = useState<keyof typeof profiles>('combined');
  const [annualConsumption, setAnnualConsumption] = useState(3000);
  const [electricityPrice, setElectricityPrice] = useState(4.5);
  const [investmentMode, setInvestmentMode] = useState<'conservative' | 'realistic' | 'dynamic'>('realistic');
  const [financing, setFinancing] = useState<'own' | 'bank'>('own');
  const [subsidyPct, setSubsidyPct] = useState(0);
  const [loanInterestRate, setLoanInterestRate] = useState(6);
  const [loanTermYears, setLoanTermYears] = useState(8);
  const [advancedSettings, setAdvancedSettings] = useState({
    spread: profiles.combined.spread,
    fcrPrice: profiles.combined.fcrPrice,
    degradation: profiles.combined.degradation,
    omCosts: 2.5,
    discountRate: 8,
  });
  const [modalType, setModalType] = useState<'pdf' | 'analysis' | null>(null);

  const calculations = useMemo(() => {
    const base = calculateProject({
      capacity,
      utilizationType,
      annualConsumption,
      electricityPrice,
      financing,
      loanInterestRate,
      loanTermYears,
      subsidyPct,
      spread: advancedSettings.spread,
      fcrPrice: advancedSettings.fcrPrice,
      degradation: advancedSettings.degradation,
      omCosts: advancedSettings.omCosts,
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
    subsidyPct,
    advancedSettings,
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
        subsidyPct,
        spread: Math.max(0.6, advancedSettings.spread + delta),
        fcrPrice: advancedSettings.fcrPrice,
        degradation: advancedSettings.degradation,
        omCosts: advancedSettings.omCosts,
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
    subsidyPct,
    advancedSettings,
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
        subsidyPct,
        spread: advancedSettings.spread,
        fcrPrice: advancedSettings.fcrPrice,
        degradation: advancedSettings.degradation,
        omCosts: advancedSettings.omCosts,
        capexMultiplier: 1 + delta,
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
    subsidyPct,
    advancedSettings,
  ]);

  const scenarioA = {
    ...calculations,
    capacity,
    financingType: financing,
    subsidyPct,
  };

  return (
    <div className="relative overflow-x-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.25),_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(59,130,246,0.2),_transparent_55%)]" />
      <div className="relative max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-16">
        <div className="flex flex-col gap-4 max-w-3xl">
          <motion.span
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-emerald-300/80"
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
          <p className="text-base sm:text-lg text-slate-300">
            Nastavte parametry projektu a během pár vteřin získáte modelované cash-flow, návratnost
            a investiční robustnost pro C&amp;I projekty v ČR.
          </p>
        </div>

        <div className="mt-8 grid lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="space-y-6">
            <InputPanel
              capacity={capacity}
              setCapacity={setCapacity}
              utilizationType={utilizationType}
              setUtilizationType={setUtilizationType}
              annualConsumption={annualConsumption}
              setAnnualConsumption={setAnnualConsumption}
              electricityPrice={electricityPrice}
              setElectricityPrice={setElectricityPrice}
              investmentMode={investmentMode}
              setInvestmentMode={setInvestmentMode}
              advancedSettings={advancedSettings}
              setAdvancedSettings={setAdvancedSettings}
              profiles={profiles}
            />

            <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-5 sm:p-6">
              <FinancingSection
                financing={financing}
                setFinancing={setFinancing}
                subsidyPct={subsidyPct}
                setSubsidyPct={setSubsidyPct}
                loanInterestRate={loanInterestRate}
                setLoanInterestRate={setLoanInterestRate}
                loanTermYears={loanTermYears}
                setLoanTermYears={setLoanTermYears}
              />
            </div>

            <ComparePanel scenarioA={scenarioA} />
          </div>

          <div className="space-y-6">
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
    </div>
  );
}
