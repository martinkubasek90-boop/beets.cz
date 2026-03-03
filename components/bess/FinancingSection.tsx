'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Slider } from '@/components/ui/slider';
import { Building2, Landmark, Gift, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

type FinancingSectionProps = {
  financing: 'own' | 'bank';
  setFinancing: (value: 'own' | 'bank') => void;
  subsidyPct: number;
  setSubsidyPct: (value: number) => void;
  loanInterestRate: number;
  setLoanInterestRate: (value: number) => void;
  loanTermYears: number;
  setLoanTermYears: (value: number) => void;
};

export default function FinancingSection({
  financing,
  setFinancing,
  subsidyPct,
  setSubsidyPct,
  loanInterestRate,
  setLoanInterestRate,
  loanTermYears,
  setLoanTermYears,
}: FinancingSectionProps) {
  const [showLoanDetails, setShowLoanDetails] = React.useState(false);

  return (
    <div className="space-y-4">
      <label className="text-sm font-medium text-slate-300">Financování</label>
      <div className="grid grid-cols-2 gap-2">
        {[
          { id: 'own', label: 'Vlastní kapitál', icon: Building2, sub: '100 % equity' },
          { id: 'bank', label: '50% bankovní úvěr', icon: Landmark, sub: 'páka na IRR' },
        ].map((opt) => {
          const Icon = opt.icon;
          const sel = financing === opt.id;
          return (
            <motion.button
              key={opt.id}
              onClick={() => setFinancing(opt.id as 'own' | 'bank')}
              whileTap={{ scale: 0.95 }}
              className={cn(
                'p-3 rounded-xl border-2 transition-all flex flex-col items-start gap-1',
                sel
                  ? 'border-blue-500/50 bg-blue-500/10 text-blue-400'
                  : 'border-slate-700/50 bg-slate-800/30 text-slate-400 hover:border-slate-600',
              )}
            >
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{opt.label}</span>
              </div>
              <span className="text-[10px] opacity-60 ml-6">{opt.sub}</span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {financing === 'bank' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-4">
              <button
                onClick={() => setShowLoanDetails(!showLoanDetails)}
                className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ChevronDown className={cn('w-3 h-3 transition-transform', showLoanDetails && 'rotate-180')} />
                Parametry úvěru
              </button>
              <AnimatePresence>
                {showLoanDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Úroková sazba</span>
                        <span className="text-slate-300">{loanInterestRate.toFixed(1)} %</span>
                      </div>
                      <Slider value={[loanInterestRate]} onValueChange={([v]) => setLoanInterestRate(v)} min={3} max={10} step={0.5} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Délka splácení</span>
                        <span className="text-slate-300">{loanTermYears} let</span>
                      </div>
                      <Slider value={[loanTermYears]} onValueChange={([v]) => setLoanTermYears(v)} min={5} max={12} step={1} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {[
                  { label: 'Vlastní kapitál', value: '50 %' },
                  { label: 'Úvěr', value: '50 %' },
                  { label: 'Sazba', value: `${loanInterestRate.toFixed(1)} %` },
                ].map((item) => (
                  <div key={item.label} className="bg-slate-800/50 rounded-lg p-2">
                    <div className="text-white font-semibold">{item.value}</div>
                    <div className="text-slate-500 mt-0.5">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-slate-300">Dotační podpora (OPT / MPO)</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Výše dotace z CAPEX</span>
            <span className={cn('font-semibold', subsidyPct > 0 ? 'text-emerald-400' : 'text-slate-400')}>
              {subsidyPct} %{subsidyPct > 0 ? ' — dotace aktivní' : ' — bez dotace'}
            </span>
          </div>
          <Slider value={[subsidyPct]} onValueChange={([v]) => setSubsidyPct(v)} min={0} max={50} step={5} />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0 % (bez dotace)</span>
            <span>50 % (max. OPT)</span>
          </div>
        </div>
        {subsidyPct > 0 && (
          <p className="text-[10px] text-emerald-400/80">Dotace snižuje čistý CAPEX a zkracuje dobu návratnosti.</p>
        )}
      </div>
    </div>
  );
}
