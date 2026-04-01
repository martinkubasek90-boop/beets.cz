'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { GitCompare, ChevronDown, ChevronUp } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

function calculateSolarProject(inputs: {
  systemSizeKw: number;
  annualProductionPerKw: number;
  selfConsumptionPct: number;
  powerPrice: number;
  distributionPrice: number;
  sellPrice: number;
  subsidyPct: number;
  advancedSettings: {
    capexPerKw: number;
    additionalCosts: number;
  };
}) {
  const annualProduction = inputs.systemSizeKw * inputs.annualProductionPerKw;
  const selfConsumedEnergy = annualProduction * (inputs.selfConsumptionPct / 100);
  const exportedEnergy = annualProduction - selfConsumedEnergy;
  const purchasePrice = inputs.powerPrice + inputs.distributionPrice;
  const grossCapex = inputs.systemSizeKw * inputs.advancedSettings.capexPerKw + inputs.advancedSettings.additionalCosts;
  const subsidyAmount = grossCapex * (inputs.subsidyPct / 100);
  const equityNeeded = grossCapex - subsidyAmount;
  const annualSavings = selfConsumedEnergy * purchasePrice;
  const annualExportRevenue = exportedEnergy * inputs.sellPrice;
  const annualBenefit = annualSavings + annualExportRevenue;
  const simplePayback = annualBenefit > 0 ? equityNeeded / annualBenefit : 99;

  return {
    grossCapex,
    equityNeeded,
    annualBenefit,
    simplePayback,
  };
}

type ComparePanelProps = {
  scenarioA: {
    systemSizeKw: number;
    selfConsumptionPct: number;
    subsidyPct: number;
    capexPerKw: number;
    annualBenefit: number;
    simplePayback: number;
    grossCapex: number;
    equityNeeded: number;
  };
  defaults: {
    systemSizeKw: number;
    annualProductionPerKw: number;
    selfConsumptionPct: number;
    powerPrice: number;
    distributionPrice: number;
    sellPrice: number;
    subsidyPct: number;
    advancedSettings: {
      capexPerKw: number;
      additionalCosts: number;
    };
  };
};

export default function ComparePanel({ scenarioA, defaults }: ComparePanelProps) {
  const [open, setOpen] = useState(false);
  const [scenarioB, setScenarioB] = useState(defaults);

  React.useEffect(() => {
    setScenarioB(defaults);
  }, [defaults]);

  const resultB = useMemo(() => calculateSolarProject(scenarioB), [scenarioB]);

  const formatCurrency = (value: number) =>
    Math.abs(value) >= 1_000_000 ? `${(value / 1_000_000).toFixed(2)} mil. Kč` : `${Math.round(value).toLocaleString('cs-CZ')} Kč`;

  const paybackColor = (value: number) => (value <= 7 ? 'text-emerald-400' : value <= 10 ? 'text-blue-400' : value <= 13 ? 'text-amber-400' : 'text-red-400');

  const metrics = [
    { label: 'Investiční náklady', a: formatCurrency(scenarioA.grossCapex), b: formatCurrency(resultB.grossCapex) },
    { label: 'Vlastní zdroje', a: formatCurrency(scenarioA.equityNeeded), b: formatCurrency(resultB.equityNeeded) },
    { label: 'Roční výnos', a: formatCurrency(scenarioA.annualBenefit), b: formatCurrency(resultB.annualBenefit) },
    {
      label: 'Prostá návratnost',
      a: `${scenarioA.simplePayback.toFixed(1)} let`,
      b: `${resultB.simplePayback.toFixed(1)} let`,
      colorA: paybackColor(scenarioA.simplePayback),
      colorB: paybackColor(resultB.simplePayback),
    },
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
            <div className="text-xs text-slate-400">Vedle sebe porovnáte dvě varianty FVE</div>
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
                  Velikost: <span className="text-slate-200">{scenarioA.systemSizeKw.toLocaleString('cs-CZ')} kWp</span>
                </div>
                <div>
                  Vlastní spotřeba: <span className="text-slate-200">{scenarioA.selfConsumptionPct} %</span>
                </div>
                <div>
                  Dotace: <span className="text-slate-200">{scenarioA.subsidyPct} %</span>
                </div>
                <div>
                  CAPEX / kWp: <span className="text-slate-200">{scenarioA.capexPerKw.toLocaleString('cs-CZ')} Kč</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/30 rounded-xl p-4 border border-purple-500/20 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center text-[10px] font-bold text-white">B</div>
                <span className="text-sm font-semibold text-white">Scénář B (upravte)</span>
              </div>
              {[
                { key: 'systemSizeKw', label: 'Velikost FVE', suffix: ' kWp', min: 50, max: 1000, step: 10, fmt: (v: number) => Math.round(v).toLocaleString('cs-CZ') },
                { key: 'selfConsumptionPct', label: 'Vlastní spotřeba', suffix: ' %', min: 0, max: 100, step: 1, fmt: (v: number) => Math.round(v) },
                { key: 'subsidyPct', label: 'Dotace', suffix: ' %', min: 0, max: 80, step: 1, fmt: (v: number) => Math.round(v) },
              ].map(({ key, label, suffix, min, max, step, fmt }) => (
                <div key={key} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">{label}</span>
                    <span className="text-slate-200">
                      {fmt(scenarioB[key as keyof typeof scenarioB] as number)}
                      {suffix}
                    </span>
                  </div>
                  <Slider
                    value={[scenarioB[key as keyof typeof scenarioB] as number]}
                    onValueChange={([v]) => setScenarioB((prev) => ({ ...prev, [key]: v }))}
                    min={min}
                    max={max}
                    step={step}
                  />
                </div>
              ))}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-400">CAPEX / kWp</span>
                  <span className="text-slate-200">{Math.round(scenarioB.advancedSettings.capexPerKw).toLocaleString('cs-CZ')} Kč</span>
                </div>
                <Slider
                  value={[scenarioB.advancedSettings.capexPerKw]}
                  onValueChange={([v]) =>
                    setScenarioB((prev) => ({
                      ...prev,
                      advancedSettings: { ...prev.advancedSettings, capexPerKw: v },
                    }))
                  }
                  min={15000}
                  max={40000}
                  step={500}
                />
              </div>
            </div>
          </div>

          <div className="px-4 sm:px-5 pb-5">
            <div className="overflow-hidden rounded-xl border border-slate-800/70">
              <table className="w-full text-sm">
                <thead className="bg-slate-900/70 text-slate-400">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Metrika</th>
                    <th className="text-right px-4 py-3 font-medium">Scénář A</th>
                    <th className="text-right px-4 py-3 font-medium">Scénář B</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/30">
                  {metrics.map((metric) => (
                    <tr key={metric.label}>
                      <td className="px-4 py-3 text-slate-300">{metric.label}</td>
                      <td className={cn('px-4 py-3 text-right text-white', metric.colorA)}>{metric.a}</td>
                      <td className={cn('px-4 py-3 text-right text-white', metric.colorB)}>{metric.b}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
