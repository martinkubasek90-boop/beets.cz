'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CheckCircle2, ArrowRight, Factory, Wallet, TrendingUp, SunMedium, FileText, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type ResultsPanelProps = {
  calculations: {
    annualProduction: number;
    annualSavings: number;
    annualExportRevenue: number;
    annualBenefit: number;
    simplePayback: number;
    riskLevel: 'low' | 'medium' | 'high';
    confidenceScore: number;
    grossCapex: number;
    subsidyAmount: number;
    equityNeeded: number;
  };
  onRequestAnalysis: () => void;
  onDownloadPdf: () => void;
};

function formatCurrency(value: number) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)} mil. Kč`;
  return `${Math.round(value).toLocaleString('cs-CZ')} Kč`;
}

export default function ResultsPanel({ calculations, onRequestAnalysis, onDownloadPdf }: ResultsPanelProps) {
  const {
    annualProduction,
    annualSavings,
    annualExportRevenue,
    annualBenefit,
    simplePayback,
    riskLevel,
    confidenceScore,
    grossCapex,
    subsidyAmount,
    equityNeeded,
  } = calculations;

  const getStatusConfig = () => {
    if (simplePayback <= 7) return { color: 'emerald', label: 'Velmi silná ekonomika projektu', icon: CheckCircle2 };
    if (simplePayback <= 10) return { color: 'blue', label: 'Projekt dává ekonomický smysl', icon: TrendingUp };
    if (simplePayback <= 13) return { color: 'amber', label: 'Projekt je citlivý na vstupy', icon: Info };
    return { color: 'red', label: 'Doporučujeme upravit parametry projektu', icon: Info };
  };

  const status = getStatusConfig();
  const riskConfig = {
    low: { label: 'Nízké', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    medium: { label: 'Střední', color: 'text-amber-400', bg: 'bg-amber-500/20' },
    high: { label: 'Vyšší', color: 'text-red-400', bg: 'bg-red-500/20' },
  };

  const confidenceColor = confidenceScore >= 75 ? 'emerald' : confidenceScore >= 60 ? 'amber' : 'orange';
  const statusTextClass =
    status.color === 'emerald'
      ? 'text-emerald-400'
      : status.color === 'blue'
        ? 'text-blue-400'
        : status.color === 'amber'
          ? 'text-amber-400'
          : 'text-red-400';

  return (
    <div className="w-full min-w-0 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden">
      <div className="px-5 pt-5 pb-3 text-center sm:text-left">
        <span className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700/50 text-xs text-slate-400">
          Model odpovídá dodanému CSV: investice, dotace, výroba, úspora, přetoky, návratnost
        </span>
      </div>

      <div className="px-4 sm:px-5 pb-5">
        <div
          className={cn(
            'p-4 sm:p-6 rounded-xl border-2',
            status.color === 'emerald' && 'bg-emerald-500/5 border-emerald-500/30',
            status.color === 'blue' && 'bg-blue-500/5 border-blue-500/30',
            status.color === 'amber' && 'bg-amber-500/5 border-amber-500/30',
            status.color === 'red' && 'bg-red-500/5 border-red-500/30',
          )}
        >
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-4">
            {React.createElement(status.icon, { className: cn('w-5 h-5', statusTextClass) })}
            <span className={cn('text-xs sm:text-sm font-medium leading-snug', statusTextClass)}>{status.label}</span>
          </div>
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-2">Návratnost investice</p>
            <motion.div
              key={simplePayback}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-4xl sm:text-6xl font-bold text-white tracking-tight"
            >
              {simplePayback.toFixed(1)}
              <span className="text-xl sm:text-3xl font-normal text-slate-400 ml-2">let</span>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: 'Očekávaná roční výroba', value: `${Math.round(annualProduction).toLocaleString('cs-CZ')} kWh`, icon: SunMedium, accent: 'text-yellow-400' },
          { label: 'Roční úspora z vlastní spotřeby', value: formatCurrency(annualSavings), icon: Wallet, accent: 'text-emerald-400' },
          { label: 'Roční výnos z prodeje', value: formatCurrency(annualExportRevenue), icon: Factory, accent: 'text-blue-400' },
          { label: 'Celkový roční výnos', value: formatCurrency(annualBenefit), icon: TrendingUp, accent: 'text-emerald-400' },
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
          { label: 'Investiční náklady', value: formatCurrency(grossCapex), accent: 'text-blue-400' },
          { label: 'Dotace', value: formatCurrency(subsidyAmount), accent: 'text-emerald-400' },
          { label: 'Vlastní zdroje', value: formatCurrency(equityNeeded), accent: 'text-amber-400' },
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
            <span className="text-sm text-slate-400">Robustnost scénáře</span>
            <span
              className={cn(
                'text-lg font-semibold',
                confidenceColor === 'emerald' && 'text-emerald-400',
                confidenceColor === 'amber' && 'text-amber-400',
                confidenceColor === 'orange' && 'text-orange-400',
              )}
            >
              {confidenceScore}%
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              className={cn(
                'h-full rounded-full',
                confidenceColor === 'emerald' && 'bg-emerald-500',
                confidenceColor === 'amber' && 'bg-amber-500',
                confidenceColor === 'orange' && 'bg-orange-400',
              )}
              initial={{ width: 0 }}
              animate={{ width: `${confidenceScore}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <div className="mt-3 inline-flex px-2.5 py-1 rounded-lg text-sm font-medium bg-slate-900/70 border border-slate-700/50">
            <span className={cn(riskConfig[riskLevel].bg, riskConfig[riskLevel].color, 'px-2.5 py-1 rounded-lg')}>
              Index rizika: {riskConfig[riskLevel].label}
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-5 pb-5">
        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
          {['Zahrnuje vlastní spotřebu', 'Zahrnuje přetoky do sítě', 'Počítá s dotační podporou'].map((text) => (
            <div key={text} className="flex items-center gap-1.5 text-xs text-slate-400">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-5 bg-slate-800/30 border-t border-slate-700/30 space-y-3">
        <button
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
