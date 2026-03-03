'use client';

import React from 'react';
import { Factory, Truck, ShoppingBag } from 'lucide-react';

export default function SocialProof() {
  const segments = [
    { icon: Factory, title: 'Výrobní podniky', description: 'Optimalizace špičkového odběru a snížení nákladů na energii' },
    { icon: Truck, title: 'Logistické areály', description: 'Flexibilita při dobíjení vozového parku a skladovém provozu' },
    { icon: ShoppingBag, title: 'Retail & OC', description: 'Stabilní provoz při vysokých nárocích na klimatizaci a osvětlení' },
  ];

  return (
    <div className="mt-10 sm:mt-12">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Pro koho je řešení vhodné</h3>
        <p className="text-sm text-slate-400">Model vychází z reálných C&amp;I projektů realizovaných v ČR</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {segments.map((segment, index) => {
          const Icon = segment.icon;
          return (
            <div
              key={index}
              className="bg-slate-900/50 border border-slate-800/50 rounded-xl p-5 hover:border-slate-700/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-blue-400" />
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
