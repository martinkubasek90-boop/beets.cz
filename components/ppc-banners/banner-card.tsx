"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Banner } from "@/components/ppc-banners/types";

export function BannerCard({
  banner,
  onDelete,
  onDuplicate,
  onExport,
}: {
  banner: Banner;
  onDelete: (id: string) => void;
  onDuplicate: (banner: Banner) => void;
  onExport: (banner: Banner) => void;
}) {
  const preview = banner.formats?.[0];
  return (
    <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/85 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="aspect-[4/3] border-b border-slate-100 bg-gradient-to-br from-slate-50 to-cyan-50/30 p-3">
        <div className="flex h-full items-center justify-center rounded-xl border border-slate-200/80 bg-white p-3">
          <div className="w-full">
            <div className="mb-2 flex items-center gap-2">
              {banner.logoUrl ? <img src={banner.logoUrl} alt="Logo" className="h-5 w-auto max-w-[80px] object-contain" /> : null}
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">{banner.brandName || "Brand"}</p>
            </div>
            <p className="line-clamp-2 text-sm font-bold text-slate-900">{banner.headline || "Bez headline"}</p>
            <p className="mt-1 line-clamp-2 text-xs text-slate-600">{banner.subheadline || "Bez subheadline"}</p>
            <div className="mt-3 inline-block rounded-md bg-gradient-to-r from-emerald-600 to-cyan-600 px-2.5 py-1 text-[10px] font-bold text-white">
              {banner.ctaText || "CTA"}
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-2 p-3">
        <p className="truncate text-sm font-semibold text-slate-800">{banner.name}</p>
        <p className="text-[11px] text-slate-500">
          {preview ? `${preview.width}x${preview.height}` : "Formát nevybrán"} • {new Date(banner.updatedAt).toLocaleString("cs-CZ")}
        </p>
        <div className="flex gap-2">
          <Link href={`/ppc-banners/editor?id=${encodeURIComponent(banner.id)}`} className="flex-1">
            <Button className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:from-emerald-700 hover:to-cyan-700" size="sm">Upravit</Button>
          </Link>
          <Button variant="outline" size="sm" className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100" onClick={() => onDuplicate(banner)}>Duplikovat</Button>
          <Button variant="outline" size="sm" className="border-slate-300 bg-white text-slate-700 hover:bg-slate-100" onClick={() => onExport(banner)}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <Button variant="outline" size="sm" className="border-red-500 bg-white text-red-600 hover:bg-red-50" onClick={() => onDelete(banner.id)}>Smazat</Button>
        </div>
      </div>
    </div>
  );
}
