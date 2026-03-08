import Link from "next/link";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { MemodoViewTracker } from "@/components/memodo/mobile-ux";

export default function MemodoIndexPage() {
  return (
    <div className="space-y-4 px-4 py-6">
      <MemodoViewTracker page="home" />

      <section className="rounded-3xl bg-[#25C1E6] p-5 text-slate-950">
        <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-[#FFE500] px-3 py-1 text-[11px] font-bold">
          <Sparkles className="h-3 w-3" /> Rychlý nákupní flow
        </div>
        <h1 className="text-2xl font-black leading-tight">Najdi produkt a poptej ho do 30 vteřin</h1>
        <p className="mt-2 text-sm text-slate-900/90">
          Odpovíme obvykle do 2 hodin v pracovní době. Bez závazku.
        </p>
      </section>

      <Link
        href="/Memodo/poptavka"
        className="flex items-center justify-between rounded-2xl bg-[#FFE500] px-5 py-4 text-base font-black text-black shadow-lg shadow-yellow-500/20"
      >
        Poptat nabídku
        <ArrowRight className="h-5 w-5" />
      </Link>

      <Link
        href="/Memodo/katalog"
        className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900"
      >
        Vyhledat v katalogu
        <Search className="h-4 w-4 text-gray-500" />
      </Link>

      <Link
        href="/Memodo/akcni-produkty"
        className="block rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900"
      >
        Akční produkty
        <p className="mt-1 text-xs font-normal text-gray-500">Vybraný sortiment připravený k objednání</p>
      </Link>
    </div>
  );
}
