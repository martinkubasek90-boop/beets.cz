"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { decodeSharePayload } from "@/components/ppc-banners/banner-utils";
import { BannerCanvas } from "@/components/ppc-banners/banner-canvas";

export function PpcBannerSharePreviewClient() {
  const searchParams = useSearchParams();
  const data = searchParams.get("data") || "";
  const banner = useMemo(() => decodeSharePayload(data), [data]);
  const formatId = searchParams.get("format") || "";
  const format = useMemo(() => {
    if (!banner) return null;
    return banner.formats.find((item) => item.id === formatId) || banner.formats[0] || null;
  }, [banner, formatId]);

  if (!banner || !format) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-6 text-center">
          <p className="mb-3 text-sm">Neplatný nebo neúplný sdílený odkaz.</p>
          <Link href="/ppc-banners">
            <Button variant="outline" className="border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700">
              Zpět na PPC Banners
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/70 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Read-only preview</p>
          <h1 className="text-base font-semibold text-white">{banner.name}</h1>
        </div>
        <Link href="/ppc-banners">
          <Button variant="outline" className="border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700">
            Otevřít studio
          </Button>
        </Link>
      </div>
      <div className="relative h-[calc(100vh-65px)] bg-slate-900">
        <BannerCanvas banner={banner} format={format} />
      </div>
    </div>
  );
}
