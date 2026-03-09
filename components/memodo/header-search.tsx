"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Mic, MicOff, Search, X } from "lucide-react";
import type { Product } from "@/lib/memodo-data";

type ProductsResponse = {
  ok: boolean;
  products: Product[];
};

type PriceAccessResponse = {
  ok: boolean;
  canSeePrices: boolean;
  email: string | null;
};

type VoicePriceAnswer = {
  text: string;
  product?: Product;
};

type SpeechRecognitionEventLike = Event & {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

type WindowWithSpeechRecognition = Window & {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
};

function isPriceIntent(text: string) {
  const normalized = text.toLowerCase();
  return /(jak[aá]\s+je\s+cena|kolik\s+stoj[ií]|za\s+kolik|cena)/.test(normalized);
}

function cleanupPriceQuery(text: string) {
  return text
    .toLowerCase()
    .replace(/jak[aá]\s+je\s+cena\s*/g, "")
    .replace(/kolik\s+stoj[ií]\s*/g, "")
    .replace(/za\s+kolik\s*/g, "")
    .replace(/\bcena\b/g, "")
    .replace(/[?.,!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function MemodoHeaderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [canSeePrices, setCanSeePrices] = useState(false);
  const [voiceAnswer, setVoiceAnswer] = useState<VoicePriceAnswer | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceTranscriptRef = useRef("");
  const voiceFinishedRef = useRef(false);

  const isCatalogPage = pathname?.startsWith("/Memodo/katalog");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    fetch("/api/memodo/price-access", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as PriceAccessResponse | null;
        if (!response.ok || !payload?.ok) return;
        setCanSeePrices(payload.canSeePrices);
      })
      .catch(() => {
        setCanSeePrices(false);
      });
  }, []);

  useEffect(() => {
    if (isCatalogPage) {
      setOpen(false);
      return;
    }

    if (debounced.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/memodo/products?q=${encodeURIComponent(debounced)}&sort=popular&limit=6&offset=0`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: ProductsResponse | null) => {
        setResults(payload?.products || []);
        setOpen(true);
      })
      .catch(() => {
        setResults([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [debounced, isCatalogPage]);

  const submitSearch = () => {
    const q = query.trim();
    if (!q) {
      router.push("/Memodo/katalog");
      return;
    }
    router.push(`/Memodo/katalog?q=${encodeURIComponent(q)}`);
    setOpen(false);
  };

  const speak = (text: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "cs-CZ";
    window.speechSynthesis.speak(utterance);
  };

  const handleVoiceTranscript = async (transcript: string) => {
    setQuery(transcript);
    setDebounced(transcript);

    if (!isPriceIntent(transcript)) {
      router.push(`/Memodo/katalog?q=${encodeURIComponent(transcript)}`);
      setOpen(false);
      setVoiceAnswer(null);
      return;
    }

    try {
      const cleaned = cleanupPriceQuery(transcript) || transcript;
      const response = await fetch(`/api/memodo/products?q=${encodeURIComponent(cleaned)}&sort=popular&limit=8&offset=0`);
      const payload = (await response.json().catch(() => null)) as ProductsResponse | null;
      if (!response.ok || !payload?.ok || !payload.products?.length) {
        const text = "Nenašel jsem odpovídající produkt.";
        setVoiceAnswer({ text });
        speak(text);
        return;
      }

      const candidate = payload.products.find((item) => typeof item.price === "number") || payload.products[0];
      if (!candidate) {
        const text = "Nenašel jsem odpovídající produkt.";
        setVoiceAnswer({ text });
        speak(text);
        return;
      }

      if (!canSeePrices || typeof candidate.price !== "number") {
        const text = "Váš e-mail není ověřen pro zobrazení cen. Ukazuji produkt bez ceny.";
        setVoiceAnswer({ text, product: candidate });
        speak(text);
        return;
      }

      const text = `Cena produktu ${candidate.name} je ${candidate.price.toLocaleString("cs-CZ")} korun bez DPH.`;
      setVoiceAnswer({ text, product: candidate });
      speak(text);
    } catch {
      const text = "Nepodařilo se načíst cenu produktu.";
      setVoiceAnswer({ text });
      speak(text);
    }
  };

  const startVoiceSearch = () => {
    if (voiceListening) return;

    const speechWindow = window as WindowWithSpeechRecognition;
    const Recognition = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!Recognition) {
      window.alert("Hlasové vyhledávání není v tomto prohlížeči podporováno.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "cs-CZ";
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    voiceTranscriptRef.current = "";
    voiceFinishedRef.current = false;
    recognitionRef.current = recognition;
    setVoiceListening(true);
    setVoiceAnswer({ text: "Mluvte, držte tlačítko mikrofonu a po puštění vyhledám." });

    recognition.onresult = (event) => {
      const chunks: string[] = [];
      for (let i = 0; i < event.results.length; i += 1) {
        const part = event.results[i]?.[0]?.transcript?.trim();
        if (part) chunks.push(part);
      }
      const transcript = chunks.join(" ").trim();
      if (!transcript) return;
      voiceTranscriptRef.current = transcript;
      setQuery(transcript);
      setDebounced(transcript);
    };
    recognition.onerror = () => {
      setVoiceListening(false);
      recognitionRef.current = null;
    };
    recognition.onend = async () => {
      setVoiceListening(false);
      recognitionRef.current = null;
      const transcript = voiceTranscriptRef.current.trim();
      if (!transcript || voiceFinishedRef.current) return;
      voiceFinishedRef.current = true;
      await handleVoiceTranscript(transcript);
    };
    recognition.start();
  };

  const stopVoiceSearch = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    recognition.stop();
  };

  const emptyHint = useMemo(() => debounced.length >= 2 && !loading && results.length === 0, [debounced, loading, results.length]);

  return (
    <div className="relative">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitSearch();
        }}
        className="flex min-h-[52px] items-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 text-base font-medium text-gray-500 shadow-sm"
      >
        <Search className="h-5 w-5 text-gray-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          placeholder="Hledat dle čísla položky nebo názvu v Katalogu"
          className="h-10 w-full border-0 bg-transparent text-[15px] text-gray-800 outline-none placeholder:text-gray-500"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setDebounced("");
              setResults([]);
              setOpen(false);
            }}
            className="rounded-md p-1 text-gray-400"
            aria-label="Vymazat hledání"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <button
          type="button"
          onMouseDown={startVoiceSearch}
          onMouseUp={stopVoiceSearch}
          onMouseLeave={stopVoiceSearch}
          onTouchStart={(event) => {
            event.preventDefault();
            startVoiceSearch();
          }}
          onTouchEnd={(event) => {
            event.preventDefault();
            stopVoiceSearch();
          }}
          onTouchCancel={(event) => {
            event.preventDefault();
            stopVoiceSearch();
          }}
          className={`rounded-md p-1 ${voiceListening ? "text-red-500" : "text-gray-400"}`}
          aria-label={voiceListening ? "Nahrávání hlasu" : "Hledat hlasem"}
        >
          {voiceListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </button>
      </form>
      {voiceAnswer ? (
        <div className="mt-2 rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-xs text-cyan-900">
          <p className="font-semibold">{voiceAnswer.text}</p>
          {voiceAnswer.product ? (
            <Link href={`/Memodo/produkt/${voiceAnswer.product.id}`} className="mt-1 inline-block font-bold underline">
              Otevřít: {voiceAnswer.product.name}
            </Link>
          ) : null}
        </div>
      ) : null}

      {!isCatalogPage && open ? (
        <div className="absolute left-0 right-0 top-[56px] z-30 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
          {loading ? <p className="px-4 py-3 text-xs text-gray-500">Vyhledávám...</p> : null}
          {!loading && results.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {results.map((product) => (
                <Link
                  key={product.id}
                  href={`/Memodo/produkt/${product.id}`}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 text-sm text-gray-800 hover:bg-gray-50"
                >
                  <p className="font-semibold">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.brand || product.category}</p>
                </Link>
              ))}
              <button
                type="button"
                onClick={submitSearch}
                className="w-full px-4 py-3 text-left text-xs font-semibold text-slate-700 hover:bg-gray-50"
              >
                Zobrazit všechny výsledky v katalogu
              </button>
            </div>
          ) : null}
          {emptyHint ? <p className="px-4 py-3 text-xs text-gray-500">Žádné výsledky pro tento dotaz.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
