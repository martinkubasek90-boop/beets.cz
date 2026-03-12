"use client";

import { usePathname } from "next/navigation";

export function MemodoFeaturedHeroBanner() {
  const pathname = usePathname();
  if (pathname !== "/Memodo/akcni-produkty") return null;

  return (
    <div className="px-4 pb-3">
      <div className="rounded-2xl bg-[#25C1E6] px-4 py-5 text-center text-gray-900">
        <h1 className="text-2xl font-black tracking-tight">Najděte nejaktuálnější ceny pro váš projekt</h1>
        <p className="mt-2 text-sm text-gray-800">
          Vyhledejte oblíbené produkty, porovnejte aktuální ceny a získejte cenovou nabídku během pár chvil.
        </p>
      </div>
    </div>
  );
}
