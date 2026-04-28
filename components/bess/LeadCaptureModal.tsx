'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { X, FileText, MessageSquare, CheckCircle2, Loader2 } from 'lucide-react';

type LeadCaptureModalProps = {
  type: 'pdf' | 'analysis';
  calculatorType?: 'bess' | 'fve';
  calculations: {
    simplePayback: number;
    netRevenue: number;
    irr: number;
    annualProduction?: number;
    annualSavings?: number;
    annualExportRevenue?: number;
    batteryBenefit?: number;
    annualBenefit?: number;
    grossCapex?: number;
    subsidyAmount?: number;
    equityNeeded?: number;
    selfConsumedEnergy?: number;
    exportedEnergy?: number;
    neededPeakCutKw?: number;
    achievablePeakCutKw?: number;
    shiftedSelfConsumptionKwh?: number;
    shiftedVolatilityKwh?: number;
  };
  inputs: {
    capacity: number;
    systemSizeKw?: number;
    annualConsumptionMwh?: number;
    useBattery?: boolean;
    batteryPowerKw?: number;
    batteryScenario?: string;
    voltageLevel?: string;
    peakFrequency?: string;
    powerPriceKwh?: number;
    distributionPriceKwh?: number;
    feedInPriceKwh?: number;
    subsidyPct?: number;
  };
  onClose: () => void;
};

export default function LeadCaptureModal({ type, calculatorType = 'bess', calculations, inputs, onClose }: LeadCaptureModalProps) {
  const [formData, setFormData] = useState({ email: '', name: '', company: '', phone: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isPdf = type === 'pdf';

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch('/api/hubspot/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calculatorType,
          type,
          ...formData,
          calculations,
          inputs,
          sourceUrl: window.location.href,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'Odeslání do CRM selhalo.');
      }

      setIsSubmitted(true);
    } catch (error: any) {
      setSubmitError(error?.message || 'Odeslání selhalo, zkuste to prosím znovu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (v: number) =>
    v >= 1000000 ? `${(v / 1000000).toFixed(1)} mil. Kč` : `${Math.round(v).toLocaleString('cs-CZ')} Kč`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {!isSubmitted ? (
          <>
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPdf ? 'bg-blue-500/20' : 'bg-emerald-500/20'}`}>
                  {isPdf ? <FileText className="w-5 h-5 text-blue-400" /> : <MessageSquare className="w-5 h-5 text-emerald-400" />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-white">{isPdf ? 'Stáhnout investiční shrnutí' : 'Požádat o investiční posouzení'}</h3>
                  <p className="text-sm text-slate-400">{isPdf ? 'Pošleme vám PDF na email' : 'Ozveme se vám do 24 hodin'}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-800 transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-4 sm:p-5 bg-slate-800/30 border-b border-slate-800">
              <p className="text-xs text-slate-400 mb-3">Shrnutí vašeho projektu</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
                <div>
                  <span className="text-slate-400">{calculatorType === 'fve' ? 'FVE:' : 'Kapacita:'}</span>
                  <span className="text-white ml-2">
                    {calculatorType === 'fve' && inputs.systemSizeKw
                      ? `${inputs.systemSizeKw.toLocaleString('cs-CZ')} kWp`
                      : `${inputs.capacity.toLocaleString('cs-CZ')} kWh`}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Návratnost:</span>
                  <span className="text-white ml-2">{calculations.simplePayback.toFixed(1)} let</span>
                </div>
                <div>
                  <span className="text-slate-400">Roční výnos:</span>
                  <span className="text-white ml-2">{formatCurrency(calculations.netRevenue)}</span>
                </div>
                <div>
                  <span className="text-slate-400">IRR:</span>
                  <span className="text-white ml-2">{calculations.irr.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-300">
                    Jméno *
                  </Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="Jan Novák"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company" className="text-slate-300">
                    Společnost
                  </Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white"
                    placeholder="ABC s.r.o."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300">
                  Email *
                </Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="jan@firma.cz"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-300">
                  Telefon
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-slate-800 border-slate-700 text-white"
                  placeholder="+420 123 456 789"
                />
              </div>
              {!isPdf && (
                <div className="space-y-2">
                  <Label htmlFor="message" className="text-slate-300">
                    Poznámka k projektu
                  </Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="bg-slate-800 border-slate-700 text-white resize-none"
                    placeholder="Popište váš projekt..."
                    rows={3}
                  />
                </div>
              )}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white font-semibold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />Odesílám...
                  </>
                ) : isPdf ? (
                  'Odeslat PDF na email'
                ) : (
                  'Odeslat žádost'
                )}
              </Button>
              {submitError ? <p className="text-xs text-red-400 text-center">{submitError}</p> : null}
              <p className="text-xs text-center text-slate-500">
                Odesláním souhlasíte se zpracováním osobních údajů pro účely komunikace.
              </p>
            </form>
          </>
        ) : (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{isPdf ? 'PDF bylo odesláno!' : 'Děkujeme za váš zájem!'}</h3>
            <p className="text-slate-400 mb-6">
              {isPdf ? 'Zkontrolujte prosím svou emailovou schránku.' : 'Ozveme se vám do 24 hodin s detailní analýzou.'}
            </p>
            <Button onClick={onClose} variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              Zavřít
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
