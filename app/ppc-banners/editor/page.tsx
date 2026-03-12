import { Suspense } from "react";
import { PpcBannerEditorClient } from "@/components/ppc-banners/editor-client";

export const metadata = {
  title: "Editor banneru | BEETS.CZ",
};

export default function PpcBannersEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
          Načítám editor…
        </div>
      }
    >
      <PpcBannerEditorClient />
    </Suspense>
  );
}
