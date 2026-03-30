'use client';

import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Gift, PiggyBank, WalletCards, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

type FinancingSectionProps = {
  subsidyPct: number;
  setSubsidyPct: (value: number) => void;
  grossCapex: number;
  subsidyAmount: number;
  equityNeeded: number;
};

function formatCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} mil. Kč`;
  return `${Math.round(value).toLocaleString('cs-CZ')} Kč`;
}

export default function FinancingSection({
  subsidyPct,
  setSubsidyPct,
  grossCapex,
  subsidyAmount,
  equityNeeded,
}: FinancingSectionProps) {
  return (
    <div className="space-y-4 w-full min-w-0">
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-slate-300">Dotace</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-slate-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Dotace přímo snižuje objem vlastních zdrojů a zkracuje prostou návratnost projektu.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Výše dotace</span>
            <span className={cn('font-semibold', subsidyPct > 0 ? 'text-emerald-400' : 'text-slate-400')}>
              {subsidyPct} %{subsidyPct > 0 ? ' — aktivní' : ' — bez dotace'}
            </span>
          </div>
          <Slider value={[subsidyPct]} onValueChange={([v]) => setSubsidyPct(v)} min={0} max={80} step={1} />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0 %</span>
            <span>80 %</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Očekávané investiční náklady', value: formatCurrency(grossCapex), icon: WalletCards, accent: 'text-blue-400' },
          { label: 'Očekávaná dotace', value: formatCurrency(subsidyAmount), icon: Gift, accent: 'text-emerald-400' },
          { label: 'Očekávané vlastní zdroje', value: formatCurrency(equityNeeded), icon: PiggyBank, accent: 'text-amber-400' },
        ].map(({ label, value, icon: Icon, accent }) => (
          <div key={label} className="rounded-xl border border-slate-800/50 bg-slate-900/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={cn('w-4 h-4', accent)} />
              <span className="text-xs text-slate-400">{label}</span>
            </div>
            <div className="text-lg font-semibold text-white">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
