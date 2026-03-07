import { Percent, Sparkles } from "lucide-react";
import { MemodoProductCard } from "@/components/memodo/product-card";
import { MemodoViewTracker } from "@/components/memodo/mobile-ux";
import { getMemodoProducts } from "@/lib/memodo-catalog";
import { getMemodoAdminConfig } from "@/lib/memodo-admin-config";

export const revalidate = 300;

export default async function MemodoFeaturedProductsPage() {
  const [products, config] = await Promise.all([getMemodoProducts(), getMemodoAdminConfig()]);
  const featuredByConfig = config.featuredProductIds
    .map((id) => products.find((product) => product.id === id))
    .filter(Boolean);
  const featured =
    featuredByConfig.length > 0
      ? (featuredByConfig as typeof products).slice(0, 80)
      : products.filter((product) => product.is_promo).slice(0, 80);

  return (
    <div className="space-y-6 px-4 py-6">
      <MemodoViewTracker page="featured_products" />
      <div>
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-[#FFE500] px-3 py-1 text-xs font-bold text-black">
          <Percent className="h-3 w-3" /> Akční produkty
        </div>
        <h1 className="text-2xl font-black tracking-tight">Vybrané nabídky</h1>
        <p className="mt-1 text-sm text-gray-500">Zde vidíš pouze vybrané produkty. Ostatní najdeš přes fulltext.</p>
      </div>

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
        </div>
      )}
    </div>
  );
}
