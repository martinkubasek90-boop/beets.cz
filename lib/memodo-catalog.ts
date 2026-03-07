import { createClient } from "@supabase/supabase-js";
import { products as fallbackProducts, promotions as fallbackPromotions } from "@/lib/memodo-data";
import type { Product, Promotion } from "@/lib/memodo-data";

type ProductRow = {
  external_id: string;
  name: string;
  category: Product["category"];
  brand: string | null;
  price: number | null;
  price_with_vat: number | null;
  image_url: string | null;
  description: string | null;
  specifications: Product["specifications"] | null;
  art_number: string | null;
  in_stock: boolean | null;
  is_promo: boolean | null;
  promo_label: string | null;
  original_price: number | null;
  is_active: boolean | null;
};

type PromotionRow = {
  external_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  discount_percent: number | null;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean | null;
  highlight_color: string | null;
  category: Promotion["category"] | null;
};

export function getMemodoServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function mapProductRow(row: ProductRow): Product {
  return {
    id: row.external_id,
    name: row.name,
    category: row.category,
    brand: row.brand || undefined,
    price: row.price ?? undefined,
    price_with_vat: row.price_with_vat ?? undefined,
    image_url: row.image_url || undefined,
    description: row.description || undefined,
    specifications: row.specifications || {},
    art_number: row.art_number || undefined,
    in_stock: row.in_stock ?? true,
    is_promo: row.is_promo ?? false,
    promo_label: row.promo_label || undefined,
    original_price: row.original_price ?? undefined,
  };
}

function mapPromotionRow(row: PromotionRow): Promotion {
  return {
    id: row.external_id,
    title: row.title,
    description: row.description || undefined,
    image_url: row.image_url || undefined,
    discount_percent: row.discount_percent ?? undefined,
    valid_from: row.valid_from || undefined,
    valid_to: row.valid_to || undefined,
    is_active: row.is_active ?? true,
    highlight_color: row.highlight_color || "#FFE500",
    category: row.category || undefined,
  };
}

export async function getMemodoProducts(): Promise<Product[]> {
  const supabase = getMemodoServiceClient();
  if (!supabase) return fallbackProducts;

  const { data, error } = await supabase
    .from("memodo_products")
    .select(
      "external_id,name,category,brand,price,price_with_vat,image_url,description,specifications,art_number,in_stock,is_promo,promo_label,original_price,is_active",
    )
    .eq("is_active", true)
    .order("is_promo", { ascending: false })
    .order("name", { ascending: true })
    .limit(3000);

  if (error || !data?.length) return fallbackProducts;
  return (data as ProductRow[]).map(mapProductRow);
}

export async function getMemodoProductById(id: string): Promise<Product | null> {
  const supabase = getMemodoServiceClient();
  if (!supabase) return fallbackProducts.find((product) => product.id === id) || null;

  const { data, error } = await supabase
    .from("memodo_products")
    .select(
      "external_id,name,category,brand,price,price_with_vat,image_url,description,specifications,art_number,in_stock,is_promo,promo_label,original_price,is_active",
    )
    .eq("external_id", id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error || !data) return fallbackProducts.find((product) => product.id === id) || null;
  return mapProductRow(data as ProductRow);
}

export async function getMemodoPromotions(): Promise<Promotion[]> {
  const supabase = getMemodoServiceClient();
  if (!supabase) return fallbackPromotions;

  const { data, error } = await supabase
    .from("memodo_promotions")
    .select("external_id,title,description,image_url,discount_percent,valid_from,valid_to,is_active,highlight_color,category")
    .eq("is_active", true)
    .order("valid_to", { ascending: true })
    .limit(100);

  if (error || !data?.length) return fallbackPromotions;
  return (data as PromotionRow[]).map(mapPromotionRow);
}

