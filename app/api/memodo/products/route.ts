import { NextResponse } from "next/server";
import { getMemodoProducts, getMemodoServiceClient } from "@/lib/memodo-catalog";
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
  const inStockOnly = searchParams.get("in_stock") === "1";
  const sort = searchParams.get("sort") || "popular";
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.max(1, Math.min(120, Number(searchParams.get("limit") || "40")));
  const offset = Math.max(0, Number(searchParams.get("offset") || "0"));

  const supabase = getMemodoServiceClient();
  if (supabase) {
    let query = supabase
      .from("memodo_products")
      .select(
        "external_id,name,category,brand,price,price_with_vat,image_url,description,specifications,art_number,in_stock,is_promo,promo_label,original_price",
        { count: "exact" },
      )
      .eq("is_active", true);

    if (category && categories.has(category as ProductCategory)) {
      query = query.eq("category", category);
    }
    if (promoOnly) query = query.eq("is_promo", true);
    if (inStockOnly) query = query.eq("in_stock", true);
    if (q) {
      const escaped = q.replace(/[%_]/g, "");
      query = query.or(`name.ilike.%${escaped}%,brand.ilike.%${escaped}%,art_number.ilike.%${escaped}%`);
    }

    if (sort === "price_asc") {
      query = query.order("price", { ascending: true, nullsFirst: false });
    } else if (sort === "price_desc") {
      query = query.order("price", { ascending: false, nullsFirst: false });
    } else if (sort === "name") {
      query = query.order("name", { ascending: true });
    } else {
      query = query.order("is_promo", { ascending: false }).order("in_stock", { ascending: false }).order("name");
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1);
    if (!error && data) {
      const products = data.map((row) => ({
        id: row.external_id as string,
        name: row.name as string,
        category: row.category as ProductCategory,
        brand: (row.brand as string | null) || undefined,
        price: (row.price as number | null) ?? undefined,
        price_with_vat: (row.price_with_vat as number | null) ?? undefined,
        image_url: (row.image_url as string | null) || undefined,
        description: (row.description as string | null) || undefined,
        specifications: (row.specifications as Record<string, string | number | boolean> | null) || {},
        art_number: (row.art_number as string | null) || undefined,
        in_stock: (row.in_stock as boolean | null) ?? true,
        is_promo: (row.is_promo as boolean | null) ?? false,
        promo_label: (row.promo_label as string | null) || undefined,
        original_price: (row.original_price as number | null) ?? undefined,
      }));

      return NextResponse.json({
        ok: true,
        count: count ?? products.length,
        offset,
        limit,
        products,
      });
    }
  }

  // Fallback mode (without service role): in-memory filter/slice.
  let products = await getMemodoProducts();
  if (category && categories.has(category as ProductCategory)) {
    products = products.filter((item) => item.category === category);
  }
  if (promoOnly) products = products.filter((item) => item.is_promo);
  if (inStockOnly) products = products.filter((item) => item.in_stock);
  if (q) {
    const search = q.toLowerCase();
    products = products.filter(
      (item) =>
        item.name.toLowerCase().includes(search) ||
        item.brand?.toLowerCase().includes(search) ||
        item.art_number?.toLowerCase().includes(search),
    );
  }
  if (sort === "price_asc") {
    products = [...products].sort((a, b) => (a.price || Number.MAX_SAFE_INTEGER) - (b.price || Number.MAX_SAFE_INTEGER));
  } else if (sort === "price_desc") {
    products = [...products].sort((a, b) => (b.price || 0) - (a.price || 0));
  } else if (sort === "name") {
    products = [...products].sort((a, b) => a.name.localeCompare(b.name, "cs"));
  } else {
    products = [...products].sort((a, b) => Number(Boolean(b.is_promo)) - Number(Boolean(a.is_promo)));
  }

  return NextResponse.json({
    ok: true,
    count: products.length,
    offset,
    limit,
    products: products.slice(offset, offset + limit),
  });
}
