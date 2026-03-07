"use client";

import { useMemo, useState } from "react";
import { Package, Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { MemodoProductCard } from "@/components/memodo/product-card";
import { categoryLabels, type Product } from "@/lib/memodo-data";

export function MemodoCatalogPageClient({ initialProducts }: { initialProducts: Product[] }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  const filtered = useMemo(() => {
    return initialProducts.filter((p) => {
      if (category && p.category !== category) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (
        p.name?.toLowerCase().includes(s) ||
        p.brand?.toLowerCase().includes(s) ||
        p.art_number?.toLowerCase().includes(s)
      );
    });
  }, [initialProducts, category, search]);

  return (
    <div className="space-y-5 px-4 py-6">
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
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs text-gray-700"
          >
            <option value="">Všechny kategorie</option>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
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

