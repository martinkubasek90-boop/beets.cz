"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Banner, BannerFormat } from "@/components/ppc-banners/types";
import { PRESET_FORMATS } from "@/components/ppc-banners/types";

function uid() {
  return `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function CreateBannerWizard({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (banner: Banner) => void;
}) {
  const [name, setName] = useState("Nový PPC banner");
  const [brandName, setBrandName] = useState("BEETS.CZ");
  const [brandUrl, setBrandUrl] = useState("");
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [ctaText, setCtaText] = useState("Zjistit více");
  const [bgColor, setBgColor] = useState("#0F172A");
  const [textColor, setTextColor] = useState("#FFFFFF");
  const [ctaBg, setCtaBg] = useState("#FACC15");
  const [ctaTextColor, setCtaTextColor] = useState("#111827");
  const [selectedFormatIds, setSelectedFormatIds] = useState<string[]>(["1200x628", "1080x1080"]);

  const selectedFormats = useMemo<BannerFormat[]>(
    () => PRESET_FORMATS.filter((item) => selectedFormatIds.includes(item.id)),
    [selectedFormatIds],
  );

  if (!open) return null;

  const toggleFormat = (id: string) => {
    setSelectedFormatIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const create = () => {
    const now = new Date().toISOString();
    const formats = selectedFormats.length ? selectedFormats : [PRESET_FORMATS[0]];
    onCreate({
      id: uid(),
      name: name.trim() || "Nový PPC banner",
      headline: headline.trim(),
      subheadline: subheadline.trim(),
      ctaText: ctaText.trim() || "Zjistit více",
      brandName: brandName.trim() || "BEETS.CZ",
      brandUrl: brandUrl.trim(),
      bgMode: "none",
      bgColor,
      textColor,
      ctaBg,
      ctaTextColor,
      formats,
      activeFormatIndex: 0,
      updatedAt: now,
      createdAt: now,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Vytvořit PPC banner</h3>
          <button type="button" onClick={onClose} className="text-sm font-semibold text-slate-500">Zavřít</button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Název</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Brand</Label>
            <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>URL webu</Label>
            <Input value={brandUrl} onChange={(e) => setBrandUrl(e.target.value)} placeholder="https://beets.cz" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Headline</Label>
            <Textarea value={headline} onChange={(e) => setHeadline(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Subheadline</Label>
            <Textarea value={subheadline} onChange={(e) => setSubheadline(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>CTA</Label>
            <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>BG</Label>
              <Input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Text</Label>
              <Input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label>CTA BG</Label>
              <Input type="color" value={ctaBg} onChange={(e) => setCtaBg(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>CTA Text</Label>
              <Input type="color" value={ctaTextColor} onChange={(e) => setCtaTextColor(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Formáty</p>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {PRESET_FORMATS.map((format) => {
              const active = selectedFormatIds.includes(format.id);
              return (
                <button
                  key={format.id}
                  type="button"
                  onClick={() => toggleFormat(format.id)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs ${active ? "border-slate-900 bg-slate-50" : "border-slate-200 bg-white"}`}
                >
                  <div className="font-semibold text-slate-800">{format.name}</div>
                  <div className="text-slate-500">{format.width}x{format.height}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Zrušit</Button>
          <Button onClick={create}>Vytvořit banner</Button>
        </div>
      </div>
    </div>
  );
}
