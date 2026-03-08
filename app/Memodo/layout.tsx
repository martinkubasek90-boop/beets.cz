import Link from "next/link";
import type { Metadata, Viewport } from "next";
import { MemodoInstallAppButton } from "@/components/memodo/install-app-button";
import { MemodoStickyCta } from "@/components/memodo/mobile-ux";
import Image from "next/image";
import { MemodoBottomNav } from "@/components/memodo/bottom-nav";
import { MemodoAiAssistant } from "@/components/memodo/ai-assistant";
import { getMemodoAdminConfig } from "@/lib/memodo-admin-config";
import { MemodoWebVitalsTracker } from "@/components/memodo/web-vitals-tracker";

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
    apple: "/memodo-apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFE500",
  viewportFit: "cover",
};

export default async function MemodoLayout({ children }: { children: React.ReactNode }) {
  const config = await getMemodoAdminConfig();
  return (
    <div className="memodo-app mx-auto flex min-h-screen max-w-lg flex-col bg-[#EFEFEF]">
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-[#EFEFEF] shadow-sm">
        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <Link href="/Memodo/akcni-produkty" className="flex items-center">
            <Image src="/memodo-logo.svg" alt="Memodo" width={184} height={44} className="h-10 w-auto" />
          </Link>
          <div className="flex items-center gap-1.5">
            <MemodoInstallAppButton />
            <Link
              href="/Memodo/prihlaseni"
              className="min-h-[44px] rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-xs font-semibold text-gray-800 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
            >
              Přihlásit ceny
            </Link>
            <Link
              href="/Memodo/poptavka"
              className="min-h-[44px] rounded-xl bg-[#FFE500] px-5 py-2.5 text-sm font-black text-black transition-colors hover:bg-yellow-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
            >
              Poptat nabídku
            </Link>
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-500">
            Hledat dle čísla položky nebo názvu v Katalogu
          </div>
        </div>

      </header>

      <main className="flex-1 pb-20">{children}</main>
      <MemodoWebVitalsTracker />
      <MemodoStickyCta />
      <MemodoAiAssistant
        shoppingEnabled={config.aiSearchEnabled && config.shoppingChatbotEnabled}
        technicalEnabled={config.aiSearchEnabled && config.technicalAdvisorEnabled}
        defaultMode={config.aiDefaultMode}
        fabLabel={config.aiFabLabel}
        welcomeMessage={config.aiWelcomeMessage}
      />

      <MemodoBottomNav />
    </div>
  );
}
