import Link from "next/link";
import { Tag, ShoppingBag, FileText } from "lucide-react";
import type { Metadata, Viewport } from "next";
import { MemodoInstallAppButton } from "@/components/memodo/install-app-button";

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
  { label: "Akce", href: "/Memodo/akce", icon: Tag },
  { label: "Katalog", href: "/Memodo/katalog", icon: ShoppingBag },
  { label: "Poptávka", href: "/Memodo/poptavka", icon: FileText },
];

export default function MemodoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col bg-gray-50">
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white shadow-sm">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/Memodo/akce" className="flex items-center gap-1.5">
            <span className="text-xl font-black tracking-tight text-gray-900">memodo</span>
            <div className="h-2 w-2 rounded-full bg-[#FFE500]" />
          </Link>
          <div className="flex items-center gap-2">
            <MemodoInstallAppButton />
            <Link
              href="/Memodo/poptavka"
              className="rounded-xl bg-[#FFE500] px-4 py-2 text-xs font-bold text-black transition-colors hover:bg-yellow-400"
            >
              Poptat
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20">{children}</main>

      <nav className="fixed bottom-0 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 border-t border-gray-100 bg-white">
        <div className="flex items-center justify-around px-4 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 rounded-xl px-6 py-1 text-gray-500 transition-all hover:text-black"
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
