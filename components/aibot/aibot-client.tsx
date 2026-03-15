"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type FeatureState = {
  assistantName: string;
  voiceEnabled: boolean;
  n8nReady: boolean;
  webhookConfigured: boolean;
  webhookProtected: boolean;
  integrations: {
    gmail: boolean;
    asana: boolean;
    hubspot: boolean;
    analytics: boolean;
    ads: boolean;
  };
};

type ChatMessage = {
  role: "user" | "assistant" | "system";
  text: string;
};

type ChatResponse = {
  reply: string;
  sources?: string[];
  actions?: string[];
};

type IntegrationStatus = {
  label: string;
  enabled: boolean;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognition;
    SpeechRecognition?: new () => SpeechRecognition;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
  }

  interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList;
  }

  interface SpeechRecognitionErrorEvent {
    error: string;
  }
}

const defaultMessages: ChatMessage[] = [
  {
    role: "system",
    text: "Tohle je MVP rozhraní pro tvého 24/7 asistenta. Finální inteligence, integrace a akce poběží v n8n webhooku přes Claude.",
  },
];

function statusTone(enabled: boolean) {
  return enabled
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
    : "border-white/10 bg-white/5 text-white/55";
}

export function AIBotClient({ featureState }: { featureState: FeatureState }) {
  const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef("");
  const integrationStatuses: IntegrationStatus[] = [
    { label: "Gmail", enabled: featureState.integrations.gmail },
    { label: "Asana", enabled: featureState.integrations.asana },
    { label: "HubSpot", enabled: featureState.integrations.hubspot },
    { label: "Google Analytics", enabled: featureState.integrations.analytics },
    { label: "Google Ads", enabled: featureState.integrations.ads },
  ];

  useEffect(() => {
    if (!featureState.voiceEnabled) return;
    const Recognition =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined;

    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = "cs-CZ";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();

      transcriptRef.current = transcript;
      setValue(transcript);
    };

    recognition.onerror = (event) => {
      setListening(false);
      setError(`Hlasové rozpoznání selhalo: ${event.error}`);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [featureState.voiceEnabled]);

  async function sendMessage(message: string, mode: "text" | "voice") {
    const trimmed = message.trim();
    if (!trimmed || pending) return;

    setPending(true);
    setError(null);
    setMessages((current) => [...current, { role: "user", text: trimmed }]);
    setValue("");

    try {
      const response = await fetch("/api/aibot/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          mode,
          sessionId: "beets-web-client",
        }),
      });

      const payload = (await response.json()) as ChatResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "AIBot request failed.");
      }

      const extras: string[] = [];
      if (payload.actions?.length) {
        extras.push(`Navržené akce: ${payload.actions.join(", ")}`);
      }
      if (payload.sources?.length) {
        extras.push(`Zdroje: ${payload.sources.join(", ")}`);
      }

      const assistantText = [payload.reply, ...extras].filter(Boolean).join("\n\n");

      setMessages((current) => [
        ...current,
        { role: "assistant", text: assistantText || "Bez odpovědi." },
      ]);

      if (mode === "voice" && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(payload.reply);
        utterance.lang = "cs-CZ";
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Komunikace s AIBotem selhala.";
      setError(message);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: `Backend zatím není plně připravený. ${message}`,
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  function handleVoiceToggle() {
    if (!recognitionRef.current) {
      setError("Tento prohlížeč nepodporuje SpeechRecognition API.");
      return;
    }

    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    transcriptRef.current = "";
    setError(null);
    setListening(true);
    recognitionRef.current.start();
  }

  function handleVoiceSend() {
    const transcript = transcriptRef.current || value;
    if (!transcript.trim()) return;
    void sendMessage(transcript, "voice");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.16),transparent_35%),linear-gradient(180deg,#07111f_0%,#020617_100%)] px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <Badge className="bg-cyan-400/15 text-cyan-100 hover:bg-cyan-400/15">
                {featureState.assistantName}
              </Badge>
              <Badge variant="outline" className={statusTone(featureState.n8nReady)}>
                {featureState.n8nReady ? "n8n připojeno" : "n8n čeká na webhook"}
              </Badge>
              <Badge variant="outline" className={statusTone(featureState.voiceEnabled)}>
                {featureState.voiceEnabled ? "hlas aktivní" : "hlas vypnutý"}
              </Badge>
            </div>

            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight">
              Osobní AI asistent pro BEETS.CZ napojený na n8n, Claude a tvoje pracovní nástroje.
            </h1>
            <p className="mt-4 max-w-3xl text-base text-white/70">
              Tohle je webové rozhraní pro asistenta. Produkční logika, přístupy do Gmailu, Asany,
              HubSpotu, Google Analytics a Google Ads běží přes n8n workflow.
            </p>

            <div className="mt-8 rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="mb-4 flex items-center justify-between gap-4">
                <p className="text-sm uppercase tracking-[0.24em] text-white/45">Konverzace</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleVoiceToggle}
                    disabled={!featureState.voiceEnabled}
                  >
                    {listening ? "Zastavit mikrofon" : "Zapnout mikrofon"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleVoiceSend}
                    disabled={!value.trim() || pending}
                  >
                    Odeslat hlas
                  </Button>
                </div>
              </div>

              <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={
                      message.role === "user"
                        ? "ml-auto max-w-[85%] rounded-2xl bg-cyan-400 px-4 py-3 text-slate-950"
                        : "max-w-[90%] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white/90"
                    }
                  >
                    <p className="whitespace-pre-wrap text-sm leading-6">{message.text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-3">
                <Input
                  value={value}
                  onChange={(event) => setValue(event.target.value)}
                  placeholder="Např. Shrň mi dnešní leady, otevřené úkoly v Asaně a výkon kampaní."
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/35"
                />
                <Button
                  type="button"
                  onClick={() => void sendMessage(value, "text")}
                  disabled={!value.trim() || pending}
                >
                  {pending ? "Posílám..." : "Odeslat"}
                </Button>
              </div>

              {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <p className="text-sm uppercase tracking-[0.24em] text-white/45">Integrace</p>
              <div className="mt-4 grid gap-3">
                {integrationStatuses.map(({ label, enabled }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3"
                  >
                    <span className="text-sm text-white/80">{label}</span>
                    <Badge variant="outline" className={statusTone(Boolean(enabled))}>
                      {enabled ? "připraveno" : "chybí konfigurace"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <p className="text-sm uppercase tracking-[0.24em] text-white/45">Jak to funguje</p>
              <ol className="mt-4 space-y-3 text-sm leading-6 text-white/75">
                <li>1. Web pošle dotaz do `/api/aibot/chat`.</li>
                <li>2. Route ho předá do n8n webhooku.</li>
                <li>3. n8n workflow vytáhne data z tvých nástrojů.</li>
                <li>4. Claude rozhodne, odpoví a případně spustí akce.</li>
                <li>5. Web odpověď zobrazí nebo přečte hlasem.</li>
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
