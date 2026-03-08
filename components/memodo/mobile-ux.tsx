"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { trackMemodoEvent } from "@/lib/memodo-analytics";

export function MemodoViewTracker({ page }: { page: string }) {
  useEffect(() => {
    trackMemodoEvent("memodo_view_page", { page });
  }, [page]);
  return null;
}

export function MemodoOnboardingBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const key = "memodo_onboarding_dismissed";
    const dismissed = window.localStorage.getItem(key) === "1";
    setVisible(!dismissed);
  }, []);

  const close = () => {
    window.localStorage.setItem("memodo_onboarding_dismissed", "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="border-b border-yellow-100 bg-[#FFF9CC] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-gray-900">Rychlý start</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-gray-700">
            1. Najdi produkt v katalogu. 2. Klikni Poptat. 3. Odešli stručnou poptávku do 30 vteřin.
          </p>
        </div>
        <button
          type="button"
          onClick={close}
          className="rounded-md p-1 text-gray-600 hover:bg-white"
          aria-label="Zavřít onboarding"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function MemodoStickyCta() {
  const pathname = usePathname();
  if (!pathname || pathname.startsWith("/Memodo/poptavka")) return null;

  return (
    <div className="fixed bottom-[68px] left-1/2 z-40 w-full max-w-lg -translate-x-1/2 px-4">
      <Link
        href="/Memodo/poptavka"
        onClick={() => trackMemodoEvent("memodo_click_sticky_cta", { from_path: pathname })}
        className="block rounded-2xl bg-[#FFE500] px-5 py-4 text-center text-base font-black text-black shadow-lg shadow-yellow-500/20"
      >
        Poptat nabídku
      </Link>
    </div>
  );
}
