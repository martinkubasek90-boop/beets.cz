import { createClient as createServerSupabaseClient } from "@/lib/supabase/server";
import { getMemodoServiceClient } from "@/lib/memodo-catalog";
import type { Product } from "@/lib/memodo-data";
import { cookies } from "next/headers";

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function isMemodoEmailAllowed(email: string) {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;

  const supabase = getMemodoServiceClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from("memodo_price_allowlist")
    .select("email,is_active")
    .eq("email", normalized)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();

  if (error || !data) return false;
  return true;
}

export async function getMemodoViewerPriceAccess() {
  let authEmail = "";
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    authEmail = data.user?.email?.trim().toLowerCase() || "";
  } catch {
    authEmail = "";
  }

  if (authEmail) {
    const canSeePrices = await isMemodoEmailAllowed(authEmail);
    return { canSeePrices, email: authEmail };
  }

  try {
    const cookieStore = await cookies();
    const emailFromCookie = normalizeEmail(cookieStore.get("memodo_price_email")?.value || "");
    if (!emailFromCookie) return { canSeePrices: false, email: "" };
    const canSeePrices = await isMemodoEmailAllowed(emailFromCookie);
    return { canSeePrices, email: emailFromCookie };
  } catch {
    return { canSeePrices: false, email: "" };
  }
}

export function maskProductPrices<T extends Product>(product: T, canSeePrices: boolean): T {
  if (canSeePrices) return product;
  return {
    ...product,
    price: undefined,
    price_with_vat: undefined,
    original_price: undefined,
  };
}

export function maskProductPriceList<T extends Product>(products: T[], canSeePrices: boolean): T[] {
  if (canSeePrices) return products;
  return products.map((product) => maskProductPrices(product, false));
}
