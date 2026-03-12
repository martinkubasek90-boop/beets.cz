"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { Banner } from "@/components/ppc-banners/types";

export function BannerCard({
  banner,
  onDelete,
  onDuplicate,
}: {
  banner: Banner;
  onDelete: (id: string) => void;
  onDuplicate: (banner: Banner) => void;
}) {
  const preview = banner.formats?.[0];
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="aspect-[4/3] border-b border-slate-100 bg-slate-50 p-3">
        <div className="flex h-full items-center justify-center rounded-lg border border-slate-200 bg-white p-3">
          <div className="w-full">
            <p className="line-clamp-2 text-sm font-bold text-slate-900">{banner.headline || "Bez headline"}</p>
            <p className="mt-1 line-clamp-2 text-xs text-slate-500">{banner.subheadline || "Bez subheadline"}</p>
            <div className="mt-2 inline-block rounded-md bg-slate-900 px-2 py-1 text-[10px] font-bold text-white">
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
            <Button className="w-full" size="sm">Upravit</Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => onDuplicate(banner)}>Duplikovat</Button>
          <Button variant="outline" size="sm" className="text-red-600" onClick={() => onDelete(banner.id)}>Smazat</Button>
        </div>
      </div>
    </div>
  );
}

