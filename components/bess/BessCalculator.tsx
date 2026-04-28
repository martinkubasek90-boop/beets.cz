'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  BatteryCharging,
  CheckCircle2,
  FileText,
  Gauge,
  Info,
  LineChart,
  Receipt,
  RefreshCcw,
  Shield,
  SlidersHorizontal,
  SunMedium,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import LeadCaptureModal from '@/components/bess/LeadCaptureModal';
import {
  defaultBessAdminConfig,
  type BatteryScenario,
  type BessAdminConfig,
  type BessModelTuning,
  type FveBessCalculatorDefaults,
} from '@/lib/bess-admin-config';

type ModelState = FveBessCalculatorDefaults;

const DEFAULTS: ModelState = defaultBessAdminConfig.calculatorDefaults;

const scenarioCards: Array<{
  id: BatteryScenario;
  label: string;
  sublabel: string;
  icon: typeof Shield;
  color: 'blue' | 'emerald' | 'amber';
}> = [
  {
    id: 'Peak shaving',
    label: 'Peak shaving',
    sublabel: 'Seříznutí 15min špiček',
    icon: Shield,
    color: 'blue',
  },
  {
    id: 'Zvýšení vlastní spotřeby z FVE',
    label: 'Vlastní spotřeba',
    sublabel: 'Uložení přetoků z FVE',
    icon: BatteryCharging,
    color: 'emerald',
  },
  {
    id: 'Ochrana proti volatilním cenám',
    label: 'Volatilita',
    sublabel: 'Arbitráž cen elektřiny',
    icon: Activity,
    color: 'amber',
  },
];

const colorClasses = {
  blue: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
  emerald: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
  amber: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2).replace('.', ',')} mil. Kč`;
  return `${Math.round(value).toLocaleString('cs-CZ')} Kč`;
}

function formatNumber(value: number, digits = 0) {
  return value.toLocaleString('cs-CZ', { maximumFractionDigits: digits });
}

function calculateProject(input: ModelState, assumptions: BessModelTuning) {
  const annualConsumptionKwh = input.annualConsumptionMwh * 1000;
  const annualProduction = input.pvSizeKwp * input.annualYieldKwhPerKwp;
  const selfConsumedEnergy = Math.min(annualConsumptionKwh, annualProduction * (input.baseSelfConsumptionPct / 100));
  const exportedEnergy = Math.max(0, annualProduction - selfConsumedEnergy);
  const purchasePrice = input.powerPriceKwh + input.distributionPriceKwh;
  const grossCapex = input.pvSizeKwp * input.pvCapexKwp + (input.useBattery ? input.batteryCapex : 0) + input.otherCosts;
  const subsidyAmount = grossCapex * (input.subsidyPct / 100);
  const equityNeeded = grossCapex - subsidyAmount;
  const annualSavings = selfConsumedEnergy * purchasePrice;
  const annualExportRevenue = exportedEnergy * input.feedInPriceKwh;
  const neededPeakCutKw = Math.max(0, input.highestPeakKw - input.reservedCapacityKw);
  const achievablePeakCutKw = Math.min(input.batteryPowerKw, neededPeakCutKw);
  const shiftedSelfConsumptionKwh = Math.min(
    exportedEnergy,
    input.batteryCapacityKwh * assumptions.batteryEfficiency * assumptions.selfConsumptionCycles,
  );
  const shiftedVolatilityKwh = Math.min(
    annualConsumptionKwh * assumptions.arbitrageConsumptionShare,
    input.batteryCapacityKwh * assumptions.batteryEfficiency * assumptions.volatilityCycles,
  );
  const peakMonths =
    input.peakFrequency === 'Pravidelně'
      ? assumptions.regularPeakMonths
      : assumptions.occasionalPeakMonths;
  const voltageCoefficient = input.voltageLevel === 'VN/VVN' ? 1 : assumptions.nnPeakRelevance;
  const scenarioBenefits: Record<BatteryScenario, number> = {
    'Peak shaving':
      achievablePeakCutKw * assumptions.peakShavingValueKwMonth * peakMonths * voltageCoefficient,
    'Zvýšení vlastní spotřeby z FVE': shiftedSelfConsumptionKwh * (purchasePrice - input.feedInPriceKwh),
    'Ochrana proti volatilním cenám': shiftedVolatilityKwh * input.volatilitySpreadKwh,
  };
  const batteryBenefit = input.useBattery ? scenarioBenefits[input.batteryScenario] : 0;
  const annualBenefit = annualSavings + annualExportRevenue + batteryBenefit;
  const simplePayback = annualBenefit > 0 ? equityNeeded / annualBenefit : 99;
  const totalProfit = annualBenefit * assumptions.projectLifetimeYears - equityNeeded;
  const irr = equityNeeded > 0 ? Math.min(80, Math.max(0, (annualBenefit / equityNeeded) * 100)) : 0;
  const riskLevel: 'low' | 'medium' | 'high' = simplePayback <= 5 ? 'low' : simplePayback <= 8 ? 'medium' : 'high';
  const confidenceScore = clamp(
    Math.round(90 - simplePayback * 5 + (input.useBattery ? 5 : 0) + (input.subsidyPct > 0 ? 5 : 0)),
    35,
    95,
  );

  return {
    annualConsumptionKwh,
    annualProduction,
    selfConsumedEnergy,
    exportedEnergy,
    purchasePrice,
    grossCapex,
    subsidyAmount,
    equityNeeded,
    annualSavings,
    annualExportRevenue,
    batteryBenefit,
    annualBenefit,
    simplePayback,
    totalProfit,
    irr,
    riskLevel,
    confidenceScore,
    neededPeakCutKw,
    achievablePeakCutKw,
    shiftedSelfConsumptionKwh,
    shiftedVolatilityKwh,
    selfConsumptionIncrease: annualProduction > 0 ? shiftedSelfConsumptionKwh / annualProduction : 0,
    scenarioBenefits,
  };
}

function FieldLabel({ text, hint }: { text: string; hint: string }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <label className="text-sm font-medium text-slate-300">{text}</label>
      <span className="group relative cursor-help">
        <Info className="w-3.5 h-3.5 text-slate-500" />
        <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-64 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-slate-300 shadow-xl group-hover:block">
          {hint}
        </span>
      </span>
    </div>
  );
}

function SliderField({
  label,
  hint,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
        <FieldLabel text={label} hint={hint} />
        <span className="px-3 py-1 rounded-lg bg-slate-800 text-white font-semibold text-sm self-start sm:self-auto">
          {formatNumber(value, step < 1 ? 1 : 0)} {unit}
        </span>
      </div>
      <Slider value={[value]} onValueChange={([val]) => onChange(val)} min={min} max={max} step={step} className="py-2" />
      <div className="flex gap-3">
        <input
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(clamp(Number(event.target.value || 0), min, max))}
        />
        <span className="w-24 pt-2 text-right text-xs text-slate-500">
          {formatNumber(min, step < 1 ? 1 : 0)}-{formatNumber(max, step < 1 ? 1 : 0)}
        </span>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-300">
      {label}
      <div className="flex overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
        <input
          className="min-w-0 flex-1 bg-transparent px-3 py-2 text-white outline-none focus:bg-slate-800"
          type="number"
          min={0}
          value={value}
          onChange={(event) => onChange(Math.max(0, Number(event.target.value || 0)))}
        />
        <span className="flex items-center border-l border-slate-700 bg-slate-800 px-3 text-xs text-slate-400">{unit}</span>
      </div>
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-300">
      {label}
      <select
        className="h-10 rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-emerald-500"
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ResultCard({
  calculations,
  onRequestAnalysis,
  onDownloadPdf,
}: {
  calculations: ReturnType<typeof calculateProject>;
  onRequestAnalysis: () => void;
  onDownloadPdf: () => void;
}) {
  const statusConfig =
    calculations.simplePayback <= 5
      ? { color: 'emerald', label: 'Ekonomicky silný FVE + bateriový scénář', icon: CheckCircle2 }
      : calculations.simplePayback <= 8
        ? { color: 'blue', label: 'Projekt dává ekonomický smysl', icon: TrendingUp }
        : { color: 'amber', label: 'Projekt je citlivý na vstupní parametry', icon: Info };
  const statusTextClass =
    statusConfig.color === 'emerald'
      ? 'text-emerald-400'
      : statusConfig.color === 'blue'
        ? 'text-blue-400'
        : 'text-amber-400';
  const confidenceColor =
    calculations.confidenceScore >= 75 ? 'emerald' : calculations.confidenceScore >= 60 ? 'amber' : 'orange';
  const riskConfig = {
    low: { label: 'Nízké', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    medium: { label: 'Střední', color: 'text-amber-400', bg: 'bg-amber-500/20' },
    high: { label: 'Vyšší', color: 'text-red-400', bg: 'bg-red-500/20' },
  };

  return (
    <div className="w-full min-w-0 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden">
      <div className="px-5 pt-5 pb-3 text-center sm:text-left">
        <span className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700/50 text-xs text-slate-400">
          Model odpovídá dodanému XLSX: FVE, baterie, peak shaving, přetoky, dotace
        </span>
      </div>
      <div className="px-4 sm:px-5 pb-5">
        <div
          className={cn(
            'p-4 sm:p-6 rounded-xl border-2',
            statusConfig.color === 'emerald' && 'bg-emerald-500/5 border-emerald-500/30',
            statusConfig.color === 'blue' && 'bg-blue-500/5 border-blue-500/30',
            statusConfig.color === 'amber' && 'bg-amber-500/5 border-amber-500/30',
          )}
        >
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-4">
            <statusConfig.icon className={cn('w-5 h-5', statusTextClass)} />
            <span className={cn('text-xs sm:text-sm font-medium leading-snug', statusTextClass)}>
              {statusConfig.label}
            </span>
          </div>
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-2">Návratnost investice</p>
            <motion.div
              key={calculations.simplePayback}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-4xl sm:text-6xl font-bold text-white tracking-tight"
            >
              {calculations.simplePayback.toFixed(1).replace('.', ',')}
              <span className="text-xl sm:text-3xl font-normal text-slate-400 ml-2">let</span>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: 'Celkový roční přínos', value: formatCurrency(calculations.annualBenefit), icon: Wallet, accent: 'text-emerald-400' },
          { label: 'Roční výroba FVE', value: `${formatNumber(calculations.annualProduction)} kWh`, icon: SunMedium, accent: 'text-yellow-400' },
          { label: 'Přínos baterie', value: formatCurrency(calculations.batteryBenefit), icon: BatteryCharging, accent: 'text-blue-400' },
          { label: '12letý kum. výsledek', value: formatCurrency(calculations.totalProfit), icon: TrendingUp, accent: calculations.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400' },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={cn('w-4 h-4', accent)} />
              <span className="text-xs text-slate-400">{label}</span>
            </div>
            <p className="text-xl font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="px-4 sm:px-5 pb-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Investiční náklady', value: formatCurrency(calculations.grossCapex), accent: 'text-blue-400' },
          { label: 'Dotace', value: formatCurrency(calculations.subsidyAmount), accent: 'text-emerald-400' },
          { label: 'Vlastní zdroje', value: formatCurrency(calculations.equityNeeded), accent: 'text-amber-400' },
        ].map(({ label, value, accent }) => (
          <div key={label} className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/30">
            <div className="text-xs text-slate-400 mb-2">{label}</div>
            <div className={cn('text-lg font-semibold', accent)}>{value}</div>
          </div>
        ))}
      </div>

      <div className="px-4 sm:px-5 pb-5">
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Investiční robustnost</span>
            <span
              className={cn(
                'text-lg font-semibold',
                confidenceColor === 'emerald' && 'text-emerald-400',
                confidenceColor === 'amber' && 'text-amber-400',
                confidenceColor === 'orange' && 'text-orange-400',
              )}
            >
              {calculations.confidenceScore}%
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className={cn(
                'h-full rounded-full',
                confidenceColor === 'emerald' && 'bg-emerald-500',
                confidenceColor === 'amber' && 'bg-amber-500',
                confidenceColor === 'orange' && 'bg-orange-500',
              )}
              initial={{ width: 0 }}
              animate={{ width: `${calculations.confidenceScore}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <div className="mt-3 inline-flex px-2.5 py-1 rounded-lg text-sm font-medium bg-slate-900/70 border border-slate-700/50">
            <span
              className={cn(
                riskConfig[calculations.riskLevel].bg,
                riskConfig[calculations.riskLevel].color,
                'px-2.5 py-1 rounded-lg',
              )}
            >
              Index rizika: {riskConfig[calculations.riskLevel].label}
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 bg-slate-800/30 border-t border-slate-700/30 space-y-3">
        <button
          type="button"
          onClick={onDownloadPdf}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-slate-600 text-slate-300 hover:bg-slate-700/50 transition-colors text-sm"
        >
          <FileText className="w-4 h-4" />Stáhnout investiční shrnutí (PDF)
        </button>
        <Button
          onClick={onRequestAnalysis}
          className="w-full h-12 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-500/20"
        >
          <span className="text-sm sm:hidden">Získat posouzení zdarma</span>
          <span className="hidden sm:inline text-base">Získat nezávazné investiční posouzení zdarma</span>
          <ArrowRight className="w-4 h-4 ml-2 shrink-0" />
        </Button>
      </div>
    </div>
  );
}

function LineItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-800 py-2.5 last:border-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="text-right text-sm font-medium tabular-nums text-white">{value}</span>
    </div>
  );
}

export default function BessCalculator() {
  const [model, setModel] = useState<ModelState>(DEFAULTS);
  const [adminConfig, setAdminConfig] = useState<BessAdminConfig>(defaultBessAdminConfig);
  const [modalType, setModalType] = useState<'pdf' | 'analysis' | null>(null);
  const calculations = useMemo(() => calculateProject(model, adminConfig.modelTuning), [model, adminConfig.modelTuning]);

  useEffect(() => {
    let active = true;
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/kalkulacka/admin-config', { cache: 'no-store' });
        const payload = (await response.json().catch(() => ({}))) as { config?: BessAdminConfig };
        if (!active || !response.ok || !payload.config) return;
        setAdminConfig(payload.config);
        setModel(payload.config.calculatorDefaults);
      } catch {
        // Keep bundled defaults when admin config is unavailable.
      }
    };

    void loadConfig();
    return () => {
      active = false;
    };
  }, []);

  const setValue = <K extends keyof ModelState>(key: K, value: ModelState[K]) => {
    setModel((current) => ({ ...current, [key]: value }));
  };

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
            Ekonomický model FVE + bateriového úložiště
          </motion.h1>
          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto sm:mx-0">
            Původní kalkulačka zůstává ve stejném rozhraní. Výpočty jsou upravené podle dodaného
            XLSX modelu návratnosti pro FVE, baterii, peak shaving a volatilitu.
          </p>
        </div>

        <div className="mt-8 grid lg:grid-cols-[1.1fr_0.9fr] gap-6 w-full min-w-0">
          <div className="space-y-6 min-w-0 rounded-3xl border border-blue-500/15 bg-blue-500/[0.03] p-3 sm:p-4">
            <div className="w-full min-w-0 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-5 sm:p-6 space-y-6">
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-emerald-500 flex items-center justify-center">
                    <SunMedium className="w-5 h-5 text-slate-950" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Parametry FVE a baterie</h2>
                    <p className="text-xs text-slate-400">Vstupy podle dodaného modelu návratnosti</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModel(adminConfig.calculatorDefaults)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>

              <SliderField
                label="Velikost FVE"
                hint="Instalovaný výkon fotovoltaické elektrárny v kWp."
                value={model.pvSizeKwp}
                min={50}
                max={1000}
                step={10}
                unit="kWp"
                onChange={(value) => setValue('pvSizeKwp', value)}
              />
              <SliderField
                label="Roční výroba v ČR"
                hint="Předpokládaná výroba na 1 kWp. Excel default: 1 000 kWh/kWp/rok."
                value={model.annualYieldKwhPerKwp}
                min={700}
                max={1300}
                step={25}
                unit="kWh/kWp"
                onChange={(value) => setValue('annualYieldKwhPerKwp', value)}
              />
              <SliderField
                label="Podíl vlastní spotřeby bez baterie"
                hint="Část výroby FVE spotřebovaná přímo v objektu bez baterie."
                value={model.baseSelfConsumptionPct}
                min={0}
                max={100}
                step={1}
                unit="%"
                onChange={(value) => setValue('baseSelfConsumptionPct', value)}
              />
              <SliderField
                label="Roční spotřeba objektu"
                hint="Roční spotřeba slouží pro limity vlastní spotřeby a arbitráže."
                value={model.annualConsumptionMwh}
                min={10}
                max={2000}
                step={10}
                unit="MWh"
                onChange={(value) => setValue('annualConsumptionMwh', value)}
              />
            </div>

            <div className="w-full min-w-0 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-5 sm:p-6 space-y-6">
              <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
                    <BatteryCharging className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Bateriový scénář</h2>
                    <p className="text-xs text-slate-400">Vždy se počítá jeden aktivní scénář</p>
                  </div>
                </div>
                <label className="flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300">
                  <input
                    checked={model.useBattery}
                    className="h-4 w-4 accent-emerald-500"
                    type="checkbox"
                    onChange={(event) => setValue('useBattery', event.target.checked)}
                  />
                  Použít baterii
                </label>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {scenarioCards.map((type) => {
                  const Icon = type.icon;
                  const isSelected = model.batteryScenario === type.id;
                  return (
                    <motion.button
                      key={type.id}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={() => setValue('batteryScenario', type.id)}
                      className={cn(
                        'relative p-3 rounded-xl border-2 transition-all text-left',
                        isSelected
                          ? colorClasses[type.color]
                          : 'border-slate-700/50 bg-slate-800/30 text-slate-400 hover:border-slate-600',
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <Icon className={cn('w-5 h-5', isSelected ? 'text-current' : 'text-slate-500')} />
                          <div>
                            <div className="font-medium text-sm">{type.label}</div>
                            <div className="text-xs opacity-70">{type.sublabel}</div>
                          </div>
                        </div>
                        <span className="text-sm font-semibold">{formatCurrency(calculations.scenarioBenefits[type.id])}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField
                  label="Napěťová hladina"
                  value={model.voltageLevel}
                  options={['VN/VVN', 'NN']}
                  onChange={(value) => setValue('voltageLevel', value)}
                />
                <SelectField
                  label="Frekvence špiček"
                  value={model.peakFrequency}
                  options={['Pravidelně', 'Výjimečně']}
                  onChange={(value) => setValue('peakFrequency', value)}
                />
              </div>
              <SliderField
                label="Kapacita baterie"
                hint="Kapacita baterie v kWh."
                value={model.batteryCapacityKwh}
                min={50}
                max={2000}
                step={10}
                unit="kWh"
                onChange={(value) => setValue('batteryCapacityKwh', value)}
              />
              <SliderField
                label="Výkon baterie"
                hint="Výkon baterie v kW, pro peak shaving omezuje reálně seříznutelnou špičku."
                value={model.batteryPowerKw}
                min={25}
                max={4000}
                step={25}
                unit="kW"
                onChange={(value) => setValue('batteryPowerKw', value)}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberField
                  label="Nejvyšší 15min špička"
                  value={model.highestPeakKw}
                  unit="kW"
                  onChange={(value) => setValue('highestPeakKw', value)}
                />
                <NumberField
                  label="Rezervovaný příkon"
                  value={model.reservedCapacityKw}
                  unit="kW"
                  onChange={(value) => setValue('reservedCapacityKw', value)}
                />
              </div>
            </div>

            <div className="w-full min-w-0 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-5 sm:p-6 space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-800/50">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
                  <SlidersHorizontal className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Ekonomika projektu</h2>
                  <p className="text-xs text-slate-400">CAPEX, ceny elektřiny a dotace</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <NumberField label="CAPEX FVE" value={model.pvCapexKwp} unit="Kč/kWp" onChange={(value) => setValue('pvCapexKwp', value)} />
                <NumberField label="Dodatečný CAPEX baterie" value={model.batteryCapex} unit="Kč" onChange={(value) => setValue('batteryCapex', value)} />
                <NumberField label="Další dodatečné náklady" value={model.otherCosts} unit="Kč" onChange={(value) => setValue('otherCosts', value)} />
                <SliderField label="Dotace" hint="Podíl dotace z celkových investičních nákladů." value={model.subsidyPct} min={0} max={100} step={5} unit="%" onChange={(value) => setValue('subsidyPct', value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    label: 'Silová část',
                    value: model.powerPriceKwh,
                    setter: (value: number) => setValue('powerPriceKwh', value),
                    icon: Wallet,
                    max: 8,
                  },
                  {
                    label: 'Distribuce',
                    value: model.distributionPriceKwh,
                    setter: (value: number) => setValue('distributionPriceKwh', value),
                    icon: Receipt,
                    max: 4,
                  },
                  {
                    label: 'Výkupní cena',
                    value: model.feedInPriceKwh,
                    setter: (value: number) => setValue('feedInPriceKwh', value),
                    icon: Zap,
                    max: 5,
                  },
                ].map(({ label, value, setter, icon: Icon, max }) => (
                  <div key={label} className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-medium text-slate-300">{label}</span>
                    </div>
                    <div className="text-xl font-semibold text-white">
                      {value.toFixed(1).replace('.', ',')} <span className="text-sm text-slate-400">Kč/kWh</span>
                    </div>
                    <Slider value={[value]} onValueChange={([val]) => setter(val)} min={0} max={max} step={0.1} />
                  </div>
                ))}
              </div>
              <SliderField
                label="Cenový spread / volatilita"
                hint="Používá se pro scénář ochrany proti volatilním cenám."
                value={model.volatilitySpreadKwh}
                min={0}
                max={8}
                step={0.1}
                unit="Kč/kWh"
                onChange={(value) => setValue('volatilitySpreadKwh', value)}
              />
            </div>
          </div>

          <div className="space-y-6 min-w-0 rounded-3xl border border-emerald-500/15 bg-emerald-500/[0.03] p-3 sm:p-4">
            <ResultCard
              calculations={calculations}
              onRequestAnalysis={() => setModalType('analysis')}
              onDownloadPdf={() => setModalType('pdf')}
            />
            <div className="w-full min-w-0 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-5 sm:p-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-800/50">
                <LineChart className="w-5 h-5 text-emerald-400" />
                <div>
                  <h2 className="text-lg font-semibold text-white">Výstup modelu</h2>
                  <p className="text-xs text-slate-400">Hodnoty odpovídající XLSX tabulce</p>
                </div>
              </div>
              <div className="pt-3">
                <LineItem label="Roční úspora z přímé spotřeby FVE" value={formatCurrency(calculations.annualSavings)} />
                <LineItem label="Roční výnosy z přetoků FVE" value={formatCurrency(calculations.annualExportRevenue)} />
                <LineItem label="Roční přínos baterie dle scénáře" value={formatCurrency(calculations.batteryBenefit)} />
                <LineItem label="Celkový roční přínos" value={formatCurrency(calculations.annualBenefit)} />
                <LineItem label="Očekávané vlastní zdroje" value={formatCurrency(calculations.equityNeeded)} />
              </div>
            </div>
            <div className="w-full min-w-0 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-5 sm:p-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-800/50">
                <Gauge className="w-5 h-5 text-blue-400" />
                <div>
                  <h2 className="text-lg font-semibold text-white">Pomocné výpočty</h2>
                  <p className="text-xs text-slate-400">Kontrolní hodnoty modelu</p>
                </div>
              </div>
              <div className="pt-3">
                <LineItem label="Roční spotřeba" value={`${formatNumber(calculations.annualConsumptionKwh)} kWh`} />
                <LineItem label="Základní vlastní spotřeba FVE" value={`${formatNumber(calculations.selfConsumedEnergy)} kWh`} />
                <LineItem label="Přetoky FVE bez baterie" value={`${formatNumber(calculations.exportedEnergy)} kWh`} />
                <LineItem label="Potřebné seříznutí špičky" value={`${formatNumber(calculations.neededPeakCutKw)} kW`} />
                <LineItem label="Reálně seříznutelné špičky baterií" value={`${formatNumber(calculations.achievablePeakCutKw)} kW`} />
                <LineItem label="Energie posunutá baterií - self-consumption" value={`${formatNumber(calculations.shiftedSelfConsumptionKwh)} kWh`} />
                <LineItem label="Energie posunutá baterií - volatilita" value={`${formatNumber(calculations.shiftedVolatilityKwh)} kWh`} />
                <LineItem label="Zvýšení vlastní spotřeby díky baterii" value={`${formatNumber(calculations.selfConsumptionIncrease * 100, 1)} %`} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {modalType ? (
        <LeadCaptureModal
          type={modalType}
          calculatorType="fve"
          calculations={{
            simplePayback: calculations.simplePayback,
            netRevenue: calculations.annualBenefit,
            irr: calculations.irr,
            annualProduction: calculations.annualProduction,
            annualSavings: calculations.annualSavings,
            annualExportRevenue: calculations.annualExportRevenue,
            batteryBenefit: calculations.batteryBenefit,
            annualBenefit: calculations.annualBenefit,
            grossCapex: calculations.grossCapex,
            subsidyAmount: calculations.subsidyAmount,
            equityNeeded: calculations.equityNeeded,
            selfConsumedEnergy: calculations.selfConsumedEnergy,
            exportedEnergy: calculations.exportedEnergy,
            neededPeakCutKw: calculations.neededPeakCutKw,
            achievablePeakCutKw: calculations.achievablePeakCutKw,
            shiftedSelfConsumptionKwh: calculations.shiftedSelfConsumptionKwh,
            shiftedVolatilityKwh: calculations.shiftedVolatilityKwh,
          }}
          inputs={{
            capacity: model.batteryCapacityKwh,
            systemSizeKw: model.pvSizeKwp,
            annualConsumptionMwh: model.annualConsumptionMwh,
            useBattery: model.useBattery,
            batteryPowerKw: model.batteryPowerKw,
            batteryScenario: model.batteryScenario,
            voltageLevel: model.voltageLevel,
            peakFrequency: model.peakFrequency,
            powerPriceKwh: model.powerPriceKwh,
            distributionPriceKwh: model.distributionPriceKwh,
            feedInPriceKwh: model.feedInPriceKwh,
            subsidyPct: model.subsidyPct,
          }}
          onClose={() => setModalType(null)}
        />
      ) : null}
    </div>
  );
}
