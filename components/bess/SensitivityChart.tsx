'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, ReferenceLine, Tooltip } from 'recharts';
import { TrendingUp } from 'lucide-react';

type SensitivityChartProps = {
  data: { delta: string; payback: number }[];
  title?: string;
  subtitle?: string;
  tooltipLabel?: string;
};

export default function SensitivityChart({
  data,
  title = 'Citlivost návratnosti na vývoj trhu',
  subtitle = 'Vliv změny spreadu arbitráže',
  tooltipLabel = 'Změna spreadu',
}: SensitivityChartProps) {
  const getBarColor = (p: number) => (p <= 7 ? '#10b981' : p <= 10 ? '#3b82f6' : p <= 12 ? '#f59e0b' : '#ef4444');
  const isStable = data.every((d) => d.payback <= 12);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: any[]; label?: string }) => {
    if (active && payload?.length)
      return (
        <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 shadow-xl">
          <p className="text-xs text-slate-400">
            {tooltipLabel}: {label}
          </p>
          <p className="text-sm font-semibold text-white">Návratnost: {payload[0].value.toFixed(1)} let</p>
        </div>
      );
    return null;
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm rounded-2xl border border-slate-800/50 p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
          <TrendingUp className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="delta" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              domain={[0, 'dataMax + 2']}
              tickFormatter={(v) => `${v}r`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <ReferenceLine y={12} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
            <Bar dataKey="payback" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {data.map((entry, i) => (
                <Cell key={i} fill={getBarColor(entry.payback)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {isStable && (
        <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 rounded-lg px-3 py-2">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
          Projekt zůstává investičně smysluplný i při méně příznivém vývoji trhu.
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-slate-500">
        {[
          ['bg-emerald-500', '< 7 let'],
          ['bg-blue-500', '7-10 let'],
          ['bg-amber-500', '10-12 let'],
          ['bg-red-500', '> 12 let'],
        ].map(([cls, lbl]) => (
          <div key={lbl} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-sm ${cls}`}></div>
            <span>{lbl}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
