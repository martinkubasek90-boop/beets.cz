'use client';

import React from 'react';
import { Building2, Factory, Warehouse } from 'lucide-react';

export default function SocialProof() {
  const segments = [
    { icon: Factory, title: 'Výrobní podniky', description: 'Nejvyšší efekt bývá tam, kde je silná denní spotřeba a omezené přetoky.' },
    { icon: Warehouse, title: 'Sklady a logistika', description: 'Střešní plocha a denní provoz často vytváří dobrý poměr vlastní spotřeby.' },
    { icon: Building2, title: 'Administrativní a retail objekty', description: 'FVE pomáhá snižovat náklady na chlazení, osvětlení i běžný provoz budov.' },
  ];

  return (
    <div className="mt-10 sm:mt-12">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Pro koho je FVE model vhodný</h3>
        <p className="text-sm text-slate-400">Největší přínos typicky vzniká tam, kde je vysoká denní vlastní spotřeba</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {segments.map((segment) => {
          const Icon = segment.icon;
          return (
            <div
              key={segment.title}
              className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-5 hover:border-slate-700/50 transition-colors text-center sm:text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center mb-3 mx-auto sm:mx-0">
                <Icon className="w-5 h-5 text-amber-300" />
              </div>
              <h4 className="font-medium text-white mb-1">{segment.title}</h4>
              <p className="text-sm text-slate-400 leading-relaxed">{segment.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
