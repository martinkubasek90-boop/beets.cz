import Link from "next/link";
import type { Metadata, Viewport } from "next";
import { MemodoInstallAppButton } from "@/components/memodo/install-app-button";
import { MemodoOnboardingBanner, MemodoStickyCta } from "@/components/memodo/mobile-ux";
import Image from "next/image";
import { MemodoBottomNav } from "@/components/memodo/bottom-nav";

export const metadata: Metadata = {
  title: "Memodo | BEETS.CZ",
  description: "Mobilní katalog a poptávková aplikace Memodo.",
  manifest: "/Memodo/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Memodo",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFE500",
  viewportFit: "cover",
};

export default function MemodoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-[#EFEFEF]">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-[#EFEFEF] shadow-sm">
        <div className="bg-[#FFE500] px-4 py-2 text-center text-[11px] font-medium text-gray-900">
          Trh zdražuje. My držíme ceny. Nakupujte skladové zboží za původní ceny.
        </div>

        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <Link href="/Memodo/akcni-produkty" className="flex items-center">
            <Image src="/memodo-logo.svg" alt="Memodo" width={132} height={32} className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-1.5">
            <MemodoInstallAppButton />
            <Link
              href="/Memodo/poptavka"
              className="rounded-xl bg-[#FFE500] px-4 py-2 text-xs font-bold text-black transition-colors hover:bg-yellow-400"
            >
              Poptat
            </Link>
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-500">
            Hledat dle čísla položky nebo názvu v Katalogu
          </div>
        </div>

        <MemodoOnboardingBanner />
      </header>

      <main className="flex-1 pb-20">{children}</main>
      <MemodoStickyCta />

      <MemodoBottomNav />
    </div>
  );
}
