'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { ChevronDown, Zap, TrendingUp, Activity, Shield, Rocket, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

type Profiles = Record<string, { spread: number; fcrPrice: number; degradation?: number }>;

type UtilizationType = 'stable' | 'combined' | 'arbitrage';

type AdvancedSettings = {
  spread: number;
  fcrPrice: number;
  degradation: number;
  omCosts: number;
  discountRate: number;
};

type InputPanelProps = {
  capacity: number;
  setCapacity: (value: number) => void;
  utilizationType: UtilizationType;
  setUtilizationType: React.Dispatch<React.SetStateAction<UtilizationType>>;
  annualConsumption: number;
  setAnnualConsumption: (value: number) => void;
  electricityPrice: number;
  setElectricityPrice: (value: number) => void;
  investmentMode: 'conservative' | 'realistic' | 'dynamic';
  setInvestmentMode: React.Dispatch<React.SetStateAction<'conservative' | 'realistic' | 'dynamic'>>;
  advancedSettings: AdvancedSettings;
  setAdvancedSettings: React.Dispatch<React.SetStateAction<AdvancedSettings>>;
  profiles: Profiles;
};

export default function InputPanel({
  capacity,
  setCapacity,
  utilizationType,
  setUtilizationType,
  annualConsumption,
  setAnnualConsumption,
  electricityPrice,
  setElectricityPrice,
  investmentMode,
  setInvestmentMode,
  advancedSettings,
  setAdvancedSettings,
  profiles,
}: InputPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const utilizationTypes = [
    { id: 'stable', label: 'Stabilní výnos', sublabel: 'FCR dominantní (80 %)', icon: Shield, color: 'blue' },
    { id: 'combined', label: 'Kombinovaný', sublabel: 'FCR 50 % + Arbitráž', icon: Activity, color: 'emerald' },
    { id: 'arbitrage', label: 'Dynamická arbitráž', sublabel: 'Tržní spread', icon: TrendingUp, color: 'amber' },
  ];

  const modeParams = {
    conservative: { fcrPrice: 1700, spread: 1.0 },
    realistic: { fcrPrice: 1900, spread: 1.2 },
    dynamic: { fcrPrice: 2200, spread: 1.5 },
  };

  const investmentModes = [
    { id: 'conservative', label: 'Konzervativní', icon: Shield, sublabel: '1 700 Kč/kW' },
    { id: 'realistic', label: 'Realistický', icon: Gauge, sublabel: '1 900 Kč/kW' },
    { id: 'dynamic', label: 'Dynamický', icon: Rocket, sublabel: '2 200 Kč/kW' },
  ];

  const colorClasses = {
    blue: 'border-blue-500/50 bg-blue-500/10 text-blue-400',
    emerald: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400',
    amber: 'border-amber-500/50 bg-amber-500/10 text-amber-400',
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-5 sm:p-6 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-slate-800/50">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Parametry projektu</h2>
          <p className="text-xs text-slate-400">Nastavte základní hodnoty</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-slate-300">Kapacita úložiště</label>
          <span className="px-3 py-1 rounded-lg bg-slate-800 text-white font-semibold text-sm">
            {capacity.toLocaleString('cs-CZ')} kWh
          </span>
        </div>
        <Slider value={[capacity]} onValueChange={([val]) => setCapacity(val)} min={200} max={5000} step={100} className="py-2" />
        <div className="flex justify-between text-xs text-slate-500">
          <span>200 kWh</span>
          <span>5 000 kWh</span>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-300">Typ využití</label>
        <div className="grid grid-cols-1 gap-2">
          {utilizationTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = utilizationType === type.id;
            return (
              <motion.button
                key={type.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setUtilizationType(type.id as UtilizationType);
                  const profile = profiles[type.id];
                  setAdvancedSettings((prev) => ({
                    ...prev,
                    spread: profile.spread,
                    fcrPrice: profile.fcrPrice,
                    degradation: profile.degradation || 2,
                    omCosts: 2.5,
                  }));
                }}
                className={cn(
                  'relative p-3 rounded-xl border-2 transition-all text-left',
                  isSelected
                    ? colorClasses[type.color as keyof typeof colorClasses]
                    : 'border-slate-700/50 bg-slate-800/30 text-slate-400 hover:border-slate-600',
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={cn(
                      'w-5 h-5',
                      isSelected
                        ? colorClasses[type.color as keyof typeof colorClasses].split(' ')[2]
                        : 'text-slate-500',
                    )}
                  />
                  <div>
                    <div className="font-medium text-sm">{type.label}</div>
                    <div className="text-xs opacity-70">{type.sublabel}</div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-slate-300">Roční spotřeba objektu</label>
          <span className="px-3 py-1 rounded-lg bg-slate-800 text-white font-semibold text-sm">
            {annualConsumption.toLocaleString('cs-CZ')} MWh
          </span>
        </div>
        <Slider value={[annualConsumption]} onValueChange={([val]) => setAnnualConsumption(val)} min={100} max={20000} step={100} className="py-2" />
        <div className="flex justify-between text-xs text-slate-500">
          <span>100 MWh</span>
          <span>20 000 MWh</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-slate-300">Průměrná cena elektřiny</label>
          <span className="px-3 py-1 rounded-lg bg-slate-800 text-white font-semibold text-sm">
            {electricityPrice.toFixed(1)} Kč/kWh
          </span>
        </div>
        <Slider value={[electricityPrice]} onValueChange={([val]) => setElectricityPrice(val)} min={3} max={8} step={0.1} className="py-2" />
        <div className="flex justify-between text-xs text-slate-500">
          <span>3 Kč</span>
          <span>8 Kč</span>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-300">Investiční režim</label>
        <div className="grid grid-cols-3 gap-2">
          {investmentModes.map((mode) => {
            const Icon = mode.icon;
            const isSelected = investmentMode === mode.id;
            return (
              <motion.button
                key={mode.id}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setInvestmentMode(mode.id as 'conservative' | 'realistic' | 'dynamic');
                  setAdvancedSettings((prev) => ({
                    ...prev,
                    fcrPrice: modeParams[mode.id as keyof typeof modeParams].fcrPrice,
                    spread: modeParams[mode.id as keyof typeof modeParams].spread,
                  }));
                }}
                className={cn(
                  'p-2.5 rounded-xl border-2 transition-all flex flex-col items-center gap-1.5',
                  isSelected
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                    : 'border-slate-700/50 bg-slate-800/30 text-slate-400 hover:border-slate-600',
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-xs font-medium">{mode.label}</span>
                <span className="text-[10px] opacity-60">{mode.sublabel}</span>
              </motion.button>
            );
          })}
        </div>
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
                  { key: 'spread', label: 'Spread arbitráže', suffix: ' Kč/kWh', min: 0.8, max: 2, step: 0.1, display: (v: number) => v.toFixed(1) },
                  { key: 'fcrPrice', label: 'Cena FCR', suffix: ' Kč/kW/měs', min: 1500, max: 3000, step: 50, display: (v: number) => v.toLocaleString('cs-CZ') },
                  { key: 'degradation', label: 'Roční degradace', suffix: '%', min: 1, max: 3, step: 0.5, display: (v: number) => v },
                  { key: 'omCosts', label: 'O&M náklady', suffix: '% CAPEX', min: 2, max: 3, step: 0.1, display: (v: number) => v },
                  { key: 'discountRate', label: 'Diskontní sazba', suffix: '%', min: 6, max: 12, step: 0.5, display: (v: number) => v },
                ].map(({ key, label, suffix, min, max, step, display }) => (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">{label}</span>
                      <span className="text-slate-300">
                        {display(advancedSettings[key as keyof InputPanelProps['advancedSettings']] as number)}
                        {suffix}
                      </span>
                    </div>
                    <Slider
                      value={[advancedSettings[key as keyof InputPanelProps['advancedSettings']] as number]}
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
