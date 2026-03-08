"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import type { Product } from "@/lib/memodo-data";

type ProductsResponse = {
  ok: boolean;
  products: Product[];
};

export function MemodoHeaderSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isCatalogPage = pathname?.startsWith("/Memodo/katalog");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 220);
    return () => window.clearTimeout(timer);
  }, [query]);

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
      </form>

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
