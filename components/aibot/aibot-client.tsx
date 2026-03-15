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

type RecognitionMode = "off" | "manual" | "wake" | "command";

const WAKE_WORD = "breto";
const CONVERSATION_WINDOW_MS = 30000;

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognition;
    SpeechRecognition?: new () => SpeechRecognition;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onstart: (() => void) | null;
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

function normalizeSpeech(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function AIBotClient({ featureState }: { featureState: FeatureState }) {
  const [messages, setMessages] = useState<ChatMessage[]>(defaultMessages);
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [handsFreeEnabled, setHandsFreeEnabled] = useState(false);
  const [listeningMode, setListeningMode] = useState<RecognitionMode>("off");
  const [voiceStatus, setVoiceStatus] = useState(
    "Klikni na mikrofon, nebo zapni hands-free a řekni Břéťo.",
  );
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const preferredVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const listeningModeRef = useRef<RecognitionMode>("off");
  const handsFreeEnabledRef = useRef(false);
  const recognitionActiveRef = useRef(false);
  const speechActiveRef = useRef(false);
  const suppressWakeRestartRef = useRef(false);
  const conversationDeadlineRef = useRef<number | null>(null);
  const sendMessageRef = useRef<
    ((message: string, mode: "text" | "voice") => Promise<void>) | null
  >(null);
  const speakReplyRef = useRef<((text: string, onend?: () => void) => void) | null>(null);
  const transcriptRef = useRef("");
  const integrationStatuses: IntegrationStatus[] = [
    { label: "Gmail", enabled: featureState.integrations.gmail },
    { label: "Asana", enabled: featureState.integrations.asana },
    { label: "HubSpot", enabled: featureState.integrations.hubspot },
    { label: "Google Analytics", enabled: featureState.integrations.analytics },
    { label: "Google Ads", enabled: featureState.integrations.ads },
  ];

  function updatePreferredVoice() {
    if (!("speechSynthesis" in window)) {
      preferredVoiceRef.current = null;
      return;
    }

    const voices = window.speechSynthesis.getVoices();
    preferredVoiceRef.current =
      voices.find((voice) => voice.lang.toLowerCase().startsWith("cs")) ||
      voices.find((voice) => voice.lang.toLowerCase().startsWith("sk")) ||
      voices[0] ||
      null;
  }

  function isConversationWindowOpen() {
    return (
      conversationDeadlineRef.current !== null &&
      Date.now() < conversationDeadlineRef.current
    );
  }

  function openConversationWindow() {
    conversationDeadlineRef.current = Date.now() + CONVERSATION_WINDOW_MS;
  }

  function closeConversationWindow() {
    conversationDeadlineRef.current = null;
  }

  function speakReply(text: string, onend?: () => void) {
    if (!("speechSynthesis" in window)) {
      setVoiceStatus("Prohlížeč nepodporuje hlasový výstup.");
      onend?.();
      return;
    }

    stopRecognition();
    updatePreferredVoice();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "cs-CZ";
    if (preferredVoiceRef.current) {
      utterance.voice = preferredVoiceRef.current;
    }
    utterance.onstart = () => {
      speechActiveRef.current = true;
    };
    utterance.onend = () => {
      speechActiveRef.current = false;
      onend?.();
    };
    utterance.onerror = () => {
      speechActiveRef.current = false;
      setVoiceStatus("Hlasový výstup selhal v prohlížeči.");
      onend?.();
    };
    speechActiveRef.current = true;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  function stopRecognition() {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // Ignore invalid state when recognition is already stopped.
    }
  }

  function startRecognition(mode: Exclude<RecognitionMode, "off">) {
    const recognition = recognitionRef.current;
    if (!recognition) {
      setError("Tento prohlížeč nepodporuje SpeechRecognition API.");
      return;
    }
    if (recognitionActiveRef.current || speechActiveRef.current) {
      return;
    }

    transcriptRef.current = "";
    if (mode !== "wake") {
      setValue("");
    }
    setError(null);
    listeningModeRef.current = mode;
    setListeningMode(mode);
    recognition.lang = "cs-CZ";
    recognition.interimResults = true;
    recognition.continuous = mode === "wake";

    try {
      recognition.start();
      setVoiceStatus(
        mode === "wake"
          ? "Hands-free běží. Řekni Břéťo."
          : mode === "command"
            ? "Poslouchám tvůj požadavek."
            : "Mluvím s tebou přes mikrofon.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Mikrofon se nepodařilo spustit.";
      setListeningMode("off");
      listeningModeRef.current = "off";
      setError(message);
    }
  }

  useEffect(() => {
    handsFreeEnabledRef.current = handsFreeEnabled;
  }, [handsFreeEnabled]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    updatePreferredVoice();
    const handleVoicesChanged = () => updatePreferredVoice();
    window.speechSynthesis.addEventListener("voiceschanged", handleVoicesChanged);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesChanged);
    };
  }, []);

  useEffect(() => {
    if (!featureState.voiceEnabled) return;
    const Recognition =
      typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : undefined;

    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = "cs-CZ";
    recognition.interimResults = true;
    recognition.onstart = () => {
      recognitionActiveRef.current = true;
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || "")
        .join(" ")
        .trim();

      transcriptRef.current = transcript;
      const mode = listeningModeRef.current;

      if (mode === "wake") {
        const normalized = normalizeSpeech(transcript);
        if (isConversationWindowOpen() || normalized.includes(WAKE_WORD)) {
          setVoiceStatus("Břéťo slyším. Co potřebuješ?");
          suppressWakeRestartRef.current = true;
          stopRecognition();
          speakReplyRef.current?.("Co potřebuješ?", () => {
            window.setTimeout(() => startRecognition("command"), 150);
          });
        }
        return;
      }

      setValue(transcript);
    };

    recognition.onerror = (event) => {
      recognitionActiveRef.current = false;
      setListeningMode("off");
      listeningModeRef.current = "off";
      setError(`Hlasové rozpoznání selhalo: ${event.error}`);
    };

    recognition.onend = () => {
      recognitionActiveRef.current = false;
      const mode = listeningModeRef.current;
      setListeningMode("off");
      listeningModeRef.current = "off";

      if (mode === "wake" && handsFreeEnabledRef.current) {
        if (suppressWakeRestartRef.current) {
          suppressWakeRestartRef.current = false;
          return;
        }
        if (speechActiveRef.current) {
          return;
        }
        window.setTimeout(() => startRecognition("wake"), 250);
        return;
      }

      if (mode === "command") {
        const transcript = transcriptRef.current.trim();
        if (transcript) {
          setVoiceStatus("Odesílám hlasový požadavek.");
          void sendMessageRef.current?.(transcript, "voice");
        } else if (handsFreeEnabledRef.current) {
          setVoiceStatus("Neslyším požadavek. Řekni znovu Břéťo.");
          window.setTimeout(() => startRecognition("wake"), 250);
        }
        return;
      }

      setVoiceStatus("Mikrofon je vypnutý.");
    };

    recognitionRef.current = recognition;

    return () => {
      stopRecognition();
      recognitionActiveRef.current = false;
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

      if (mode === "voice" || handsFreeEnabledRef.current) {
        openConversationWindow();
        setVoiceStatus("Asistent odpovídá hlasem.");
        speakReply(payload.reply, () => {
          if (!handsFreeEnabledRef.current) {
            setVoiceStatus("Hlasová odpověď dokončena.");
            return;
          }
          setVoiceStatus("Pokračuj bez Břéťa, nebo po chvilce znovu řekni Břéťo.");
          window.setTimeout(() => startRecognition("wake"), 250);
        });
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
      if (mode === "voice" && handsFreeEnabledRef.current) {
        setVoiceStatus("Hlasový požadavek selhal. Řekni znovu Břéťo.");
        closeConversationWindow();
        window.setTimeout(() => startRecognition("wake"), 250);
      }
    } finally {
      setPending(false);
    }
  }

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  });

  useEffect(() => {
    speakReplyRef.current = speakReply;
  });

  function handleVoiceToggle() {
    if (!recognitionRef.current) {
      setError("Tento prohlížeč nepodporuje SpeechRecognition API.");
      return;
    }

    if (handsFreeEnabled) {
      setError("Nejdřív vypni hands-free režim.");
      return;
    }

    if (listeningMode !== "off") {
      stopRecognition();
      setListeningMode("off");
      listeningModeRef.current = "off";
      setVoiceStatus("Mikrofon je vypnutý.");
      return;
    }

    startRecognition("manual");
  }

  function handleVoiceSend() {
    const transcript = transcriptRef.current || value;
    if (!transcript.trim()) return;
    void sendMessage(transcript, "voice");
  }

  function handleHandsFreeToggle() {
    if (!recognitionRef.current) {
      setError("Tento prohlížeč nepodporuje SpeechRecognition API.");
      return;
    }

    if (handsFreeEnabled) {
      setHandsFreeEnabled(false);
      suppressWakeRestartRef.current = false;
      closeConversationWindow();
      stopRecognition();
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      speechActiveRef.current = false;
      setListeningMode("off");
      listeningModeRef.current = "off";
      setVoiceStatus("Hands-free je vypnuté.");
      return;
    }

    setHandsFreeEnabled(true);
    closeConversationWindow();
    stopRecognition();
    startRecognition("wake");
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
                    disabled={!featureState.voiceEnabled || handsFreeEnabled}
                  >
                    {listeningMode === "manual" ? "Zastavit mikrofon" : "Zapnout mikrofon"}
                  </Button>
                  <Button
                    type="button"
                    variant={handsFreeEnabled ? "default" : "outline"}
                    onClick={handleHandsFreeToggle}
                    disabled={!featureState.voiceEnabled}
                  >
                    {handsFreeEnabled ? "Vypnout hands-free" : "Hands-free: Břéťo"}
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

              <p className="mt-3 text-sm text-white/60">
                {voiceStatus}
              </p>
              <p className="mt-1 text-xs text-white/40">
                Po probuzení zůstane hlasové okno asi 30 sekund otevřené. Pak je znovu potřeba říct Břéťo.
              </p>

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
                <li>6. Hands-free mód lokálně čeká na slovo `Břéťo` a pak otevře hlasový dotaz.</li>
              </ol>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
