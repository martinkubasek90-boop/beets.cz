"use client";

import { useEffect, useState } from "react";
import { Mail, X } from "lucide-react";

type PriceAccessResponse = {
  ok: boolean;
  canSeePrices: boolean;
  email: string | null;
};

const STORAGE_KEY = "memodo_price_gate_v1";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function MemodoPriceEmailGate() {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [canSeePrices, setCanSeePrices] = useState<boolean | null>(null);
  const [knownEmail, setKnownEmail] = useState<string>("");

  useEffect(() => {
    const firstRunDone = window.localStorage.getItem(STORAGE_KEY) === "done";
    if (!firstRunDone) setIsOpen(true);
    setLoading(true);

    fetch("/api/memodo/price-access", { cache: "no-store" })
      .then(async (res) => {
        const payload = (await res.json().catch(() => null)) as PriceAccessResponse | null;
        if (!res.ok || !payload?.ok) return;
        setCanSeePrices(payload.canSeePrices);
        if (payload.email) {
          setKnownEmail(payload.email);
          setEmail(payload.email);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const submitEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      setError("Zadejte prosím e-mail.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/memodo/price-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const payload = (await response.json().catch(() => null)) as PriceAccessResponse | { error?: string } | null;
      if (!response.ok || !payload || !("ok" in payload) || !payload.ok) {
        const message = payload && "error" in payload && payload.error ? payload.error : "Nepodařilo se ověřit e-mail.";
        throw new Error(message);
      }
      setKnownEmail(payload.email || normalizedEmail);
      setCanSeePrices(payload.canSeePrices);
      window.localStorage.setItem(STORAGE_KEY, "done");
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepodařilo se ověřit e-mail.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {canSeePrices !== null && !loading ? (
        <div
          className={`rounded-xl border px-3 py-2 text-xs ${
            canSeePrices ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {canSeePrices
            ? "Děkujeme, váš e-mail známe a můžeme tedy ukázat ceny."
            : "Váš e-mail aktuálně neznáme a proto ukážeme vše kromě cen."}
          {knownEmail ? <span className="ml-1 font-semibold">{knownEmail}</span> : null}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="ml-2 inline-flex rounded-md border border-current/30 bg-white/60 px-2 py-0.5 font-semibold"
          >
            Změnit
          </button>
        </div>
      ) : null}

      {isOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end bg-black/40 p-3 sm:items-center sm:justify-center">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-base font-black text-gray-900">Zadejte e-mail pro ceny</p>
                <p className="mt-1 text-xs text-gray-600">
                  Podle e-mailu ověříme, zda vám můžeme zobrazit ceníkové ceny.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  window.localStorage.setItem(STORAGE_KEY, "done");
                  setIsOpen(false);
                }}
                className="rounded-lg border border-gray-200 p-1.5 text-gray-500"
                aria-label="Zavřít"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={submitEmail} className="space-y-3">
              <label className="block text-xs font-semibold text-gray-700" htmlFor="memodo-price-email">
                E-mail
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="memodo-price-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-gray-300 bg-white px-10 py-2 text-sm"
                  placeholder="partner@firma.cz"
                />
              </div>
              {error ? <p className="text-xs font-semibold text-red-600">{error}</p> : null}
              <button
                type="submit"
                disabled={submitting}
                className="min-h-[44px] w-full rounded-xl bg-[#FFE500] px-4 py-2 text-sm font-black text-black disabled:opacity-60"
              >
                {submitting ? "Ověřuji..." : "Potvrdit e-mail"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
