'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, Clock, Wallet, Shield, FileText, ArrowRight, CheckCircle2, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ResultsPanelProps = {
  calculations: {
    netRevenue: number;
    simplePayback: number;
    irr: number;
    totalProfit: number;
    riskLevel: 'low' | 'medium' | 'high';
    confidenceScore: number;
    capex: number;
  };
  onRequestAnalysis: () => void;
  onDownloadPdf: () => void;
};

export default function ResultsPanel({ calculations, onRequestAnalysis, onDownloadPdf }: ResultsPanelProps) {
  const { netRevenue, simplePayback, irr, totalProfit, riskLevel, confidenceScore } = calculations;

  const getStatusConfig = () => {
    if (simplePayback <= 7) return { color: 'emerald', label: 'Ekonomicky stabilní energetická investice', icon: CheckCircle2 };
    if (simplePayback <= 10) return { color: 'blue', label: 'Perspektivní investiční příležitost', icon: TrendingUp };
    if (simplePayback <= 12) return { color: 'amber', label: 'Projekt vyžaduje optimalizaci', icon: AlertTriangle };
    return { color: 'red', label: 'Doporučujeme individuální posouzení', icon: Info };
  };

  const status = getStatusConfig();
  const riskConfig = {
    low: { label: 'Nízké', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    medium: { label: 'Střední', color: 'text-amber-400', bg: 'bg-amber-500/20' },
    high: { label: 'Vyšší', color: 'text-red-400', bg: 'bg-red-500/20' },
  };
  const confidenceColor = confidenceScore >= 75 ? 'emerald' : confidenceScore >= 60 ? 'amber' : 'orange';
  const formatCurrency = (v: number) =>
    v >= 1000000 ? `${(v / 1000000).toFixed(1)} mil. Kč` : `${Math.round(v).toLocaleString('cs-CZ')} Kč`;

  const statusTextClass =
    status.color === 'emerald'
      ? 'text-emerald-400'
      : status.color === 'blue'
        ? 'text-blue-400'
        : status.color === 'amber'
          ? 'text-amber-400'
          : 'text-red-400';

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 rounded-2xl border border-slate-700/50 overflow-hidden">
      <div className="px-5 pt-5 pb-3">
        <span className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700/50 text-xs text-slate-400">
          C&amp;I projekty v ČR se typicky pohybují mezi 5–9 lety návratnosti
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
          <div className="flex items-start sm:items-center gap-2 mb-4">
            {React.createElement(status.icon, { className: cn('w-5 h-5', statusTextClass) })}
            <span className={cn('text-xs sm:text-sm font-medium leading-snug', statusTextClass)}>{status.label}</span>
          </div>
          <div className="text-center">
            <p className="text-slate-400 text-sm mb-2">Prostá návratnost</p>
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
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-400">Roční čistý výnos</span>
          </div>
          <p className="text-xl font-semibold text-white">{formatCurrency(netRevenue)}</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30 cursor-help">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-slate-400">Roční zhodnocení (IRR)</span>
                  <Info className="w-3 h-3 text-slate-500" />
                </div>
                <div className="flex items-baseline gap-1">
                  <p className="text-xl font-semibold text-white">{irr.toFixed(1)}</p>
                  <span className="text-sm text-slate-400">%</span>
                </div>
                {irr > 25 && <p className="text-[10px] text-amber-400 mt-1">Výsledek vychází z aktuálních tržních podmínek.</p>}
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>IRR vyjadřuje průměrné roční procentní zhodnocení při modelových parametrech ČR 2025.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-slate-400">12letý kum. zisk</span>
          </div>
          <p className={cn('text-xl font-semibold', totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400')}>
            {totalProfit >= 0 ? '+' : ''}
            {formatCurrency(totalProfit)}
          </p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400">Index rizika</span>
          </div>
          <div className={cn('inline-flex px-2.5 py-1 rounded-lg text-sm font-medium', riskConfig[riskLevel].bg, riskConfig[riskLevel].color)}>
            {riskConfig[riskLevel].label}
          </div>
        </div>
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
              {confidenceScore}%
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
              animate={{ width: `${confidenceScore}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-5 pb-5">
        <div className="flex flex-wrap gap-2">
          {['Model zahrnuje degradaci baterie', 'Zohledňuje provozní náklady', '12letý investiční horizont'].map((text, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-slate-400">
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
          <span className="text-sm sm:text-base">Získat profesionální investiční posouzení zdarma</span>
          <ArrowRight className="w-4 h-4 ml-2 shrink-0" />
        </Button>
        <p className="text-center text-xs text-slate-500">Nezávazná konzultace • Model na míru • Reálná data z ČR</p>
      </div>
    </div>
  );
}
