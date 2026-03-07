"use client";

import { useState } from "react";
import { Bot, Link2, Send, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Citation = {
  sourceLabel: string;
  sourceUrl?: string | null;
  snippet: string;
  score: number;
};

type RecommendedSet = {
  inverter?: { id: string; name: string; brand?: string };
  battery?: { id: string; name: string; brand?: string };
  summary: string;
};

type ChatApiResponse = {
  reply: string;
  citations: Citation[];
  recommendedSet?: RecommendedSet;
  offerPrefill?: {
    productId?: string;
    batteryId?: string;
    message: string;
  };
};

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  citations?: Citation[];
  offerPrefill?: ChatApiResponse["offerPrefill"];
};

type Mode = "shopping" | "technical";

export function MemodoAiAssistant({
  shoppingEnabled,
  technicalEnabled,
  defaultMode,
  fabLabel,
  welcomeMessage,
}: {
  shoppingEnabled: boolean;
  technicalEnabled: boolean;
  defaultMode: Mode;
  fabLabel: string;
  welcomeMessage: string;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>(
    defaultMode === "technical" && technicalEnabled
      ? "technical"
      : shoppingEnabled
        ? "shopping"
        : "technical",
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: welcomeMessage,
    },
  ]);

  if (!shoppingEnabled && !technicalEnabled) return null;

  const sendMessage = async () => {
    const message = input.trim();
    if (!message || loading) return;

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: message }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/memodo-ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, mode }),
      });
      const payload = (await response.json().catch(() => ({}))) as Partial<ChatApiResponse> & { error?: string };
      if (!response.ok || !payload.reply) {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", text: payload.error || "AI teď neodpovídá." },
        ]);
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: payload.reply,
          citations: payload.citations || [],
          offerPrefill: payload.offerPrefill,
        },
      ]);
    } catch {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", text: "Síťová chyba." }]);
    } finally {
      setLoading(false);
    }
  };

  const applyOfferPrefill = (prefill?: ChatApiResponse["offerPrefill"]) => {
    if (!prefill) return;
    const params = new URLSearchParams();
    if (prefill.productId) params.set("product", prefill.productId);
    if (prefill.batteryId) params.set("set", prefill.batteryId);
    params.set("prefill", prefill.message);
    window.location.href = `/Memodo/poptavka?${params.toString()}`;
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex h-12 items-center gap-2 rounded-full bg-[#0F172A] px-4 text-white shadow-xl"
      >
        <Bot className="h-4 w-4" />
        <span className="text-xs font-semibold">{fabLabel}</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/50 p-3" onClick={() => setOpen(false)}>
          <div
            className="mx-auto mt-8 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-slate-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 p-3">
              <div>
                <p className="text-sm font-semibold text-white">Memodo AI rádce</p>
                <p className="text-xs text-slate-400">Doporučení setu + propsání do nabídky</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2 p-3">
              {shoppingEnabled ? (
                <button
                  type="button"
                  onClick={() => setMode("shopping")}
                  className={`rounded-lg px-3 py-1 text-xs ${mode === "shopping" ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"}`}
                >
                  <Bot className="mr-1 inline h-3 w-3" />
                  Nákupní rádce
                </button>
              ) : null}
              {technicalEnabled ? (
                <button
                  type="button"
                  onClick={() => setMode("technical")}
                  className={`rounded-lg px-3 py-1 text-xs ${mode === "technical" ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-300"}`}
                >
                  <Wrench className="mr-1 inline h-3 w-3" />
                  Technický poradce
                </button>
              ) : null}
            </div>

            <div className="max-h-[52vh] space-y-3 overflow-y-auto p-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-xl px-3 py-2 text-sm ${message.role === "assistant" ? "border border-slate-800 bg-slate-900 text-slate-200" : "ml-8 border border-blue-500/30 bg-blue-500/20 text-blue-100"}`}
                >
                  <p className="whitespace-pre-wrap">{message.text}</p>
                  {message.citations?.length ? (
                    <div className="mt-2 space-y-1">
                      {message.citations.map((citation, index) => (
                        <div key={`${message.id}-${index}`} className="border-t border-slate-700 pt-1 text-xs text-slate-300">
                          <div className="font-medium">{citation.sourceLabel}</div>
                          <div className="text-slate-400">{citation.snippet}</div>
                          {citation.sourceUrl ? (
                            <a className="text-blue-300 underline" href={citation.sourceUrl} target="_blank" rel="noreferrer">
                              Otevřít zdroj
                            </a>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {message.offerPrefill ? (
                    <Button
                      type="button"
                      onClick={() => applyOfferPrefill(message.offerPrefill)}
                      className="mt-2 h-8 rounded-lg bg-[#FFE500] px-3 text-xs font-semibold text-black hover:bg-yellow-400"
                    >
                      <Link2 className="mr-1 h-3 w-3" />
                      Propsat do nabídky
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="border-t border-slate-800 p-3">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder="Napiš požadavek (např. set pro 10 kW FVE)..."
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                />
                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={loading}
                  className="rounded-lg bg-blue-600 px-3 text-white disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
