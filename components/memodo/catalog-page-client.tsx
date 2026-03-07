"use client";

import { useEffect, useMemo, useState } from "react";
import { Package, Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MemodoProductCard } from "@/components/memodo/product-card";
import { categoryLabels, type Product } from "@/lib/memodo-data";
import { trackMemodoEvent } from "@/lib/memodo-analytics";
import { MemodoViewTracker } from "@/components/memodo/mobile-ux";

export function MemodoCatalogPageClient({ initialProducts }: { initialProducts: Product[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [promoOnly, setPromoOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"popular" | "price_asc" | "price_desc" | "name">("popular");

  const filtered = useMemo(() => {
    const list = initialProducts.filter((p) => {
      if (category && p.category !== category) return false;
      if (inStockOnly && !p.in_stock) return false;
      if (promoOnly && !p.is_promo) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        p.name?.toLowerCase().includes(s) ||
        p.brand?.toLowerCase().includes(s) ||
        p.art_number?.toLowerCase().includes(s)
      );
    });

    if (sortBy === "price_asc") {
      return [...list].sort((a, b) => (a.price || Number.MAX_SAFE_INTEGER) - (b.price || Number.MAX_SAFE_INTEGER));
    }
    if (sortBy === "price_desc") {
      return [...list].sort((a, b) => (b.price || 0) - (a.price || 0));
    }
    if (sortBy === "name") {
      return [...list].sort((a, b) => a.name.localeCompare(b.name, "cs"));
    }

    // "popular" fallback: promo + in-stock first.
    return [...list].sort((a, b) => Number(Boolean(b.is_promo)) - Number(Boolean(a.is_promo)));
  }, [initialProducts, category, inStockOnly, promoOnly, search, sortBy]);

  useEffect(() => {
    trackMemodoEvent("memodo_catalog_filter_change", {
      category: category || "all",
      in_stock_only: inStockOnly,
      promo_only: promoOnly,
      sort_by: sortBy,
      results: filtered.length,
    });
  }, [category, inStockOnly, promoOnly, sortBy, filtered.length]);

  return (
    <div className="space-y-5 px-4 py-6">
      <MemodoViewTracker page="catalog" />
      <h1 className="text-2xl font-black tracking-tight">Katalog</h1>

      <div className="space-y-3">
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

        <div className="flex items-center gap-2">
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setInStockOnly((prev) => !prev)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
              inStockOnly ? "bg-green-100 text-green-700" : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            Jen skladem
          </button>
          <button
            type="button"
            onClick={() => setPromoOnly((prev) => !prev)}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
              promoOnly ? "bg-yellow-100 text-yellow-700" : "bg-white text-gray-600 border border-gray-200"
            }`}
          >
            Jen akce
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-400">{filtered.length} produktů</p>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((product) => (
            <MemodoProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-200" />
          <p className="mt-3 text-sm text-gray-500">Žádné produkty</p>
        </div>
      )}
    </div>
  );
}
