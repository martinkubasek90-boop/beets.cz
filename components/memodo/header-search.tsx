"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
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

type VoiceNormalizeResponse = {
  ok: boolean;
  normalizedText: string;
  searchQuery: string;
  priceQuery: string;
  isPriceIntent: boolean;
  provider: "llm" | "fallback";
};

type SpeechRecognitionEventLike = Event & {
  results: ArrayLike<ArrayLike<{ transcript: string } & { confidence?: number }> & { isFinal?: boolean }>;
  resultIndex?: number;
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

const VOICE_BRAND_HINTS = [
  "dyness",
  "pylontech",
  "goodwe",
  "sungrow",
  "trina",
  "huawei",
  "byd",
  "fronius",
  "solax",
  "canadian",
  "ja",
];

function normalizeVoiceText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
}

function correctVoiceBrands(value: string) {
  const tokens = normalizeVoiceText(value).split(" ").filter(Boolean);
  const corrected = tokens.map((token) => {
    if (token.length < 3) return token;
    let best = token;
    let bestDistance = Number.MAX_SAFE_INTEGER;
    for (const brand of VOICE_BRAND_HINTS) {
      const d = levenshteinDistance(token, brand);
      if (d < bestDistance) {
        bestDistance = d;
        best = brand;
      }
    }
    if (bestDistance <= 2) return best;
    return token;
  });
  return corrected.join(" ").trim();
}

function extractSpeechCandidates(transcript: string) {
  const normalized = normalizeVoiceText(transcript);
  const corrected = correctVoiceBrands(normalized);
  const compact = normalized
    .replace(/\b(chci|prosim|potrebuju|hledam|dej|ukaz|jaka|je|cena|kolik|stoji)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const correctedCompact = correctVoiceBrands(compact);

  return Array.from(new Set([normalized, corrected, compact, correctedCompact].filter((item) => item.length >= 2)));
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
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState("Dyness Tower");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const voiceTranscriptRef = useRef("");
  const voiceFinishedRef = useRef(false);
  const voiceStoppingRef = useRef(false);
  const voiceFinalizeTimerRef = useRef<number | null>(null);

  const isCatalogPage = pathname?.startsWith("/Memodo/katalog");
  const placeholderSamples = useMemo(
    () => ["Dyness Tower", "Pylontech Force H3", "GoodWe Lynx D", "Sungrow SBH100"],
    [],
  );

  useEffect(() => {
    let sampleIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timeout: number | null = null;

    const tick = () => {
      const current = placeholderSamples[sampleIndex] || "";
      const next = deleting ? current.slice(0, Math.max(0, charIndex - 1)) : current.slice(0, charIndex + 1);
      setAnimatedPlaceholder(next || current.slice(0, 1));
      charIndex = deleting ? Math.max(0, charIndex - 1) : Math.min(current.length, charIndex + 1);

      if (!deleting && charIndex >= current.length) {
        deleting = true;
        timeout = window.setTimeout(tick, 900);
        return;
      }
      if (deleting && charIndex <= 0) {
        deleting = false;
        sampleIndex = (sampleIndex + 1) % placeholderSamples.length;
      }
      timeout = window.setTimeout(tick, deleting ? 45 : 80);
    };

    timeout = window.setTimeout(tick, 400);
    return () => {
      if (timeout) window.clearTimeout(timeout);
    };
  }, [placeholderSamples]);

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

  useEffect(() => {
    if (isCatalogPage) return;
    const q = debounced.trim();
    if (q.length < 2) return;
    const timer = window.setTimeout(() => {
      router.replace(`/Memodo/katalog?q=${encodeURIComponent(q)}`);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [debounced, isCatalogPage, router]);

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

  const normalizeVoiceQuery = async (transcript: string) => {
    const response = await fetch("/api/memodo/voice-normalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: transcript }),
    });
    if (!response.ok) return null;
    const payload = (await response.json().catch(() => null)) as VoiceNormalizeResponse | null;
    if (!payload?.ok) return null;
    return payload;
  };

  const handleVoiceTranscript = async (transcript: string) => {
    const normalized = await normalizeVoiceQuery(transcript).catch(() => null);
    const effectiveText = normalized?.normalizedText || transcript;
    setQuery(effectiveText);
    setDebounced(effectiveText);

    const searchInput = normalized?.searchQuery || effectiveText;
    const candidates = extractSpeechCandidates(searchInput);
    const priceIntent = normalized?.isPriceIntent ?? isPriceIntent(effectiveText);

    if (!priceIntent) {
      const primary = candidates[0] || searchInput || effectiveText;
      router.push(`/Memodo/katalog?q=${encodeURIComponent(primary)}`);
      setOpen(false);
      setVoiceAnswer(null);
      return;
    }

    try {
      const base = normalized?.priceQuery || cleanupPriceQuery(effectiveText) || searchInput || effectiveText;
      const priceCandidates = extractSpeechCandidates(base);
      let matchedProducts: Product[] = [];
      for (const candidateQuery of priceCandidates) {
        const response = await fetch(
          `/api/memodo/products?q=${encodeURIComponent(candidateQuery)}&sort=popular&limit=8&offset=0`,
        );
        const payload = (await response.json().catch(() => null)) as ProductsResponse | null;
        if (!response.ok || !payload?.ok || !payload.products?.length) continue;
        matchedProducts = payload.products;
        break;
      }

      if (!matchedProducts.length) {
        const text = "Nenašel jsem odpovídající produkt.";
        setVoiceAnswer({ text });
        speak(text);
        return;
      }

      const candidate = matchedProducts.find((item) => typeof item.price === "number") || matchedProducts[0];
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
    voiceStoppingRef.current = false;
    recognitionRef.current = recognition;
    setVoiceListening(true);
    setVoiceAnswer({ text: "Mluvte, držte tlačítko mikrofonu a po puštění vyhledám." });

    recognition.onresult = (event) => {
      // Keep the latest best transcript continuously so releasing mic always has something to process.
      const parts: string[] = [];
      for (let i = 0; i < event.results.length; i += 1) {
        const part = event.results[i]?.[0]?.transcript?.trim();
        if (part) parts.push(part);
      }
      const transcript = parts.join(" ").trim();
      if (!transcript) return;
      voiceTranscriptRef.current = transcript;
    };
    recognition.onerror = () => {
      setVoiceListening(false);
      recognitionRef.current = null;
      voiceStoppingRef.current = false;
      setVoiceAnswer({ text: "Hlasové hledání selhalo. Zkuste to prosím znovu." });
    };
    recognition.onend = async () => {
      if (voiceFinalizeTimerRef.current) {
        window.clearTimeout(voiceFinalizeTimerRef.current);
        voiceFinalizeTimerRef.current = null;
      }
      setVoiceListening(false);
      recognitionRef.current = null;
      voiceStoppingRef.current = false;
      const transcript = voiceTranscriptRef.current.trim();
      if (!transcript) {
        setVoiceAnswer({ text: "Nerozuměl jsem dotazu. Zkuste to prosím znovu." });
        return;
      }
      if (voiceFinishedRef.current) return;
      voiceFinishedRef.current = true;
      await handleVoiceTranscript(transcript);
    };
    try {
      recognition.start();
    } catch {
      setVoiceListening(false);
      recognitionRef.current = null;
      voiceStoppingRef.current = false;
      setVoiceAnswer({ text: "Hlasové hledání se nepodařilo spustit." });
    }
  };

  const stopVoiceSearch = () => {
    const recognition = recognitionRef.current;
    if (!recognition || voiceStoppingRef.current) return;
    voiceStoppingRef.current = true;
    recognition.stop();
    setVoiceAnswer({ text: "Zpracovávám dotaz..." });
    if (voiceFinalizeTimerRef.current) {
      window.clearTimeout(voiceFinalizeTimerRef.current);
    }
    voiceFinalizeTimerRef.current = window.setTimeout(() => {
      if (!voiceStoppingRef.current) return;
      voiceStoppingRef.current = false;
      setVoiceListening(false);
      recognitionRef.current = null;
      const transcript = voiceTranscriptRef.current.trim();
      if (!transcript) {
        setVoiceAnswer({ text: "Nerozuměl jsem dotazu. Zkuste to prosím znovu." });
        return;
      }
      if (voiceFinishedRef.current) return;
      voiceFinishedRef.current = true;
      void handleVoiceTranscript(transcript);
    }, 1800);
  };

  useEffect(() => {
    const onStart = () => startVoiceSearch();
    const onStop = () => stopVoiceSearch();
    window.addEventListener("memodo-voice-start", onStart as EventListener);
    window.addEventListener("memodo-voice-stop", onStop as EventListener);
    return () => {
      window.removeEventListener("memodo-voice-start", onStart as EventListener);
      window.removeEventListener("memodo-voice-stop", onStop as EventListener);
    };
  });

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("memodo-voice-state", { detail: { listening: voiceListening } }));
  }, [voiceListening]);

  const emptyHint = useMemo(() => debounced.length >= 2 && !loading && results.length === 0, [debounced, loading, results.length]);

  return (
    <div className="relative">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitSearch();
        }}
        className="flex min-h-[56px] items-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 text-base font-medium text-gray-500 shadow-sm"
      >
        <Search className="h-5 w-5 text-gray-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          placeholder={`Pište např. ${animatedPlaceholder}`}
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
          type="submit"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-gray-200 bg-gray-100 px-3 text-xs font-bold text-gray-800 hover:bg-gray-200"
          aria-label="Hledat v katalogu"
          title="Hledat v katalogu"
        >
          Hledat
        </button>
      </form>
      <p className="mt-1 text-[11px] font-semibold text-gray-600">Fulltext: pište název produktu, značku nebo číslo položky.</p>
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
