"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PRESET_FORMATS, makeCustomFormat, type BannerFormat } from "@/components/ppc-banners/types";

export function FormatSelector({
  formats,
  activeIndex,
  onSelect,
  onAdd,
  onAddCustom,
  onRemove,
}: {
  formats: BannerFormat[];
  activeIndex: number;
  onSelect: (idx: number) => void;
  onAdd: (id: string) => void;
  onAddCustom: (format: BannerFormat) => void;
  onRemove: (idx: number) => void;
}) {
  const selectedIds = new Set(formats.map((format) => format.id));
  const [customWidth, setCustomWidth] = useState("1080");
  const [customHeight, setCustomHeight] = useState("1080");

  const addCustomFormat = () => {
    const width = Number(customWidth);
    const height = Number(customHeight);
    if (!Number.isFinite(width) || !Number.isFinite(height)) return;
    onAddCustom(makeCustomFormat(width, height));
  };

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Formáty</div>
      <div className="space-y-2">
        {formats.map((format, idx) => (
          <div key={`${format.id}-${idx}`} className={`rounded-xl border p-2.5 ${idx === activeIndex ? "border-cyan-400 bg-cyan-50/80 shadow-sm" : "border-slate-200 bg-white"}`}>
            <button type="button" onClick={() => onSelect(idx)} className="w-full text-left">
              <p className="text-xs font-semibold text-slate-800">{format.name}</p>
              <p className={`text-[11px] ${idx === activeIndex ? "text-cyan-700" : "text-slate-500"}`}>
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
        {PRESET_FORMATS.map((preset) => {
          const alreadyAdded = selectedIds.has(preset.id);
          return (
            <Button
              key={preset.id}
              onClick={() => onAdd(preset.id)}
              disabled={alreadyAdded}
              variant="outline"
              className="w-full justify-start border-slate-300 bg-white text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-100 disabled:bg-slate-200 disabled:text-slate-500 disabled:border-slate-300"
            >
              {alreadyAdded ? "✓ " : "+ "}
              {preset.name}
            </Button>
          );
        })}
      </div>
      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Vlastní rozměr</p>
        <div className="grid grid-cols-2 gap-2">
          <Input
            value={customWidth}
            onChange={(e) => setCustomWidth(e.target.value.replace(/[^\d]/g, ""))}
            className="h-8 border-slate-300 bg-white text-xs"
            placeholder="Šířka"
            inputMode="numeric"
          />
          <Input
            value={customHeight}
            onChange={(e) => setCustomHeight(e.target.value.replace(/[^\d]/g, ""))}
            className="h-8 border-slate-300 bg-white text-xs"
            placeholder="Výška"
            inputMode="numeric"
          />
        </div>
        <Button
          onClick={addCustomFormat}
          variant="outline"
          className="h-8 w-full justify-center border-slate-300 bg-white text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-100 disabled:bg-slate-200 disabled:text-slate-500 disabled:border-slate-300"
          disabled={!customWidth || !customHeight}
        >
          + Přidat vlastní
        </Button>
      </div>
    </div>
  );
}
