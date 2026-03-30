'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { ChevronDown, Info, SunMedium, Factory, Wallet, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type AdvancedSettings = {
  capexPerKw: number;
  additionalCosts: number;
};

type InputPanelProps = {
  systemSizeKw: number;
  setSystemSizeKw: (value: number) => void;
  annualProductionPerKw: number;
  setAnnualProductionPerKw: (value: number) => void;
  selfConsumptionPct: number;
  setSelfConsumptionPct: (value: number) => void;
  powerPrice: number;
  setPowerPrice: (value: number) => void;
  distributionPrice: number;
  setDistributionPrice: (value: number) => void;
  sellPrice: number;
  setSellPrice: (value: number) => void;
  advancedSettings: AdvancedSettings;
  setAdvancedSettings: React.Dispatch<React.SetStateAction<AdvancedSettings>>;
};

function FieldLabel({ text, hint }: { text: string; hint: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1.5 cursor-help">
            <label className="text-sm font-medium text-slate-300">{text}</label>
            <Info className="w-3.5 h-3.5 text-slate-500" />
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p>{hint}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function InputPanel({
  systemSizeKw,
  setSystemSizeKw,
  annualProductionPerKw,
  setAnnualProductionPerKw,
  selfConsumptionPct,
  setSelfConsumptionPct,
  powerPrice,
  setPowerPrice,
  distributionPrice,
  setDistributionPrice,
  sellPrice,
  setSellPrice,
  advancedSettings,
  setAdvancedSettings,
}: InputPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="w-full min-w-0 bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-5 sm:p-6 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-800/50">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-emerald-500 flex items-center justify-center">
          <SunMedium className="w-5 h-5 text-slate-950" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Parametry záměru</h2>
          <p className="text-xs text-slate-400">Vstupy podle dodaného modelu návratnosti</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
          <FieldLabel text="Velikost FVE" hint="Instalovaný výkon fotovoltaické elektrárny v kWp." />
          <span className="px-3 py-1 rounded-lg bg-slate-800 text-white font-semibold text-sm self-start sm:self-auto">
            {systemSizeKw.toLocaleString('cs-CZ')} kWp
          </span>
        </div>
        <Slider value={[systemSizeKw]} onValueChange={([val]) => setSystemSizeKw(val)} min={50} max={1000} step={10} className="py-2" />
        <div className="flex justify-between text-xs text-slate-500">
          <span>50 kWp</span>
          <span>1 000 kWp</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
          <FieldLabel text="Roční výroba v ČR" hint="Předpokládaná roční výroba v kWh na 1 kWp za rok." />
          <span className="px-3 py-1 rounded-lg bg-slate-800 text-white font-semibold text-sm self-start sm:self-auto">
            {annualProductionPerKw.toLocaleString('cs-CZ')} kWh/kWp/rok
          </span>
        </div>
        <Slider value={[annualProductionPerKw]} onValueChange={([val]) => setAnnualProductionPerKw(val)} min={600} max={1400} step={25} className="py-2" />
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
          <FieldLabel text="Podíl vlastní spotřeby" hint="Jaká část vyrobené elektřiny bude spotřebována přímo v objektu." />
          <span className="px-3 py-1 rounded-lg bg-slate-800 text-white font-semibold text-sm self-start sm:self-auto">
            {selfConsumptionPct} %
          </span>
        </div>
        <Slider value={[selfConsumptionPct]} onValueChange={([val]) => setSelfConsumptionPct(val)} min={0} max={100} step={1} className="py-2" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          {
            label: 'Silová část',
            value: powerPrice,
            suffix: 'Kč/kWh',
            setter: setPowerPrice,
            icon: Wallet,
            hint: 'Cena nakupované elektřiny, silová část.',
            min: 0,
            max: 8,
            step: 0.1,
          },
          {
            label: 'Distribuční část',
            value: distributionPrice,
            suffix: 'Kč/kWh',
            setter: setDistributionPrice,
            icon: Receipt,
            hint: 'Distribuční složka ceny nakupované elektřiny.',
            min: 0,
            max: 4,
            step: 0.1,
          },
          {
            label: 'Výkupní cena',
            value: sellPrice,
            suffix: 'Kč/kWh',
            setter: setSellPrice,
            icon: Factory,
            hint: 'Cena, za kterou se prodávají přetoky do sítě.',
            min: 0,
            max: 5,
            step: 0.1,
          },
        ].map(({ label, value, suffix, setter, icon: Icon, hint, min, max, step }) => (
          <div key={label} className="rounded-xl border border-slate-800/60 bg-slate-900/60 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4 text-emerald-400" />
              <FieldLabel text={label} hint={hint} />
            </div>
            <div className="text-xl font-semibold text-white">
              {value.toFixed(1)} <span className="text-sm text-slate-400">{suffix}</span>
            </div>
            <Slider value={[value]} onValueChange={([val]) => setter(val)} min={min} max={max} step={step} />
          </div>
        ))}
      </div>

      <div className="pt-2">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
        >
          <ChevronDown className={cn('w-4 h-4 transition-transform', showAdvanced && 'rotate-180')} />
          <span>Pokročilé investiční parametry</span>
        </button>
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-4 space-y-4">
                {[
                  {
                    key: 'capexPerKw',
                    label: 'CAPEX / kWp',
                    suffix: ' Kč/kWp',
                    min: 15000,
                    max: 40000,
                    step: 500,
                    display: (v: number) => Math.round(v).toLocaleString('cs-CZ'),
                  },
                  {
                    key: 'additionalCosts',
                    label: 'Dodatečné náklady',
                    suffix: ' Kč',
                    min: 0,
                    max: 2000000,
                    step: 25000,
                    display: (v: number) => Math.round(v).toLocaleString('cs-CZ'),
                  },
                ].map(({ key, label, suffix, min, max, step, display }) => (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">{label}</span>
                      <span className="text-slate-300">
                        {display(advancedSettings[key as keyof AdvancedSettings])}
                        {suffix}
                      </span>
                    </div>
                    <Slider
                      value={[advancedSettings[key as keyof AdvancedSettings]]}
                      onValueChange={([val]) =>
                        setAdvancedSettings((prev) => ({
                          ...prev,
                          [key]: val,
                        }))
                      }
                      min={min}
                      max={max}
                      step={step}
                    />
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
