import { Sparkles } from "lucide-react";
import Link from "next/link";
import { MemodoProductCard } from "@/components/memodo/product-card";
import { MemodoViewTracker } from "@/components/memodo/mobile-ux";
import { getMemodoProducts } from "@/lib/memodo-catalog";
import { getMemodoAdminConfig } from "@/lib/memodo-admin-config";
import { getMemodoViewerPriceAccess, maskProductPriceList } from "@/lib/memodo-price-access";

export const revalidate = 300;

export default async function MemodoFeaturedProductsPage() {
  const [productsRaw, config, access] = await Promise.all([
    getMemodoProducts(),
    getMemodoAdminConfig(),
    getMemodoViewerPriceAccess(),
  ]);
  const products = maskProductPriceList(productsRaw, access.canSeePrices);
  const featuredByConfig = config.featuredProductIds
    .map((id) => products.find((product) => product.id === id))
    .filter(Boolean);
  const featured =
    featuredByConfig.length > 0
      ? (featuredByConfig as typeof products).slice(0, 80)
      : products.filter((product) => product.is_promo).slice(0, 80);

  return (
    <div className="space-y-6 px-4 pb-6 pt-2">
      <MemodoViewTracker page="featured_products" />
      {featured.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {featured.map((product) => (
            <MemodoProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white py-12 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-gray-200" />
          <p className="mt-3 text-sm text-gray-500">Aktuálně nejsou vybrané produkty nastavené.</p>
          <div className="mt-4 flex justify-center gap-2">
            <Link
              href="/Memodo/katalog?category=stridace"
              className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold text-gray-700"
            >
              Střídače
            </Link>
            <Link
              href="/Memodo/katalog?category=baterie"
              className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold text-gray-700"
            >
              Baterie
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
