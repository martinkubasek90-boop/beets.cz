'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bot, Link2, Send, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type UtilizationType = 'stable' | 'combined' | 'arbitrage';
type InvestmentMode = 'conservative' | 'realistic' | 'dynamic';
type FinancingType = 'own' | 'bank';

type AssistantPatch = Partial<{
  capacity: number;
  utilizationType: UtilizationType;
  annualConsumption: number;
  electricityPrice: number;
  investmentMode: InvestmentMode;
  financing: FinancingType;
  subsidyPct: number;
  loanInterestRate: number;
  loanTermYears: number;
  loanSharePct: number;
  spread: number;
  fcrPrice: number;
  degradation: number;
  omCosts: number;
}>;

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  citations?: Array<{
    sourceLabel: string;
    sourceUrl?: string | null;
    snippet: string;
    score: number;
  }>;
};

type BessAssistantProps = {
  context: {
    capacity: number;
    utilizationType: UtilizationType;
    annualConsumption: number;
    electricityPrice: number;
    investmentMode: InvestmentMode;
    financing: FinancingType;
    subsidyPct: number;
    loanInterestRate: number;
    loanTermYears: number;
    loanSharePct: number;
    spread: number;
    fcrPrice: number;
    degradation: number;
    omCosts: number;
  };
  applyPatch: (patch: AssistantPatch) => void;
  welcomeMessage?: string;
  quickActions?: string[];
  defaultSitemapUrl?: string;
};

type ChatApiResponse = {
  reply: string;
  suggestions: string[];
  patch?: AssistantPatch;
  citations?: Array<{
    sourceLabel: string;
    sourceUrl?: string | null;
    snippet: string;
    score: number;
  }>;
};

const fallbackQuickActions = [
  'Start: nastav realistický scénář',
  'Mám výrobní podnik',
  'Přidej dotaci 20 %',
  'Přepni na konzervativní režim',
];

export default function BessAssistant({
  context,
  applyPatch,
  welcomeMessage,
  quickActions,
  defaultSitemapUrl,
}: BessAssistantProps) {
  const cleanedQuickActions = (quickActions || []).map((item) => item.trim()).filter(Boolean);
  const resolvedQuickActions = cleanedQuickActions.length ? cleanedQuickActions : fallbackQuickActions;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(resolvedQuickActions);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text:
        welcomeMessage ||
        'Jsem AI asistent pro BESS kalkulačku. Napište typ provozu nebo požadovaný cíl (např. „dotace 20 %“, „konzervativní režim“), a upravím parametry.',
    },
  ]);

  const canSend = input.trim().length > 0 && !loading;

  useEffect(() => {
    if (quickActions?.length) {
      setSuggestions(quickActions);
    }
  }, [quickActions]);

  const sendMessage = async (text: string) => {
    const message = text.trim();
    if (!message || loading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: message,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/bess-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context }),
      });

      const payload = (await response.json().catch(() => ({}))) as Partial<ChatApiResponse> & { error?: string };

      if (!response.ok || !payload.reply) {
        const fallback = payload.error || 'Došlo k chybě, zkuste dotaz prosím znovu.';
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: 'assistant', text: fallback },
        ]);
        return;
      }

      const replyText = payload.reply;

      if (payload.patch) {
        applyPatch(payload.patch);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: replyText,
          citations: payload.citations,
        },
      ]);
      setSuggestions(payload.suggestions?.length ? payload.suggestions : resolvedQuickActions);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: 'Síťová chyba. Zkuste to prosím za chvíli.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const subtitle = useMemo(() => {
    if (loading) return 'Právě připravuji doporučení...';
    return 'Asistent pomůže vyplnit kalkulačku a nastaví parametry.';
  }, [loading]);

  const ingestKnowledge = async (type: 'url' | 'sitemap') => {
    const value = window.prompt(
      type === 'url'
        ? 'Zadejte URL stránky, kterou chcete přidat do znalostní báze:'
        : 'Zadejte URL sitemapy (např. https://www.memodo.cz/sitemap.xml):',
    );
    if (!value?.trim() || ingesting) return;

    setIngesting(true);
    try {
      if (type === 'sitemap') {
        const discoveryResponse = await fetch('/api/bess-kb/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            namespace: 'bess',
            sitemapUrl: value.trim() || defaultSitemapUrl || 'https://www.memodo.cz/sitemap.xml',
            discoverOnly: true,
            maxUrls: 2500,
          }),
        });
        const discoveryPayload = (await discoveryResponse.json().catch(() => ({}))) as {
          error?: string;
          urls?: string[];
          totalUrls?: number;
        };
        if (!discoveryResponse.ok || !discoveryPayload.urls?.length) {
          throw new Error(discoveryPayload.error || 'Sitemap nevrátila žádné URL.');
        }

        const allUrls = discoveryPayload.urls;
        const batchSize = 40;
        let totalProcessed = 0;
        for (let index = 0; index < allUrls.length; index += batchSize) {
          const batch = allUrls.slice(index, index + batchSize);
          const response = await fetch('/api/bess-kb/ingest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              namespace: 'bess',
              items: batch.map((url) => ({ type: 'url', url, label: url })),
            }),
          });
          const payload = (await response.json().catch(() => ({}))) as {
            error?: string;
            processed?: number;
          };
          if (!response.ok) throw new Error(payload.error || 'Import sitemapy se nepodařil.');
          totalProcessed += payload.processed ?? batch.length;
        }

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            text: `Sitemap import dokončen. Zpracováno ${totalProcessed} URL z ${discoveryPayload.totalUrls ?? totalProcessed}.`,
          },
        ]);
      } else {
        const response = await fetch('/api/bess-kb/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            namespace: 'bess',
            items: [{ type: 'url', url: value.trim(), label: value.trim() }],
          }),
        });
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        if (!response.ok) throw new Error(payload.error || 'Ingest se nepodařil.');

        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            text: 'URL je uložené do znalostní báze.',
          },
        ]);
      }
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', text: error?.message || 'Ingest se nepodařil.' },
      ]);
    } finally {
      setIngesting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-4 sm:right-6 z-40 h-14 px-4 rounded-full bg-gradient-to-r from-emerald-600 to-blue-600 text-white shadow-xl shadow-emerald-900/40 flex items-center gap-2"
      >
        <Bot className="w-5 h-5" />
        <span className="text-sm font-semibold">AI pomocník</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-3 sm:p-6" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-xl mx-auto mt-8 sm:mt-10 rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/20 grid place-items-center shrink-0">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">AI průvodce kalkulačkou</p>
                  <p className="text-xs text-slate-400">{subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => ingestKnowledge('url')}
                  className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"
                  title="Přidat URL do znalostní báze"
                  disabled={ingesting}
                >
                  <Link2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => ingestKnowledge('sitemap')}
                  className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"
                  title="Načíst URL ze sitemapy"
                  disabled={ingesting}
                >
                  <Sparkles className="w-4 h-4" />
                </button>
                <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-slate-800 text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3 max-h-[50vh] overflow-y-auto">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'rounded-xl px-3 py-2 text-sm leading-relaxed',
                    msg.role === 'assistant'
                      ? 'bg-slate-900 border border-slate-800 text-slate-200'
                      : 'bg-blue-500/15 border border-blue-500/30 text-blue-100 ml-8',
                  )}
                >
                  {msg.text}
                  {msg.citations?.length ? (
                    <div className="mt-2 space-y-1">
                      {msg.citations.map((citation, index) => (
                        <div key={`${msg.id}-${index}`} className="text-xs text-slate-300/90 border-t border-slate-700/70 pt-1.5">
                          <div className="font-medium">{citation.sourceLabel}</div>
                          <div className="text-slate-400">{citation.snippet}</div>
                          {citation.sourceUrl ? (
                            <a
                              href={citation.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-300 hover:text-blue-200"
                            >
                              Zdroj
                            </a>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="px-4 pb-3 flex flex-wrap gap-2">
              {suggestions.slice(0, 3).map((item) => (
                <button
                  key={item}
                  onClick={() => sendMessage(item)}
                  className="text-xs px-2.5 py-1.5 rounded-full border border-slate-700 text-slate-300 hover:bg-slate-800"
                  disabled={loading}
                >
                  {item}
                </button>
              ))}
            </div>

            <form
              className="p-4 border-t border-slate-800 flex items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage(input);
              }}
            >
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Např. dotace 20 %, kapacita 2000 kWh, konzervativní režim..."
                className="flex-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <Button type="submit" disabled={!canSend} className="h-10 px-3 bg-emerald-600 hover:bg-emerald-500">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
