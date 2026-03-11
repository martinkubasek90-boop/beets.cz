import Link from "next/link";
import type { Metadata, Viewport } from "next";
import { MemodoInstallAppButton } from "@/components/memodo/install-app-button";
import { MemodoStickyCta } from "@/components/memodo/mobile-ux";
import Image from "next/image";
import { MemodoBottomNav } from "@/components/memodo/bottom-nav";
import { MemodoAiAssistant } from "@/components/memodo/ai-assistant";
import { getMemodoAdminConfig } from "@/lib/memodo-admin-config";
import { MemodoWebVitalsTracker } from "@/components/memodo/web-vitals-tracker";
import { MemodoPriceEmailGate } from "@/components/memodo/price-email-gate";
import { MemodoHeaderSearch } from "@/components/memodo/header-search";

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
    apple: "/memodo-apple-touch-icon-v2.png",
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
        <div className="px-4 pt-3">
          <Link href="/Memodo/akcni-produkty" className="flex w-full justify-center">
            <Image
              src="/memodo-logo.svg"
              alt="Memodo"
              width={520}
              height={110}
              className="mx-auto h-12 w-full max-w-[320px] object-contain object-center"
            />
          </Link>
        </div>
        <div className="flex justify-end px-4 pb-2">
          <div className="flex items-center">
            <MemodoInstallAppButton />
          </div>
        </div>

        <div className="px-4 pb-3">
          <MemodoHeaderSearch />
        </div>
        <div className="px-4 pb-3">
          <MemodoPriceEmailGate />
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
