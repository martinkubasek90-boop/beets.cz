"use client";

import { useEffect, useState } from "react";
import { Package, Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MemodoProductCard } from "@/components/memodo/product-card";
import { categoryLabels, type Product } from "@/lib/memodo-data";
import { trackMemodoEvent } from "@/lib/memodo-analytics";
import { MemodoViewTracker } from "@/components/memodo/mobile-ux";
import { Button } from "@/components/ui/button";

type ApiResponse = {
  ok: boolean;
  count: number;
  products: Product[];
};

const PAGE_SIZE = 40;
const quickCategoryChips = [
  { value: "", label: "Vše" },
  { value: "stridace", label: "Střídače" },
  { value: "baterie", label: "Baterie" },
  { value: "panely", label: "Panely" },
];

export function MemodoCatalogPageClient({
  requiresSearch = true,
  initialCategory = "",
}: {
  requiresSearch?: boolean;
  initialCategory?: string;
}) {
  const [search, setSearch] = useState("");
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
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<Array<{ id: string; name: string }>>([]);

  const trimmedSearch = debouncedSearch.trim();

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
    const q = debouncedSearch.trim();
    if (q.length < 2) return;
    trackMemodoEvent("memodo_funnel_search", { query_length: q.length });

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
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [category, inStockOnly, promoOnly, trimmedSearch, sortBy, requiresSearch]);

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
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          ) : null}
        </div>

        <div className="mt-2 flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 flex-shrink-0 text-gray-400" />
          <div className="grid w-full grid-cols-2 gap-2">
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
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {quickCategoryChips.map((chip) => (
            <button
              key={chip.label}
              type="button"
              onClick={() => setCategory(chip.value)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                category === chip.value
                  ? "bg-slate-900 text-white"
                  : "border border-gray-200 bg-white text-gray-600"
              }`}
            >
              {chip.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setInStockOnly((prev) => !prev)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
              inStockOnly ? "bg-green-100 text-green-700" : "border border-gray-200 bg-white text-gray-600"
            }`}
          >
            Jen skladem
          </button>
          <button
            type="button"
            onClick={() => setPromoOnly((prev) => !prev)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
              promoOnly ? "bg-yellow-100 text-yellow-700" : "border border-gray-200 bg-white text-gray-600"
            }`}
          >
            Jen akce
          </button>
          <button
            type="button"
            onClick={() => {
              setCategory("");
              setInStockOnly(false);
              setPromoOnly(false);
              setSearch("");
            }}
            className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold text-gray-500"
          >
            Reset
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400">
        {requiresSearch && trimmedSearch.length < 2
          ? "Napiš alespoň 2 znaky do fulltextu pro zobrazení produktů."
          : loading
            ? "Načítám produkty..."
            : `${total} produktů`}
      </p>
      {!trimmedSearch && recentSearches.length > 0 ? (
        <div>
          <p className="mb-1 text-[11px] font-semibold text-gray-500">Nedávná hledání</p>
          <div className="flex flex-wrap gap-2">
            {recentSearches.slice(0, 5).map((item) => (
              <button
                key={`recent-${item}`}
                type="button"
                onClick={() => setSearch(item)}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold text-gray-700"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {!trimmedSearch && recentlyViewed.length > 0 ? (
        <div>
          <p className="mb-1 text-[11px] font-semibold text-gray-500">Naposledy prohlížené</p>
          <div className="flex flex-wrap gap-2">
            {recentlyViewed.slice(0, 4).map((item) => (
              <a
                key={`viewed-${item.id}`}
                href={`/Memodo/produkt/${item.id}`}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold text-gray-700"
              >
                {item.name}
              </a>
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
            <div key={idx} className="h-64 animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-10 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-200" />
          <p className="mt-3 text-sm font-semibold text-gray-700">Žádné produkty pro tento dotaz</p>
          <p className="mt-1 text-xs text-gray-500">Zkus změnit filtr, nebo napiš AI rádci co hledáš.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
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
