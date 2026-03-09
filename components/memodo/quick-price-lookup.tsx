"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Search } from "lucide-react";
import type { Product } from "@/lib/memodo-data";

type PriceAccessResponse = {
  ok: boolean;
  canSeePrices: boolean;
  email: string | null;
};

type ProductsResponse = {
  ok: boolean;
  products: Product[];
};

export function MemodoQuickPriceLookup() {
  const [canSeePrices, setCanSeePrices] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Product | null>(null);

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

  const handleLookup = async (event: React.FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(`/api/memodo/products?q=${encodeURIComponent(q)}&sort=popular&limit=8&offset=0`);
      const payload = (await response.json().catch(() => null)) as ProductsResponse | null;
      if (!response.ok || !payload?.ok) {
        setError("Cenu se nepodařilo načíst.");
        return;
      }
      const priced = (payload.products || []).find((item) => typeof item.price === "number") || null;
      if (!priced) {
        setError("Pro tento dotaz jsme nenašli produkt s cenou.");
        return;
      }
      setResult(priced);
    } catch {
      setError("Cenu se nepodařilo načíst.");
    } finally {
      setLoading(false);
    }
  };

  if (!canSeePrices) return null;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-black text-gray-900">Rychlá cena</h2>
      <p className="mt-1 text-xs text-gray-500">Zadejte název nebo artikl a hned uvidíte cenu.</p>

      <form onSubmit={handleLookup} className="mt-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Např. GW10K-ET nebo Trina 450"
            className="h-11 w-full rounded-xl border border-gray-300 bg-white pl-10 pr-3 text-sm text-gray-900"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="min-h-[44px] rounded-xl bg-[#FFE500] px-4 py-2 text-sm font-black text-black disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Zjistit cenu"}
        </button>
      </form>

      {error ? <p className="mt-2 text-xs font-semibold text-amber-700">{error}</p> : null}

      {result ? (
        <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm font-bold text-gray-900">{result.name}</p>
          <p className="mt-1 text-lg font-black text-gray-900">
            {result.price?.toLocaleString("cs-CZ")} Kč <span className="text-xs font-semibold text-gray-500">bez DPH</span>
          </p>
          {typeof result.price_with_vat === "number" ? (
            <p className="text-xs text-gray-500">{result.price_with_vat.toLocaleString("cs-CZ")} Kč s DPH</p>
          ) : null}
          <Link href={`/Memodo/produkt/${result.id}`} className="mt-2 inline-block text-xs font-semibold text-slate-700 underline">
            Otevřít detail produktu
          </Link>
        </div>
      ) : null}
    </section>
  );
}
