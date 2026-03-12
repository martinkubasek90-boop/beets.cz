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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm">
      <div className="w-full max-w-5xl rounded-3xl border border-white/70 bg-[linear-gradient(160deg,#f8fafc_0%,#f1f5f9_65%,#ecfeff_100%)] p-5 shadow-2xl sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-700">New Campaign Asset</p>
            <h3 className="text-xl font-bold text-slate-900">Vytvořit PPC banner</h3>
            <p className="text-sm text-slate-600">Vyplňte základ a během chvíle máte připravenou sadu formátů.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">Zavřít</button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.45fr_0.95fr]">
          <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-slate-700">Název</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="border-slate-200 bg-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Brand</Label>
                <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} className="border-slate-200 bg-white" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-slate-700">URL webu</Label>
                <Input value={brandUrl} onChange={(e) => setBrandUrl(e.target.value)} className="border-slate-200 bg-white" placeholder="https://beets.cz" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-slate-700">Headline</Label>
                <Textarea value={headline} onChange={(e) => setHeadline(e.target.value)} className="min-h-[96px] border-slate-200 bg-white text-slate-900 placeholder:text-slate-400" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-slate-700">Subheadline</Label>
                <Textarea value={subheadline} onChange={(e) => setSubheadline(e.target.value)} className="min-h-[88px] border-slate-200 bg-white text-slate-900 placeholder:text-slate-400" />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">CTA</Label>
                <Input value={ctaText} onChange={(e) => setCtaText(e.target.value)} className="border-slate-200 bg-white" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-slate-700">BG</Label>
                  <Input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="h-11 border-slate-200 bg-white p-1.5" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">Text</Label>
                  <Input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="h-11 border-slate-200 bg-white p-1.5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label className="text-slate-700">CTA BG</Label>
                  <Input type="color" value={ctaBg} onChange={(e) => setCtaBg(e.target.value)} className="h-11 border-slate-200 bg-white p-1.5" />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">CTA Text</Label>
                  <Input type="color" value={ctaTextColor} onChange={(e) => setCtaTextColor(e.target.value)} className="h-11 border-slate-200 bg-white p-1.5" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-cyan-200/70 bg-gradient-to-br from-cyan-50 via-white to-emerald-50 p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">Živý náhled stylu</p>
              <div className="rounded-xl p-4" style={{ backgroundColor: bgColor }}>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-90" style={{ color: textColor }}>
                  {brandName || "BEETS.CZ"}
                </p>
                <p className="mt-2 text-lg font-bold leading-tight" style={{ color: textColor }}>
                  {headline || "Váš headline se zobrazí tady"}
                </p>
                <p className="mt-2 text-sm" style={{ color: textColor }}>
                  {subheadline || "Krátké doplnění hodnoty pro kliknutí."}
                </p>
                <span className="mt-4 inline-block rounded-lg px-3 py-1.5 text-xs font-bold" style={{ backgroundColor: ctaBg, color: ctaTextColor }}>
                  {ctaText || "Zjistit více"}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Formáty</p>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_FORMATS.map((format) => {
                  const active = selectedFormatIds.includes(format.id);
                  return (
                    <button
                      key={format.id}
                      type="button"
                      onClick={() => toggleFormat(format.id)}
                      className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                        active
                          ? "border-cyan-500 bg-cyan-50 text-cyan-900 shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="font-semibold">{format.name}</div>
                      <div className={active ? "text-cyan-700" : "text-slate-500"}>{format.width}x{format.height}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} className="border-slate-300 bg-white/80 text-slate-700 hover:bg-white">Zrušit</Button>
          <Button onClick={create} className="bg-gradient-to-r from-emerald-600 to-cyan-600 text-white hover:from-emerald-700 hover:to-cyan-700">Vytvořit banner</Button>
        </div>
      </div>
    </div>
  );
}
