'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { GitCompare, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';

type ScenarioInputs = {
  capacity: number;
  utilizationType: 'stable' | 'combined' | 'arbitrage';
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
};

type ScenarioResult = {
  simplePayback: number;
  irr: number;
  netRevenue: number;
  totalProfit: number;
  effectiveCapex: number;
  rawCapex: number;
};

function calcScenario(
  inputs: ScenarioInputs,
  profiles: Record<string, { fcrShare: number }>,
  capexMultiplier = 1,
): ScenarioResult {
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
  return { simplePayback, irr, netRevenue, totalProfit, effectiveCapex, rawCapex };
}

const profiles = {
  stable: { fcrShare: 0.8 },
  combined: { fcrShare: 0.5 },
  arbitrage: { fcrShare: 0.0 },
};

const utilizationLabels = { stable: 'Stabilní', combined: 'Kombinovaný', arbitrage: 'Arbitráž' };
const financingLabels = { own: 'Vlastní kapitál', bank: '50% úvěr' };

type ComparePanelProps = {
  scenarioA: {
    capacity?: number;
    financingType?: 'own' | 'bank';
    subsidyPct?: number;
    simplePayback: number;
    irr: number;
    netRevenue: number;
    totalProfit: number;
    effectiveCapex?: number;
    capex?: number;
  };
};

export default function ComparePanel({ scenarioA }: ComparePanelProps) {
  const [open, setOpen] = useState(false);
  const [scenarioB, setScenarioB] = useState<ScenarioInputs>({
    capacity: 500,
    utilizationType: 'combined',
    annualConsumption: 3000,
    electricityPrice: 4.5,
    financing: 'bank',
    loanInterestRate: 6,
    loanTermYears: 8,
    subsidyPct: 20,
    spread: 1.2,
    fcrPrice: 1900,
    degradation: 2,
    omCosts: 2.5,
  });

  const resultB = useMemo(() => calcScenario(scenarioB, profiles), [scenarioB]);
  const resultA = scenarioA;

  const formatCurrency = (v: number) =>
    v >= 1000000 ? `${(v / 1000000).toFixed(1)} mil. Kč` : `${Math.round(v).toLocaleString('cs-CZ')} Kč`;
  const paybackColor = (p: number) => (p <= 7 ? 'text-emerald-400' : p <= 10 ? 'text-blue-400' : p <= 12 ? 'text-amber-400' : 'text-red-400');

  const metrics = [
    { label: 'Čistý CAPEX', a: formatCurrency(resultA.effectiveCapex || resultA.capex || 0), b: formatCurrency(resultB.effectiveCapex) },
    { label: 'Roční výnos (rok 1)', a: formatCurrency(resultA.netRevenue), b: formatCurrency(resultB.netRevenue) },
    {
      label: 'Prostá návratnost',
      a: `${resultA.simplePayback.toFixed(1)} let`,
      b: `${resultB.simplePayback.toFixed(1)} let`,
      colorA: paybackColor(resultA.simplePayback),
      colorB: paybackColor(resultB.simplePayback),
    },
    { label: 'IRR', a: `${resultA.irr.toFixed(1)} %`, b: `${resultB.irr.toFixed(1)} %` },
    { label: '12letý zisk', a: formatCurrency(resultA.totalProfit), b: formatCurrency(resultB.totalProfit) },
  ];

  return (
    <div className="w-full min-w-0 bg-slate-900/50 border border-slate-800/50 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start sm:items-center justify-between gap-3 p-4 sm:p-5 hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <GitCompare className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-left">
            <div className="text-sm font-semibold text-white">Porovnání scénářů</div>
            <div className="text-xs text-slate-400">Porovnejte dvě konfigurace vedle sebe</div>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {open && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="border-t border-slate-800/50">
          <div className="p-4 sm:p-5 grid lg:grid-cols-2 gap-4 sm:gap-6">
            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white">A</div>
                <span className="text-sm font-semibold text-white">Scénář A (aktuální)</span>
              </div>
              <div className="space-y-1 text-xs text-slate-400">
                <div>
                  Kapacita: <span className="text-slate-200">{scenarioA.capacity?.toLocaleString('cs-CZ') || '—'} kWh</span>
                </div>
                <div>
                  Financování: <span className="text-slate-200">{financingLabels[scenarioA.financingType || 'own'] || '—'}</span>
                </div>
                <div>
                  Dotace: <span className="text-slate-200">{scenarioA.subsidyPct || 0} %</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/30 rounded-xl p-4 border border-purple-500/20 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-[10px] font-bold text-white">B</div>
                <span className="text-sm font-semibold text-white">Scénář B (upravte)</span>
              </div>
              {[
                { key: 'capacity', label: 'Kapacita', suffix: ' kWh', min: 200, max: 5000, step: 100, fmt: (v: number) => v.toLocaleString('cs-CZ') },
                { key: 'annualConsumption', label: 'Spotřeba', suffix: ' MWh', min: 100, max: 20000, step: 100, fmt: (v: number) => v.toLocaleString('cs-CZ') },
                { key: 'subsidyPct', label: 'Dotace', suffix: ' %', min: 0, max: 50, step: 5, fmt: (v: number) => v },
              ].map(({ key, label, suffix, min, max, step, fmt }) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">{label}</span>
                    <span className={key === 'subsidyPct' && (scenarioB.subsidyPct as number) > 0 ? 'text-emerald-400' : 'text-slate-200'}>
                      {fmt(scenarioB[key as keyof ScenarioInputs] as number)}
                      {suffix}
                    </span>
                  </div>
                  <Slider
                    value={[scenarioB[key as keyof ScenarioInputs] as number]}
                    onValueChange={([v]) => setScenarioB((p) => ({ ...p, [key]: v }))}
                    min={min}
                    max={max}
                    step={step}
                  />
                </div>
              ))}
              <div className="space-y-1">
                <span className="text-xs text-slate-400">Typ využití</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                  {Object.entries(utilizationLabels).map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setScenarioB((p) => ({ ...p, utilizationType: id as ScenarioInputs['utilizationType'] }))}
                      className={cn(
                        'text-xs py-1.5 rounded-lg border transition-colors',
                        scenarioB.utilizationType === id
                          ? 'border-purple-500/50 bg-purple-500/10 text-purple-400'
                          : 'border-slate-700/50 text-slate-400 hover:border-slate-600',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-slate-400">Financování</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  {[
                    { id: 'own', label: 'Vlastní' },
                    { id: 'bank', label: '50% úvěr' },
                  ].map((o) => (
                    <button
                      key={o.id}
                      onClick={() => setScenarioB((p) => ({ ...p, financing: o.id as ScenarioInputs['financing'] }))}
                      className={cn(
                        'text-xs py-1.5 rounded-lg border transition-colors',
                        scenarioB.financing === o.id
                          ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                          : 'border-slate-700/50 text-slate-400 hover:border-slate-600',
                      )}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-5 pb-5">
            <div className="bg-slate-800/20 rounded-xl border border-slate-700/30 overflow-x-auto">
              <div className="min-w-[560px]">
                <div className="grid grid-cols-3 text-xs font-semibold text-slate-400 bg-slate-800/50 px-4 py-2.5">
                  <span>Metrika</span>
                  <span className="text-center text-emerald-400">Scénář A</span>
                  <span className="text-center text-purple-400">Scénář B</span>
                </div>
                {metrics.map((m, i) => (
                  <div
                    key={i}
                    className={cn('grid grid-cols-3 px-4 py-2.5 border-t border-slate-800/50', i % 2 === 0 && 'bg-slate-800/10')}
                  >
                    <span className="text-slate-400 text-xs">{m.label}</span>
                    <span className={cn('text-center font-medium text-xs', m.colorA || 'text-slate-200')}>{m.a}</span>
                    <span className={cn('text-center font-medium text-xs', m.colorB || 'text-slate-200')}>{m.b}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
