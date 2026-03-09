import { NextResponse } from "next/server";
import { getMemodoProducts, getMemodoServiceClient } from "@/lib/memodo-catalog";
import { categoryLabels, type ProductCategory } from "@/lib/memodo-data";
import { getMemodoViewerPriceAccess, maskProductPriceList } from "@/lib/memodo-price-access";

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

type ProductListItem = {
  id: string;
  name: string;
  category: ProductCategory;
  brand?: string;
  price?: number;
  price_with_vat?: number;
  image_url?: string;
  description?: string;
  specifications?: Record<string, string | number | boolean>;
  art_number?: string;
  in_stock?: boolean;
  is_promo?: boolean;
  promo_label?: string;
  original_price?: number;
};

const synonymGroups = [
  ["stridac", "stridace", "menic", "menice", "invertor", "invertory", "inverter", "inverters"],
  ["baterie", "baterka", "battery", "storage", "uloziste", "ulozistem", "akumulator", "akku"],
  ["panel", "panely", "pv", "fotovoltaika", "fotovoltaicky", "photovoltaic", "module", "modul"],
  ["nabijecka", "nabijeci", "ev", "wallbox", "charger"],
  ["tepelne", "tepelna", "tepelna_cerpadla", "cerpadlo", "tc", "heatpump", "heat", "pump"],
  ["montaz", "montazni", "konstrukce", "drzak", "mounting", "racking"],
  ["prislusenstvi", "kabel", "konektor", "connector", "accessory", "accessories"],
  ["ems", "rizeni", "management", "energy", "monitoring"],
];

const categoryKeywordMap: Array<{ key: string; category: ProductCategory }> = [
  { key: "panel", category: "panely" },
  { key: "pv", category: "panely" },
  { key: "stridac", category: "stridace" },
  { key: "menic", category: "stridace" },
  { key: "invertor", category: "stridace" },
  { key: "inverter", category: "stridace" },
  { key: "baterie", category: "baterie" },
  { key: "storage", category: "baterie" },
  { key: "uloziste", category: "baterie" },
  { key: "ems", category: "ems" },
  { key: "nabijecka", category: "nabijeci_stanice" },
  { key: "wallbox", category: "nabijeci_stanice" },
  { key: "charger", category: "nabijeci_stanice" },
  { key: "tepelna", category: "tepelna_cerpadla" },
  { key: "cerpadlo", category: "tepelna_cerpadla" },
  { key: "heatpump", category: "tepelna_cerpadla" },
  { key: "montaz", category: "montazni_systemy" },
  { key: "konstrukce", category: "montazni_systemy" },
  { key: "prislusenstvi", category: "prislusenstvi" },
  { key: "accessory", category: "prislusenstvi" },
];

const synonymLookup = new Map<string, string[]>();
for (const group of synonymGroups) {
  for (const term of group) {
    synonymLookup.set(term, group);
  }
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeForSearch(value: string) {
  return normalize(value)
    .replace(/[_/()+.,]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeForSearch(value)
    .split(" ")
    .filter((token) => token.length >= 2)
    .slice(0, 8);
}

function expandTokens(tokens: string[]) {
  const out = new Set<string>();
  for (const token of tokens) {
    out.add(token);
    const group = synonymLookup.get(token);
    if (group) {
      for (const synonym of group) out.add(synonym);
    }
  }
  return Array.from(out);
}

function compactSku(value: string) {
  return normalize(value).replace(/[^a-z0-9]/g, "");
}

function looksLikeSkuQuery(value: string) {
  const normalized = normalizeForSearch(value);
  if (!normalized) return false;
  const hasLetter = /[a-z]/.test(normalized);
  const hasDigit = /[0-9]/.test(normalized);
  if (hasLetter && hasDigit && normalized.length >= 4) return true;
  return /^[a-z0-9\-_]{5,}$/i.test(value.trim()) && !value.includes(" ");
}

function detectCategoryIntent(tokens: string[]) {
  for (const token of tokens) {
    const match = categoryKeywordMap.find((item) => item.key === token);
    if (match) return match.category;
  }
  return undefined;
}

function escapeLikeTerm(value: string) {
  return value.replace(/[%_,]/g, " ").replace(/\s+/g, " ").trim();
}

function toBigrams(value: string) {
  const clean = normalize(value).replace(/\s+/g, " ");
  if (clean.length < 2) return [clean];
  const out: string[] = [];
  for (let i = 0; i < clean.length - 1; i += 1) out.push(clean.slice(i, i + 2));
  return out;
}

function diceSimilarity(a: string, b: string) {
  const aBigrams = toBigrams(a);
  const bBigrams = toBigrams(b);
  if (!aBigrams.length || !bBigrams.length) return 0;
  const bCounts = new Map<string, number>();
  for (const gram of bBigrams) {
    bCounts.set(gram, (bCounts.get(gram) || 0) + 1);
  }
  let overlap = 0;
  for (const gram of aBigrams) {
    const count = bCounts.get(gram) || 0;
    if (count > 0) {
      overlap += 1;
      bCounts.set(gram, count - 1);
    }
  }
  return (2 * overlap) / (aBigrams.length + bBigrams.length);
}

function scoreSearch(item: ProductListItem, q: string) {
  const query = normalizeForSearch(q);
  const queryTokens = tokenize(q);
  const expandedTokens = expandTokens(queryTokens);

  const name = normalizeForSearch(item.name || "");
  const brand = normalizeForSearch(item.brand || "");
  const sku = normalizeForSearch(item.art_number || "");
  const categoryKey = normalizeForSearch(item.category || "");
  const categoryLabel = normalizeForSearch(categoryLabels[item.category] || "");
  const combined = `${name} ${brand} ${sku} ${categoryKey} ${categoryLabel}`.trim();

  const querySku = compactSku(q);
  const itemSku = compactSku(item.art_number || "");

  let score = 0;

  if (querySku && itemSku) {
    if (itemSku === querySku) score += 380;
    else if (itemSku.startsWith(querySku)) score += 240;
    else if (itemSku.includes(querySku)) score += 140;
  }

  if (name === query) score += 110;
  else if (name.startsWith(query)) score += 90;
  else if (name.includes(query)) score += 62;

  if (brand === query) score += 58;
  else if (brand.startsWith(query)) score += 42;
  else if (brand.includes(query)) score += 28;

  if (combined.includes(query)) score += 34;

  for (const token of expandedTokens) {
    if (token.length < 2) continue;
    if (name.startsWith(token)) score += 20;
    else if (name.includes(token)) score += 11;
    if (sku.startsWith(token)) score += 26;
    else if (sku.includes(token)) score += 16;
    if (brand.startsWith(token)) score += 10;
    else if (brand.includes(token)) score += 7;
    if (categoryKey.includes(token) || categoryLabel.includes(token)) score += 8;
  }

  const categoryIntent = detectCategoryIntent(expandedTokens);
  if (categoryIntent) {
    score += item.category === categoryIntent ? 28 : -8;
  }

  const fuzzyName = diceSimilarity(query, name);
  const fuzzyBrand = diceSimilarity(query, brand);
  const fuzzySku = diceSimilarity(query, sku);
  score += Math.round(fuzzyName * 26 + fuzzyBrand * 12 + fuzzySku * 18);

  if (item.is_promo) score += 2;
  if (item.in_stock) score += 8;
  else score -= 4;

  if (looksLikeSkuQuery(q) && itemSku && !itemSku.includes(querySku)) score -= 50;
  return score;
}

function matchesQuery(item: ProductListItem, q: string) {
  const skuQuery = compactSku(q);
  const itemSku = compactSku(item.art_number || "");
  if (looksLikeSkuQuery(q) && skuQuery) {
    if (!itemSku) return false;
    return itemSku.includes(skuQuery);
  }

  const queryNorm = normalizeForSearch(q);
  const tokens = tokenize(q);
  const expanded = expandTokens(tokens);

  const haystack = normalizeForSearch(
    `${item.name || ""} ${item.brand || ""} ${item.art_number || ""} ${item.category} ${categoryLabels[item.category] || ""}`,
  );
  if (!haystack) return false;
  if (queryNorm && haystack.includes(queryNorm)) return true;

  let matchedOriginalTokens = 0;
  for (const original of tokens) {
    const group = synonymLookup.get(original) || [original];
    const found = group.some((variant) => haystack.includes(variant));
    if (found) matchedOriginalTokens += 1;
  }

  if (tokens.length <= 1) return matchedOriginalTokens >= 1 || expanded.some((token) => haystack.includes(token));
  if (tokens.length === 2) return matchedOriginalTokens >= 2;
  return matchedOriginalTokens >= 2;
}

export async function GET(request: Request) {
  const access = await getMemodoViewerPriceAccess();
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const promoOnly = searchParams.get("promo") === "1";
  const inStockOnly = searchParams.get("in_stock") === "1";
  const sort = searchParams.get("sort") || "popular";
  const q = (searchParams.get("q") || "").trim();
  const limit = Math.max(1, Math.min(120, Number(searchParams.get("limit") || "40")));
  const offset = Math.max(0, Number(searchParams.get("offset") || "0"));
  const isSkuQuery = looksLikeSkuQuery(q);

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
      const tokens = tokenize(q).map(escapeLikeTerm).filter(Boolean).slice(0, 4);
      const fullTerm = escapeLikeTerm(q);
      const clauses = new Set<string>();
      if (fullTerm) {
        clauses.add(`name.ilike.%${fullTerm}%`);
        clauses.add(`brand.ilike.%${fullTerm}%`);
        clauses.add(`art_number.ilike.%${fullTerm}%`);
      }
      for (const token of tokens) {
        clauses.add(`name.ilike.%${token}%`);
        clauses.add(`brand.ilike.%${token}%`);
        clauses.add(`art_number.ilike.%${token}%`);
      }
      if (isSkuQuery && fullTerm) {
        clauses.add(`art_number.ilike.${fullTerm}%`);
      }
      const orFilter = Array.from(clauses).join(",");
      if (orFilter) query = query.or(orFilter);
    }

    const shouldRankByQuery = Boolean(q) && sort === "popular";
    if (sort === "price_asc") {
      query = query.order("price", { ascending: true, nullsFirst: false });
    } else if (sort === "price_desc") {
      query = query.order("price", { ascending: false, nullsFirst: false });
    } else if (sort === "name") {
      query = query.order("name", { ascending: true });
    } else if (!shouldRankByQuery) {
      query = query.order("is_promo", { ascending: false }).order("in_stock", { ascending: false }).order("name");
    }

    const rangeEnd = shouldRankByQuery ? (isSkuQuery ? 299 : 999) : offset + limit - 1;
    const rangeStart = shouldRankByQuery ? 0 : offset;
    const { data, error, count } = await query.range(rangeStart, rangeEnd);
    if (!error && data) {
      const mapped = data.map((row) => ({
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

      const products = shouldRankByQuery
        ? [...mapped]
            .sort((a, b) => scoreSearch(b, q) - scoreSearch(a, q))
            .slice(offset, offset + limit)
        : mapped;
      const visibleProducts = maskProductPriceList(products, access.canSeePrices);

      return NextResponse.json({
        ok: true,
        count: count ?? mapped.length,
        offset,
        limit,
        canSeePrices: access.canSeePrices,
        products: visibleProducts,
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
    products = products.filter((item) => matchesQuery(item, q));
    products = [...products].sort((a, b) => scoreSearch(b, q) - scoreSearch(a, q));
  }
  if (sort === "price_asc") {
    products = [...products].sort((a, b) => (a.price || Number.MAX_SAFE_INTEGER) - (b.price || Number.MAX_SAFE_INTEGER));
  } else if (sort === "price_desc") {
    products = [...products].sort((a, b) => (b.price || 0) - (a.price || 0));
  } else if (sort === "name") {
    products = [...products].sort((a, b) => a.name.localeCompare(b.name, "cs"));
  } else if (!q) {
    products = [...products].sort((a, b) => Number(Boolean(b.is_promo)) - Number(Boolean(a.is_promo)));
  }

  return NextResponse.json({
    ok: true,
    count: products.length,
    offset,
    limit,
    canSeePrices: access.canSeePrices,
    products: maskProductPriceList(products.slice(offset, offset + limit), access.canSeePrices),
  });
}
