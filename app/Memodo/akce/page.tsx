import Link from "next/link";
import { ArrowRight, Clock, Percent, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MemodoProductCard } from "@/components/memodo/product-card";
import { products, promotions } from "@/lib/memodo-data";

function formatDate(input?: string) {
  if (!input) return "";
  return new Date(input).toLocaleDateString("cs-CZ", { day: "numeric", month: "short" });
}

export default function MemodoPromotionsPage() {
  const activePromotions = promotions.filter((promo) => promo.is_active);
  const promoProducts = products.filter((product) => product.is_promo);

  return (
    <div className="space-y-6 px-4 py-6">
      <div>
        <div className="mb-2 inline-flex items-center gap-1.5 rounded-lg bg-[#FFE500] px-3 py-1 text-xs font-bold text-black">
          <Percent className="h-3 w-3" /> Aktuální akce
        </div>
        <h1 className="text-2xl font-black tracking-tight">Promo nabídky</h1>
        <p className="mt-1 text-sm text-gray-500">Časově omezené slevy na vybrané produkty</p>
      </div>

      {activePromotions.length > 0 ? (
        <div className="space-y-3">
          {activePromotions.map((promo) => (
            <Link
              key={promo.id}
              href="/Memodo/poptavka"
              className="relative block overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 transition-all hover:border-[#FFE500]"
              style={{
                background: `linear-gradient(135deg, ${(promo.highlight_color || "#FFE500") + "18"}, white)`,
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    {promo.discount_percent ? (
                      <Badge className="border-0 bg-[#FFE500] text-xs font-bold text-black">
                        -{promo.discount_percent}%
                      </Badge>
                    ) : null}
                    {promo.valid_to ? (
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <Clock className="h-3 w-3" />
                        do {formatDate(promo.valid_to)}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="font-bold text-gray-900">{promo.title}</h3>
                  {promo.description ? (
                    <p className="mt-1 text-xs leading-relaxed text-gray-500">{promo.description}</p>
                  ) : null}
                </div>
                <ArrowRight className="ml-3 mt-1 h-4 w-4 flex-shrink-0 text-gray-300" />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-white py-12 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-gray-200" />
          <p className="mt-3 text-sm text-gray-500">Právě připravujeme nové akce</p>
        </div>
      )}

      {promoProducts.length > 0 ? (
        <div>
          <h2 className="mb-3 text-base font-bold">Akční produkty</h2>
          <div className="grid grid-cols-2 gap-3">
            {promoProducts.map((product) => (
              <MemodoProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

