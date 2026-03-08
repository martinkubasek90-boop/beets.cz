"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Package, Tag } from "lucide-react";
import { Product, categoryLabels } from "@/lib/memodo-data";
import { trackMemodoEvent } from "@/lib/memodo-analytics";

function rememberViewedProduct(product: Product) {
  if (typeof window === "undefined") return;
  const key = "memodo_recently_viewed_v1";
  const current = window.localStorage.getItem(key);
  let parsed: Array<{ id: string; name: string }> = [];
  if (current) {
    try {
      parsed = JSON.parse(current) as Array<{ id: string; name: string }>;
    } catch {
      parsed = [];
    }
  }
  const next = [{ id: product.id, name: product.name }, ...parsed.filter((item) => item.id !== product.id)].slice(0, 8);
  window.localStorage.setItem(key, JSON.stringify(next));
}

export function MemodoProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/Memodo/produkt/${product.id}`}
      onClick={() => {
        rememberViewedProduct(product);
        trackMemodoEvent("memodo_open_product_detail", {
          product_id: product.id,
          category: product.category,
          promo: Boolean(product.is_promo),
        });
      }}
      className="group overflow-hidden rounded-2xl border border-gray-200 bg-white transition-all duration-300 hover:border-[#FFE500] hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
    >
      <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-[#F7F7F7] p-4">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            width={420}
            height={420}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <Package className="h-16 w-16 text-gray-200" />
        )}

        {product.is_promo && (
          <div className="absolute left-2 top-2 flex flex-col gap-1">
            <Badge className="border-0 bg-[#FFE500] text-[10px] font-bold text-black">% Akce</Badge>
            {product.promo_label && (
              <Badge className="border-0 bg-cyan-400 text-[10px] font-bold text-black">
                {product.promo_label}
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="mb-1 flex items-center gap-1">
          <span className="text-[10px] font-medium uppercase text-gray-400">{product.brand}</span>
          {product.art_number && (
            <span className="ml-auto text-[10px] text-gray-300">Art. {product.art_number}</span>
          )}
        </div>

        <h3 className="min-h-[2.5rem] text-xs font-semibold leading-snug text-gray-900 line-clamp-2">
          {product.name}
        </h3>

        <div className="mt-2 flex items-center gap-1.5">
          <Badge variant="outline" className="border-gray-200 text-[10px] text-gray-500">
            {categoryLabels[product.category] || product.category}
          </Badge>
          {product.in_stock ? (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">
              Skladem
            </span>
          ) : (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700">
              Na objednávku
            </span>
          )}
        </div>

        <div className="mt-2 rounded-xl bg-gray-50 px-2.5 py-2">
          {product.price ? (
            <div className="flex flex-wrap items-end gap-1.5">
              {product.original_price && product.original_price > product.price && (
                <span className="text-[10px] text-gray-400 line-through">
                  {product.original_price.toLocaleString("cs-CZ")} Kč
                </span>
              )}
              <span className="text-base font-black text-gray-900">
                {product.price.toLocaleString("cs-CZ")} Kč
              </span>
              <span className="text-[10px] text-gray-400">bez DPH</span>
            </div>
          ) : (
            <span className="flex w-fit items-center gap-1 rounded-lg bg-[#FFE500]/10 px-2 py-1 text-xs font-medium text-[#C7A000]">
              <Tag className="h-3 w-3" /> Na dotaz
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
