import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle,
  FileText,
  Package,
  Shield,
  Tag,
  Truck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MemodoViewTracker } from "@/components/memodo/mobile-ux";
import { categoryLabels } from "@/lib/memodo-data";
import { getMemodoProductById, getMemodoProducts } from "@/lib/memodo-catalog";
import { getMemodoViewerPriceAccess, maskProductPrices } from "@/lib/memodo-price-access";

export const revalidate = 300;

export default async function MemodoProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const [productRaw, allProducts, access] = await Promise.all([
    getMemodoProductById(resolvedParams.id),
    getMemodoProducts(),
    getMemodoViewerPriceAccess(),
  ]);
  if (!productRaw) notFound();
  const product = maskProductPrices(productRaw, access.canSeePrices);

  const recommendedBattery =
    allProducts.find((item) => item.category === "baterie" && item.in_stock && item.brand === product.brand) ||
    allProducts.find((item) => item.category === "baterie" && item.in_stock);

  const specs = product.specifications || {};

  return (
    <div className="space-y-6 px-4 py-6">
      <MemodoViewTracker page="product_detail" />
      <Link href="/Memodo/katalog" className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Zpět na katalog
      </Link>

      <div className="relative flex aspect-square items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 p-8">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            width={900}
            height={900}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <Package className="h-32 w-32 text-gray-200" />
        )}
        {product.is_promo ? (
          <div className="absolute left-4 top-4 flex flex-col gap-1.5">
            <Badge className="border-0 bg-[#FFE500] font-bold text-black">% Akce</Badge>
            {product.promo_label ? (
              <Badge className="border-0 bg-cyan-400 font-bold text-black">{product.promo_label}</Badge>
            ) : null}
          </div>
        ) : null}
      </div>

      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="text-sm font-medium uppercase text-gray-400">{product.brand}</span>
          {product.art_number ? <span className="text-xs text-gray-300">| Art. {product.art_number}</span> : null}
        </div>
        <h1 className="text-2xl font-black tracking-tight">{product.name}</h1>
        <div className="mt-2 flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {categoryLabels[product.category]}
          </Badge>
          {product.in_stock ? (
            <span className="flex items-center gap-1 text-xs font-medium text-green-600">
              <CheckCircle className="h-3 w-3" /> Ihned k odeslání
            </span>
          ) : (
            <span className="text-xs font-medium text-orange-500">Na objednávku</span>
          )}
        </div>
      </div>

      <div className="rounded-xl bg-gray-50 p-5">
        {product.price ? (
          <div>
            {product.original_price && product.original_price > product.price ? (
              <div className="mb-1 flex items-center gap-2">
                <span className="text-sm text-gray-400 line-through">
                  {product.original_price.toLocaleString("cs-CZ")} Kč
                </span>
                <Badge className="border-0 bg-red-100 text-xs text-red-700">
                  -{Math.round((1 - product.price / product.original_price) * 100)}%
                </Badge>
              </div>
            ) : null}
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black">{product.price.toLocaleString("cs-CZ")} Kč</span>
              <span className="text-sm text-gray-400">bez DPH</span>
            </div>
            {product.price_with_vat ? (
              <p className="mt-1 text-sm text-gray-400">
                {product.price_with_vat.toLocaleString("cs-CZ")} Kč s DPH
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-[#FFE500]" />
            <span className="text-lg font-bold">
              {access.canSeePrices ? "Cena na dotaz" : "Cena po přihlášení"}
            </span>
          </div>
        )}
        {!access.canSeePrices ? (
          <Link href="/Memodo/prihlaseni" className="mt-3 inline-block text-xs font-semibold text-gray-700 underline">
            Přihlásit se pro zobrazení cen
          </Link>
        ) : null}
      </div>

      <Link href={`/Memodo/poptavka?product=${product.id}`}>
        <Button className="w-full rounded-xl bg-[#FFE500] py-6 text-base font-bold text-black hover:bg-yellow-400">
          <FileText className="mr-2 h-5 w-5" /> Poptat tento produkt
        </Button>
      </Link>
      <p className="-mt-3 text-center text-xs text-gray-500">Bez závazku. Odpovíme obvykle do 2 hodin.</p>

      {recommendedBattery ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Doporučený set</p>
          <h2 className="mt-1 text-sm font-bold text-gray-900">
            {product.brand || "Střídač"} + {recommendedBattery.brand || "Baterie"}
          </h2>
          <p className="mt-1 text-xs text-gray-600">
            {product.name} + {recommendedBattery.name}
          </p>
          <Link
            href={`/Memodo/poptavka?product=${product.id}&set=${recommendedBattery.id}&prefill=${encodeURIComponent(
              `Doporučený set:\n- Střídač: ${product.name}\n- Baterie: ${recommendedBattery.name}`,
            )}`}
          >
            <Button className="mt-3 w-full rounded-xl bg-slate-900 py-5 text-sm font-bold text-white hover:bg-slate-800">
              <FileText className="mr-2 h-4 w-4" /> Poptat tento set
            </Button>
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Truck className="h-4 w-4 text-gray-400" /> Expedice do 24h
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Shield className="h-4 w-4 text-gray-400" /> Garance kvality
        </div>
      </div>

      {Object.keys(specs).length > 0 ? (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase text-gray-400">Technické specifikace</h3>
          <div className="space-y-2">
            {Object.entries(specs).map(([key, value]) => (
              <div key={key} className="flex justify-between border-b border-gray-50 py-2 last:border-0">
                <span className="text-sm text-gray-500">{key}</span>
                <span className="text-sm font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {product.description ? (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase text-gray-400">Popis</h3>
          <p className="text-sm leading-relaxed text-gray-600">{product.description}</p>
        </div>
      ) : null}
    </div>
  );
}
