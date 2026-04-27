"use client";

import { useMemo, useState } from "react";
import {
  BatteryCharging,
  Calculator,
  Check,
  FileText,
  Gauge,
  LineChart,
  PlugZap,
  RefreshCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BatteryScenario =
  | "Peak shaving"
  | "Zvýšení vlastní spotřeby z FVE"
  | "Ochrana proti volatilním cenám";
type VoltageLevel = "NN" | "VN/VVN";
type PeakFrequency = "Pravidelně" | "Výjimečně";

type ModelState = {
  pvSizeKwp: number;
  annualYieldKwhPerKwp: number;
  baseSelfConsumptionPct: number;
  useBattery: boolean;
  annualConsumptionMwh: number;
  batteryScenario: BatteryScenario;
  voltageLevel: VoltageLevel;
  batteryCapacityKwh: number;
  batteryPowerKw: number;
  peakFrequency: PeakFrequency;
  highestPeakKw: number;
  reservedCapacityKw: number;
  volatilitySpreadKwh: number;
  pvCapexKwp: number;
  batteryCapex: number;
  otherCosts: number;
  powerPriceKwh: number;
  distributionPriceKwh: number;
  feedInPriceKwh: number;
  subsidyPct: number;
};

const DEFAULTS: ModelState = {
  pvSizeKwp: 100,
  annualYieldKwhPerKwp: 1000,
  baseSelfConsumptionPct: 50,
  useBattery: true,
  annualConsumptionMwh: 120,
  batteryScenario: "Peak shaving",
  voltageLevel: "VN/VVN",
  batteryCapacityKwh: 120,
  batteryPowerKw: 60,
  peakFrequency: "Pravidelně",
  highestPeakKw: 220,
  reservedCapacityKw: 180,
  volatilitySpreadKwh: 1.8,
  pvCapexKwp: 25000,
  batteryCapex: 1200000,
  otherCosts: 0,
  powerPriceKwh: 3,
  distributionPriceKwh: 1,
  feedInPriceKwh: 1.6,
  subsidyPct: 0,
};

const ASSUMPTIONS = {
  batteryEfficiency: 0.9,
  selfConsumptionCycles: 220,
  volatilityCycles: 180,
  arbitrageConsumptionShare: 0.35,
  peakShavingValueKwMonth: 1800,
  regularPeakMonths: 12,
  occasionalPeakMonths: 3,
  nnPeakRelevance: 0.15,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function formatMoney(value: number, compact = false) {
  if (compact && Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString("cs-CZ", {
      maximumFractionDigits: 2,
    })} mil. Kč`;
  }

  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number, maximumFractionDigits = 0) {
  return value.toLocaleString("cs-CZ", { maximumFractionDigits });
}

function calculateModel(input: ModelState) {
  const annualConsumptionKwh = input.annualConsumptionMwh * 1000;
  const annualPvProductionKwh = input.pvSizeKwp * input.annualYieldKwhPerKwp;
  const directSelfConsumptionKwh = Math.min(
    annualConsumptionKwh,
    annualPvProductionKwh * (input.baseSelfConsumptionPct / 100),
  );
  const pvOverflowKwh = Math.max(0, annualPvProductionKwh - directSelfConsumptionKwh);
  const purchasePriceKwh = input.powerPriceKwh + input.distributionPriceKwh;
  const batteryCapex = input.useBattery ? input.batteryCapex : 0;
  const totalInvestment = input.pvCapexKwp * input.pvSizeKwp + batteryCapex + input.otherCosts;
  const subsidyAmount = totalInvestment * (input.subsidyPct / 100);
  const ownSources = totalInvestment - subsidyAmount;
  const directPvSavings = directSelfConsumptionKwh * purchasePriceKwh;
  const overflowRevenue = pvOverflowKwh * input.feedInPriceKwh;
  const neededPeakCutKw = Math.max(0, input.highestPeakKw - input.reservedCapacityKw);
  const achievablePeakCutKw = Math.min(input.batteryPowerKw, neededPeakCutKw);
  const shiftedSelfConsumptionKwh = Math.min(
    pvOverflowKwh,
    input.batteryCapacityKwh *
      ASSUMPTIONS.batteryEfficiency *
      ASSUMPTIONS.selfConsumptionCycles,
  );
  const shiftedVolatilityKwh = Math.min(
    annualConsumptionKwh * ASSUMPTIONS.arbitrageConsumptionShare,
    input.batteryCapacityKwh *
      ASSUMPTIONS.batteryEfficiency *
      ASSUMPTIONS.volatilityCycles,
  );
  const selfConsumptionIncrease = annualPvProductionKwh
    ? shiftedSelfConsumptionKwh / annualPvProductionKwh
    : 0;
  const peakMonths =
    input.peakFrequency === "Pravidelně"
      ? ASSUMPTIONS.regularPeakMonths
      : ASSUMPTIONS.occasionalPeakMonths;
  const voltageCoefficient =
    input.voltageLevel === "VN/VVN" ? 1 : ASSUMPTIONS.nnPeakRelevance;

  const scenarioBenefits: Record<BatteryScenario, number> = {
    "Peak shaving":
      achievablePeakCutKw *
      ASSUMPTIONS.peakShavingValueKwMonth *
      peakMonths *
      voltageCoefficient,
    "Zvýšení vlastní spotřeby z FVE":
      shiftedSelfConsumptionKwh * (purchasePriceKwh - input.feedInPriceKwh),
    "Ochrana proti volatilním cenám": shiftedVolatilityKwh * input.volatilitySpreadKwh,
  };

  const batteryBenefit = input.useBattery
    ? scenarioBenefits[input.batteryScenario]
    : 0;
  const annualBenefit = directPvSavings + overflowRevenue + batteryBenefit;
  const paybackYears = annualBenefit > 0 ? ownSources / annualBenefit : null;
  const twelveYearProfit = annualBenefit * 12 - ownSources;

  return {
    annualConsumptionKwh,
    annualPvProductionKwh,
    directSelfConsumptionKwh,
    pvOverflowKwh,
    purchasePriceKwh,
    totalInvestment,
    subsidyAmount,
    ownSources,
    directPvSavings,
    overflowRevenue,
    neededPeakCutKw,
    achievablePeakCutKw,
    shiftedSelfConsumptionKwh,
    shiftedVolatilityKwh,
    selfConsumptionIncrease,
    batteryBenefit,
    annualBenefit,
    paybackYears,
    twelveYearProfit,
    scenarioBenefits,
    activeScenario: input.useBattery ? input.batteryScenario : "Bez baterie",
  };
}

function getRiskLabel(paybackYears: number | null) {
  if (paybackYears === null) return "Neurčeno";
  if (paybackYears < 5) return "Nízké";
  if (paybackYears < 8) return "Střední";
  return "Vyšší";
}

function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  note,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  note?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2 rounded-lg border border-slate-200 bg-white p-3">
      <span className="flex flex-wrap items-baseline justify-between gap-2 text-sm font-medium text-slate-900">
        {label}
        <span className="text-base tabular-nums text-emerald-700">
          {formatNumber(value, step < 1 ? 2 : 0)} {unit}
        </span>
      </span>
      <input
        className="h-2 w-full cursor-pointer accent-emerald-600"
        min={min}
        max={max}
        step={step}
        type="range"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div className="flex items-center gap-3">
        <input
          className="h-9 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm tabular-nums shadow-sm outline-none focus:border-emerald-500"
          min={min}
          max={max}
          step={step}
          type="number"
          value={value}
          onChange={(event) =>
            onChange(clamp(Number(event.target.value || 0), min, max))
          }
        />
        <span className="w-20 text-right text-xs text-slate-500">
          {formatNumber(min, step < 1 ? 1 : 0)}-{formatNumber(max, step < 1 ? 1 : 0)}
        </span>
      </div>
      {note ? <span className="text-xs text-slate-500">{note}</span> : null}
    </label>
  );
}

function NumberField({
  label,
  value,
  min = 0,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  step?: number;
  unit: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-800">
      {label}
      <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <input
          className="min-w-0 flex-1 px-3 py-2 tabular-nums outline-none focus:bg-emerald-50"
          min={min}
          step={step}
          type="number"
          value={value}
          onChange={(event) => onChange(Math.max(min, Number(event.target.value || 0)))}
        />
        <span className="flex items-center border-l border-slate-200 bg-slate-50 px-3 text-xs text-slate-500">
          {unit}
        </span>
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
    <label className="grid gap-2 text-sm font-medium text-slate-800">
      {label}
      <select
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm shadow-sm outline-none focus:border-emerald-500"
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

function ResultTile({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail?: string;
  icon: typeof Calculator;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-normal text-slate-950">
        {value}
      </p>
      {detail ? <p className="mt-2 text-xs text-slate-500">{detail}</p> : null}
    </div>
  );
}

function OutputLine({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 py-3 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span
        className={cn(
          "text-right text-sm font-medium tabular-nums text-slate-950",
          strong && "text-base text-emerald-700",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function BeetsCalculator() {
  const [model, setModel] = useState<ModelState>(DEFAULTS);
  const result = useMemo(() => calculateModel(model), [model]);
  const riskLabel = getRiskLabel(result.paybackYears);

  const setValue = <K extends keyof ModelState>(key: K, value: ModelState[K]) => {
    setModel((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-[#f6f8f4] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <BatteryCharging className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                BEETS.CZ
              </p>
              <h1 className="text-xl font-semibold tracking-normal">
                Kalkulačka návratnosti FVE + baterie
              </h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              className="bg-white text-slate-800 hover:bg-slate-100"
              type="button"
              variant="outline"
              onClick={() => setModel(DEFAULTS)}
            >
              <RefreshCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button
              className="bg-emerald-600 text-white hover:bg-emerald-700"
              type="button"
              onClick={() => window.print()}
            >
              <FileText className="h-4 w-4" />
              Shrnutí
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
        <section className="grid gap-5">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Sun className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-semibold tracking-normal">
                Parametry FVE a baterie
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <SliderField
                label="Velikost FVE"
                max={1000}
                min={50}
                unit="kWp"
                value={model.pvSizeKwp}
                onChange={(value) => setValue("pvSizeKwp", value)}
              />
              <SliderField
                label="Roční výroba v ČR"
                max={1300}
                min={700}
                note="Default modelu je 1 000 kWh/kWp/rok."
                unit="kWh/kWp"
                value={model.annualYieldKwhPerKwp}
                onChange={(value) => setValue("annualYieldKwhPerKwp", value)}
              />
              <SliderField
                label="Podíl vlastní spotřeby bez baterie"
                max={100}
                min={0}
                unit="%"
                value={model.baseSelfConsumptionPct}
                onChange={(value) => setValue("baseSelfConsumptionPct", value)}
              />
              <SliderField
                label="Roční spotřeba objektu"
                max={2000}
                min={10}
                unit="MWh"
                value={model.annualConsumptionMwh}
                onChange={(value) => setValue("annualConsumptionMwh", value)}
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BatteryCharging className="h-5 w-5 text-emerald-700" />
                <h2 className="text-lg font-semibold tracking-normal">
                  Scénář baterie
                </h2>
              </div>
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium">
                <input
                  checked={model.useBattery}
                  className="h-4 w-4 accent-emerald-600"
                  type="checkbox"
                  onChange={(event) => setValue("useBattery", event.target.checked)}
                />
                Použít baterii
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <SelectField
                label="Aktivní scénář"
                options={[
                  "Peak shaving",
                  "Zvýšení vlastní spotřeby z FVE",
                  "Ochrana proti volatilním cenám",
                ]}
                value={model.batteryScenario}
                onChange={(value) => setValue("batteryScenario", value)}
              />
              <SelectField
                label="Napěťová hladina"
                options={["VN/VVN", "NN"]}
                value={model.voltageLevel}
                onChange={(value) => setValue("voltageLevel", value)}
              />
              <SliderField
                label="Kapacita baterie"
                max={2000}
                min={50}
                unit="kWh"
                value={model.batteryCapacityKwh}
                onChange={(value) => setValue("batteryCapacityKwh", value)}
              />
              <SliderField
                label="Výkon baterie"
                max={4000}
                min={25}
                unit="kW"
                value={model.batteryPowerKw}
                onChange={(value) => setValue("batteryPowerKw", value)}
              />
              <SelectField
                label="Frekvence špiček"
                options={["Pravidelně", "Výjimečně"]}
                value={model.peakFrequency}
                onChange={(value) => setValue("peakFrequency", value)}
              />
              <SliderField
                label="Cenový spread / volatilita"
                max={8}
                min={0}
                step={0.1}
                unit="Kč/kWh"
                value={model.volatilitySpreadKwh}
                onChange={(value) => setValue("volatilitySpreadKwh", value)}
              />
              <NumberField
                label="Nejvyšší 15min špička"
                unit="kW"
                value={model.highestPeakKw}
                onChange={(value) => setValue("highestPeakKw", value)}
              />
              <NumberField
                label="Sjednaný rezervovaný příkon"
                unit="kW"
                value={model.reservedCapacityKw}
                onChange={(value) => setValue("reservedCapacityKw", value)}
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-cyan-700" />
              <h2 className="text-lg font-semibold tracking-normal">
                Ekonomika projektu
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <NumberField
                label="CAPEX FVE"
                unit="Kč/kWp"
                value={model.pvCapexKwp}
                onChange={(value) => setValue("pvCapexKwp", value)}
              />
              <NumberField
                label="Dodatečný CAPEX baterie"
                unit="Kč"
                value={model.batteryCapex}
                onChange={(value) => setValue("batteryCapex", value)}
              />
              <NumberField
                label="Další dodatečné náklady"
                unit="Kč"
                value={model.otherCosts}
                onChange={(value) => setValue("otherCosts", value)}
              />
              <SliderField
                label="Dotace"
                max={100}
                min={0}
                unit="%"
                value={model.subsidyPct}
                onChange={(value) => setValue("subsidyPct", value)}
              />
              <SliderField
                label="Cena nakupované elektřiny, silová část"
                max={8}
                min={0}
                step={0.1}
                unit="Kč/kWh"
                value={model.powerPriceKwh}
                onChange={(value) => setValue("powerPriceKwh", value)}
              />
              <SliderField
                label="Cena nakupované elektřiny, distribuce"
                max={4}
                min={0}
                step={0.1}
                unit="Kč/kWh"
                value={model.distributionPriceKwh}
                onChange={(value) => setValue("distributionPriceKwh", value)}
              />
              <SliderField
                label="Výkupní cena elektřiny"
                max={5}
                min={0}
                step={0.1}
                unit="Kč/kWh"
                value={model.feedInPriceKwh}
                onChange={(value) => setValue("feedInPriceKwh", value)}
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <LineChart className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold tracking-normal">
                Porovnání scénářů baterie
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {Object.entries(result.scenarioBenefits).map(([scenario, value]) => (
                <button
                  className={cn(
                    "rounded-lg border p-4 text-left transition hover:border-emerald-500 hover:bg-emerald-50",
                    model.batteryScenario === scenario
                      ? "border-emerald-600 bg-emerald-50"
                      : "border-slate-200 bg-white",
                  )}
                  key={scenario}
                  type="button"
                  onClick={() => setValue("batteryScenario", scenario as BatteryScenario)}
                >
                  <span className="flex items-center justify-between gap-3 text-sm font-medium text-slate-900">
                    {scenario}
                    {model.batteryScenario === scenario ? (
                      <Check className="h-4 w-4 text-emerald-700" />
                    ) : null}
                  </span>
                  <span className="mt-3 block text-xl font-semibold text-emerald-700">
                    {formatMoney(value, true)}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Roční přínos baterie
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="grid content-start gap-5 lg:sticky lg:top-5">
          <div className="rounded-lg border border-emerald-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                  Výstup modelu
                </p>
                <h2 className="text-lg font-semibold tracking-normal">
                  {result.activeScenario}
                </h2>
              </div>
              <ShieldCheck className="h-6 w-6 text-emerald-700" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <ResultTile
                detail="Návratnost investice po odečtení dotace."
                icon={Gauge}
                label="Návratnost"
                value={
                  result.paybackYears === null
                    ? "-"
                    : `${formatNumber(result.paybackYears, 2)} roku`
                }
              />
              <ResultTile
                detail="Přímá spotřeba FVE + přetoky + zvolený bateriový scénář."
                icon={Zap}
                label="Celkový roční přínos"
                value={formatMoney(result.annualBenefit, true)}
              />
              <ResultTile
                detail={`Rizikový profil: ${riskLabel}`}
                icon={PlugZap}
                label="Vlastní zdroje"
                value={formatMoney(result.ownSources, true)}
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-base font-semibold tracking-normal">
              Souhrn ekonomiky
            </h3>
            <OutputLine
              label="Očekávané investiční náklady"
              value={formatMoney(result.totalInvestment)}
            />
            <OutputLine label="Očekávaná dotace" value={formatMoney(result.subsidyAmount)} />
            <OutputLine
              label="Očekávaná roční výroba FVE"
              value={`${formatNumber(result.annualPvProductionKwh)} kWh`}
            />
            <OutputLine
              label="Roční úspora z přímé spotřeby FVE"
              value={formatMoney(result.directPvSavings)}
            />
            <OutputLine
              label="Roční výnosy z přetoků FVE"
              value={formatMoney(result.overflowRevenue)}
            />
            <OutputLine
              label="Roční přínos baterie"
              value={formatMoney(result.batteryBenefit)}
            />
            <OutputLine
              label="12letý kumulovaný výsledek"
              strong
              value={formatMoney(result.twelveYearProfit, true)}
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-base font-semibold tracking-normal">
              Pomocné výpočty
            </h3>
            <OutputLine
              label="Roční spotřeba"
              value={`${formatNumber(result.annualConsumptionKwh)} kWh`}
            />
            <OutputLine
              label="Základní vlastní spotřeba FVE"
              value={`${formatNumber(result.directSelfConsumptionKwh)} kWh`}
            />
            <OutputLine
              label="Přetoky FVE bez baterie"
              value={`${formatNumber(result.pvOverflowKwh)} kWh`}
            />
            <OutputLine
              label="Potřebné seříznutí špičky"
              value={`${formatNumber(result.neededPeakCutKw)} kW`}
            />
            <OutputLine
              label="Reálně seříznutelné špičky baterií"
              value={`${formatNumber(result.achievablePeakCutKw)} kW`}
            />
            <OutputLine
              label="Energie posunutá baterií pro vlastní spotřebu"
              value={`${formatNumber(result.shiftedSelfConsumptionKwh)} kWh`}
            />
            <OutputLine
              label="Energie posunutá baterií pro volatilitu"
              value={`${formatNumber(result.shiftedVolatilityKwh)} kWh`}
            />
            <OutputLine
              label="Zvýšení vlastní spotřeby díky baterii"
              value={`${formatNumber(result.selfConsumptionIncrease * 100, 1)} %`}
            />
          </div>
        </aside>
      </main>
    </div>
  );
}
