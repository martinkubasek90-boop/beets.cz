"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Package, Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MemodoProductCard } from "@/components/memodo/product-card";
import { categoryLabels, type Product } from "@/lib/memodo-data";
import { getMemodoExperimentVariant, trackMemodoEvent } from "@/lib/memodo-analytics";
import { MemodoViewTracker } from "@/components/memodo/mobile-ux";
import { Button } from "@/components/ui/button";

type ApiResponse = {
  ok: boolean;
  count: number;
  products: Product[];
  canSeePrices?: boolean;
};

const PAGE_SIZE = 40;
const CATALOG_STATE_KEY = "memodo_catalog_state_v2";
const quickCategoryChips = [
  { value: "", label: "Vše" },
  { value: "stridace", label: "Střídače" },
  { value: "baterie", label: "Baterie" },
  { value: "panely", label: "Panely" },
];

export function MemodoCatalogPageClient({
  requiresSearch = true,
  initialCategory = "",
  initialSearch = "",
}: {
  requiresSearch?: boolean;
  initialCategory?: string;
  initialSearch?: string;
}) {
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [promoOnly, setPromoOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"popular" | "price_asc" | "price_desc" | "name">("popular");
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Array<{ id: string; name: string }>>([]);
  const [filtersOpen, setFiltersOpen] = useState(Boolean(initialCategory));
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [showAllViewed, setShowAllViewed] = useState(false);

  const trimmedSearch = debouncedSearch.trim();
  const hasActiveFilters = Boolean(category || inStockOnly || promoOnly || search.trim());

  const activeFilterChips = [
    category
      ? {
          key: "category",
          label: `Kategorie: ${categoryLabels[category as keyof typeof categoryLabels] || category}`,
          clear: () => setCategory(""),
        }
      : null,
    inStockOnly
      ? {
          key: "in_stock",
          label: "Jen skladem",
          clear: () => setInStockOnly(false),
        }
      : null,
    promoOnly
      ? {
          key: "promo",
          label: "Jen akce",
          clear: () => setPromoOnly(false),
        }
      : null,
    search.trim()
      ? {
          key: "search",
          label: `Hledání: ${search.trim()}`,
          clear: () => setSearch(""),
        }
      : null,
  ].filter(Boolean) as Array<{ key: string; label: string; clear: () => void }>;

  const resetAllFilters = () => {
    setCategory("");
    setInStockOnly(false);
    setPromoOnly(false);
    setSearch("");
  };

  useEffect(() => {
    const raw = window.sessionStorage.getItem(CATALOG_STATE_KEY);
    if (!raw) return;
    try {
      const state = JSON.parse(raw) as {
        search?: string;
        category?: string;
        inStockOnly?: boolean;
        promoOnly?: boolean;
        sortBy?: "popular" | "price_asc" | "price_desc" | "name";
      };
      if (!initialSearch && state.search) setSearch(state.search);
      if (!initialCategory && state.category) setCategory(state.category);
      if (typeof state.inStockOnly === "boolean") setInStockOnly(state.inStockOnly);
      if (typeof state.promoOnly === "boolean") setPromoOnly(state.promoOnly);
      if (state.sortBy) setSortBy(state.sortBy);
    } catch {
      // Ignore broken session payload.
    }
  }, [initialCategory, initialSearch]);

  useEffect(() => {
    trackMemodoEvent("memodo_catalog_filter_change", {
      category: category || "all",
      in_stock_only: inStockOnly,
      promo_only: promoOnly,
      sort_by: sortBy,
      results: total,
    });
  }, [category, inStockOnly, promoOnly, sortBy, total]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const state = {
      search,
      category,
      inStockOnly,
      promoOnly,
      sortBy,
    };
    window.sessionStorage.setItem(CATALOG_STATE_KEY, JSON.stringify(state));
  }, [search, category, inStockOnly, promoOnly, sortBy]);

  useEffect(() => {
    const q = debouncedSearch.trim();
    if (q.length < 2) return;
    const variant = getMemodoExperimentVariant();
    trackMemodoEvent("memodo_funnel_search", { query_length: q.length, query: q.slice(0, 80) });
    trackMemodoEvent("memodo_funnel_step", { step: "search", query: q.slice(0, 120), variant });

    const key = "memodo_recent_searches_v1";
    setRecentSearches((prev) => {
      const next = [q, ...prev.filter((item) => item !== q)].slice(0, 8);
      window.localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [debouncedSearch]);

  useEffect(() => {
    const searchRaw = window.localStorage.getItem("memodo_recent_searches_v1");
    const viewedRaw = window.localStorage.getItem("memodo_recently_viewed_v1");
    if (searchRaw) {
      try {
        setRecentSearches(JSON.parse(searchRaw) as string[]);
      } catch {
        setRecentSearches([]);
      }
    }
    if (viewedRaw) {
      try {
        setRecentlyViewed(JSON.parse(viewedRaw) as Array<{ id: string; name: string }>);
      } catch {
        setRecentlyViewed([]);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (requiresSearch && trimmedSearch.length < 2) {
      setProducts([]);
      setTotal(0);
      setOffset(0);
      setError("");
      setLoading(false);
      return () => controller.abort();
    }

    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (inStockOnly) params.set("in_stock", "1");
    if (promoOnly) params.set("promo", "1");
    if (trimmedSearch) params.set("q", trimmedSearch);
    params.set("sort", sortBy);
    params.set("limit", String(PAGE_SIZE));
    params.set("offset", "0");

    setLoading(true);
    setError("");
    fetch(`/api/memodo/products?${params.toString()}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Failed to fetch products"))))
      .then((data: ApiResponse) => {
        setProducts(data.products || []);
        setTotal(data.count || 0);
        setOffset((data.products || []).length);
      })
      .catch(() => {
        setProducts([]);
        setTotal(0);
        setOffset(0);
        setError("Nepodařilo se načíst produkty. Zkus to prosím znovu.");
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [category, inStockOnly, promoOnly, trimmedSearch, sortBy, requiresSearch, reloadKey]);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (inStockOnly) params.set("in_stock", "1");
      if (promoOnly) params.set("promo", "1");
      if (trimmedSearch) params.set("q", trimmedSearch);
      params.set("sort", sortBy);
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));

      const response = await fetch(`/api/memodo/products?${params.toString()}`);
      if (!response.ok) return;
      const data = (await response.json()) as ApiResponse;
      const next = data.products || [];
      setProducts((prev) => [...prev, ...next]);
      setTotal(data.count || 0);
      setOffset((prev) => prev + next.length);
      trackMemodoEvent("memodo_catalog_load_more", { offset, loaded: next.length });
      setError("");
    } catch {
      setError("Nepodařilo se načíst další produkty.");
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="space-y-5 px-4 py-6">
      <MemodoViewTracker page="catalog" />
      <h1 className="text-2xl font-black tracking-tight">Katalog</h1>
      <p className="text-xs text-gray-500">Rychlé vyhledání podle názvu, SKU nebo značky</p>

      <div className="sticky top-[108px] z-20 -mx-1 rounded-2xl border border-gray-200 bg-[#EFEFEF]/95 p-2 backdrop-blur supports-[backdrop-filter]:bg-[#EFEFEF]/80">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Hledat produkt..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 rounded-xl border-gray-200 bg-white pl-10"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              aria-label="Vymazat hledání"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          ) : null}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setFiltersOpen((prev) => !prev)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-700"
          >
            <SlidersHorizontal className="h-4 w-4 text-gray-500" />
            Filtry
            {filtersOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
          </button>
          <button
            type="button"
            onClick={() => setInStockOnly((prev) => !prev)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
              inStockOnly ? "bg-green-100 text-green-700" : "border border-gray-200 bg-white text-gray-600"
            } min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30`}
          >
            Jen skladem
          </button>
          <button
            type="button"
            onClick={() => setPromoOnly((prev) => !prev)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
              promoOnly ? "bg-yellow-100 text-yellow-700" : "border border-gray-200 bg-white text-gray-600"
            } min-h-[40px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30`}
          >
            Jen akce
          </button>
        </div>

        {filtersOpen ? (
          <div className="mt-2 space-y-2 rounded-xl border border-gray-200 bg-white p-2">
            <div className="grid grid-cols-2 gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-700"
              >
                <option value="">Kategorie</option>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-700"
              >
                <option value="popular">Doporučené</option>
                <option value="price_asc">Nejlevnější</option>
                <option value="price_desc">Nejdražší</option>
                <option value="name">A-Z</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {quickCategoryChips.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => setCategory(chip.value)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                    category === chip.value
                      ? "bg-slate-900 text-white"
                      : "border border-gray-200 bg-white text-gray-600"
                  } min-h-[38px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30`}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={resetAllFilters}
              className="min-h-[38px] rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
            >
              Reset filtrů
            </button>
          </div>
        ) : null}
      </div>

      <div className="sticky top-[196px] z-10 -mx-1 rounded-xl border border-gray-200 bg-white/90 px-3 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-gray-700">
            {requiresSearch && trimmedSearch.length < 2
              ? "Napiš alespoň 2 znaky"
              : loading
                ? "Načítám…"
                : `${total} produktů`}
          </p>
          {hasActiveFilters ? (
            <button
              type="button"
              onClick={resetAllFilters}
              className="text-[11px] font-semibold text-gray-500 underline"
            >
              Vyčistit vše
            </button>
          ) : null}
        </div>
        {activeFilterChips.length > 0 ? (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5">
            {activeFilterChips.map((chip) => (
              <button
                key={`active-${chip.key}`}
                type="button"
                onClick={chip.clear}
                className="inline-flex min-h-[28px] items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-semibold whitespace-nowrap text-slate-700"
              >
                {chip.label}
                <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800">
          <p>{error}</p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setReloadKey((prev) => prev + 1)}
              className="min-h-[44px] rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-800"
            >
              Zkusit znovu
            </button>
            <Link
              href="/Memodo/poptavka"
              className="min-h-[44px] rounded-lg bg-[#FFE500] px-3 py-2 text-xs font-bold text-black"
            >
              Přejít na poptávku
            </Link>
          </div>
        </div>
      ) : null}

      {activeFilterChips.length > 0 ? (
        <div>
          <p className="mb-1 text-[11px] font-semibold text-gray-500">Aktivní filtry</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {activeFilterChips.map((chip) => (
              <button
                key={`content-active-${chip.key}`}
                type="button"
                onClick={chip.clear}
                className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-gray-200 bg-white px-3 text-[11px] font-semibold whitespace-nowrap text-gray-700"
              >
                {chip.label}
                <X className="h-3 w-3 text-gray-500" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!trimmedSearch && recentSearches.length > 0 ? (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-gray-500">Nedávná hledání</p>
            {recentSearches.length > 4 ? (
              <button
                type="button"
                onClick={() => setShowAllRecent((prev) => !prev)}
                className="text-[11px] font-semibold text-gray-500 underline"
              >
                {showAllRecent ? "Méně" : "Více"}
              </button>
            ) : null}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(showAllRecent ? recentSearches : recentSearches.slice(0, 4)).map((item) => (
              <button
                key={`recent-${item}`}
                type="button"
                onClick={() => setSearch(item)}
                className="min-h-[36px] whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {!trimmedSearch && recentlyViewed.length > 0 ? (
        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[11px] font-semibold text-gray-500">Naposledy prohlížené</p>
            {recentlyViewed.length > 4 ? (
              <button
                type="button"
                onClick={() => setShowAllViewed((prev) => !prev)}
                className="text-[11px] font-semibold text-gray-500 underline"
              >
                {showAllViewed ? "Méně" : "Více"}
              </button>
            ) : null}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(showAllViewed ? recentlyViewed : recentlyViewed.slice(0, 4)).map((item) => (
              <Link
                key={`viewed-${item.id}`}
                href={`/Memodo/produkt/${item.id}`}
                className="min-h-[36px] whitespace-nowrap rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/30"
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {!loading && products.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {products.map((product) => (
            <MemodoProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="aspect-square animate-pulse bg-gray-100" />
              <div className="space-y-2 p-3">
                <div className="h-2.5 w-16 animate-pulse rounded bg-gray-100" />
                <div className="h-3.5 w-full animate-pulse rounded bg-gray-100" />
                <div className="h-3.5 w-4/5 animate-pulse rounded bg-gray-100" />
                <div className="mt-2 h-9 animate-pulse rounded-xl bg-gray-100" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-10 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-200" />
          <p className="mt-3 text-sm font-semibold text-gray-700">Žádné produkty pro tento dotaz</p>
          <p className="mt-1 text-xs text-gray-500">
            {inStockOnly
              ? "Nenašli jsme produkty skladem. Zkuste vypnout filtr Jen skladem."
              : promoOnly
                ? "Nenašli jsme akční produkty. Zkuste vypnout filtr Jen akce."
                : category
                  ? "V této kategorii nyní nic neodpovídá dotazu."
                  : "Zkus změnit filtr, nebo napiš AI rádci co hledáš."}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {inStockOnly ? (
              <button
                type="button"
                onClick={() => setInStockOnly(false)}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold text-gray-700"
              >
                Vypnout Jen skladem
              </button>
            ) : null}
            {promoOnly ? (
              <button
                type="button"
                onClick={() => setPromoOnly(false)}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold text-gray-700"
              >
                Vypnout Jen akce
              </button>
            ) : null}
            {category ? (
              <button
                type="button"
                onClick={() => setCategory("")}
                className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold text-gray-700"
              >
                Všechny kategorie
              </button>
            ) : null}
            {quickCategoryChips
              .filter((chip) => chip.value)
              .map((chip) => (
                <button
                  key={`empty-${chip.value}`}
                  type="button"
                  onClick={() => setCategory(chip.value)}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold text-gray-700"
                >
                  {chip.label}
                </button>
              ))}
          </div>
        </div>
      )}

      {!loading && products.length > 0 && products.length < total ? (
        <div className="pt-2">
          <Button
            type="button"
            disabled={loadingMore}
            onClick={loadMore}
            className="w-full rounded-xl border border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
          >
            {loadingMore ? "Načítám..." : "Načíst další produkty"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
