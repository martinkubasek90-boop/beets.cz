import Link from "next/link";
import { Tag, ShoppingBag, FileText } from "lucide-react";
import type { Metadata, Viewport } from "next";
import { MemodoInstallAppButton } from "@/components/memodo/install-app-button";
import { MemodoOnboardingBanner, MemodoStickyCta } from "@/components/memodo/mobile-ux";
import Image from "next/image";

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

const navItems = [
  { label: "Akční", href: "/Memodo/akcni-produkty", icon: Tag },
  { label: "Katalog", href: "/Memodo/katalog", icon: ShoppingBag },
  { label: "Poptávka", href: "/Memodo/poptavka", icon: FileText },
];

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

      <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 border-t border-gray-200 bg-white">
        <div className="flex items-center justify-around px-4 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 rounded-xl px-6 py-1 text-gray-600 transition-all hover:text-black"
              >
                <div className="rounded-xl p-2">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
