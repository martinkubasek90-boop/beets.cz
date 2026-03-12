import { Suspense } from "react";
import { PpcBannerSharePreviewClient } from "@/components/ppc-banners/share-preview-client";

export const metadata = {
  title: "Sdílený náhled banneru | BEETS.CZ",
};

export default function PpcBannerPreviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-slate-950 text-sm text-slate-300">
          Načítám sdílený náhled…
        </div>
      }
    >
      <PpcBannerSharePreviewClient />
    </Suspense>
  );
}
