"use client";

import { Button } from "@/components/ui/button";
import type { BannerFormat } from "@/components/ppc-banners/types";

export function FormatSelector({
  formats,
  activeIndex,
  onSelect,
  onAdd,
  onRemove,
}: {
  formats: BannerFormat[];
  activeIndex: number;
  onSelect: (idx: number) => void;
  onAdd: (id: string) => void;
  onRemove: (idx: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Formáty</div>
      <div className="space-y-2">
        {formats.map((format, idx) => (
          <div key={`${format.id}-${idx}`} className={`rounded-lg border p-2 ${idx === activeIndex ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"}`}>
            <button type="button" onClick={() => onSelect(idx)} className="w-full text-left">
              <p className="text-xs font-semibold text-slate-800">{format.name}</p>
              <p className="text-[11px] text-slate-500">
                {format.width}x{format.height}
              </p>
            </button>
            {formats.length > 1 ? (
              <button type="button" onClick={() => onRemove(idx)} className="mt-1 text-[11px] font-semibold text-red-600">
                Odebrat
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Button onClick={() => onAdd("1200x628")} variant="outline" className="w-full justify-start text-xs">
          + Meta 1200x628
        </Button>
        <Button onClick={() => onAdd("1080x1080")} variant="outline" className="w-full justify-start text-xs">
          + Square 1080x1080
        </Button>
        <Button onClick={() => onAdd("1080x1920")} variant="outline" className="w-full justify-start text-xs">
          + Story 1080x1920
        </Button>
      </div>
    </div>
  );
}

