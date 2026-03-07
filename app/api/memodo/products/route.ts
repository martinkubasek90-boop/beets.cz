import { NextResponse } from "next/server";
import { getMemodoProducts } from "@/lib/memodo-catalog";
import type { ProductCategory } from "@/lib/memodo-data";

export const runtime = "nodejs";

const categories = new Set<ProductCategory>([
  "panely",
  "stridace",
  "baterie",
  "ems",
  "montazni_systemy",
  "nabijeci_stanice",
  "tepelna_cerpadla",
  "prislusenstvi",
]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const promoOnly = searchParams.get("promo") === "1";
  const limit = Math.max(1, Math.min(3000, Number(searchParams.get("limit") || "200")));

  let products = await getMemodoProducts();

  if (category && categories.has(category as ProductCategory)) {
    products = products.filter((item) => item.category === category);
  }

  if (promoOnly) {
    products = products.filter((item) => item.is_promo);
  }

  return NextResponse.json({
    ok: true,
    count: products.length,
    products: products.slice(0, limit),
  });
}
