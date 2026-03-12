"use client";

import { useState } from "react";
import { Loader2, Sparkles, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeChecklist, contrastRatio } from "@/components/ppc-banners/banner-utils";
import { getBrandKit, saveBrandKit } from "@/components/ppc-banners/storage";
import type { Banner, BannerFormat } from "@/components/ppc-banners/types";

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function PropertyPanel({
  banner,
  format,
  onBannerChange,
  onFormatChange,
}: {
  banner: Banner;
  format?: BannerFormat;
  onBannerChange: (field: keyof Banner, value: string) => void;
  onFormatChange: (field: keyof BannerFormat, value: number) => void;
}) {
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [generatingBg, setGeneratingBg] = useState(false);
  const checklist = computeChecklist(banner);
  const textContrast = contrastRatio(banner.bgColor, banner.textColor).toFixed(2);
  const ctaContrast = contrastRatio(banner.ctaBg, banner.ctaTextColor).toFixed(2);

  const hydrateFromUrl = async () => {
    if (!banner.brandUrl) return;
    setLoadingMeta(true);
    try {
      const response = await fetch(`/api/ppc-banners/metadata?url=${encodeURIComponent(banner.brandUrl)}`, {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Metadata se nepodařilo načíst.");
      if (data.brandName) onBannerChange("brandName", data.brandName);
      if (data.headline && !banner.headline) onBannerChange("headline", data.headline);
      if (data.subheadline && !banner.subheadline) onBannerChange("subheadline", data.subheadline);
      if (data.logoUrl && !banner.logoUrl) onBannerChange("logoUrl", data.logoUrl);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMeta(false);
    }
  };

  const onLogoUpload = async (file: File | null) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    onBannerChange("logoUrl", dataUrl);
  };

  const onBgUpload = async (file: File | null) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    onBannerChange("bgImageUrl", dataUrl);
    onBannerChange("bgMode", "upload");
  };

  const generateBackground = async () => {
    const prompt = banner.bgPrompt?.trim() || "";
    if (!prompt) return;
    setGeneratingBg(true);
    try {
      const response = await fetch("/api/ppc-banners/generate-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, width: 1536, height: 1024 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Generování pozadí selhalo.");
      if (data.imageUrl) {
        onBannerChange("bgImageUrl", data.imageUrl);
        onBannerChange("bgMode", "generate");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setGeneratingBg(false);
    }
  };

  const persistBrandKit = () => {
    saveBrandKit({
      brandName: banner.brandName,
      brandUrl: banner.brandUrl,
      logoUrl: banner.logoUrl,
      bgColor: banner.bgColor,
      textColor: banner.textColor,
      ctaBg: banner.ctaBg,
      ctaTextColor: banner.ctaTextColor,
      updatedAt: new Date().toISOString(),
    });
  };

  const applyBrandKit = () => {
    const brandKit = getBrandKit();
    if (!brandKit) return;
    onBannerChange("brandName", brandKit.brandName || banner.brandName);
    onBannerChange("brandUrl", brandKit.brandUrl || banner.brandUrl);
    onBannerChange("logoUrl", brandKit.logoUrl || "");
    onBannerChange("bgColor", brandKit.bgColor || banner.bgColor);
    onBannerChange("textColor", brandKit.textColor || banner.textColor);
    onBannerChange("ctaBg", brandKit.ctaBg || banner.ctaBg);
    onBannerChange("ctaTextColor", brandKit.ctaTextColor || banner.ctaTextColor);
  };

  return (
    <div className="space-y-4 p-3">
      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <Label className="text-xs text-slate-600">Cíl kampaně</Label>
        <select
          value={banner.goal}
          onChange={(e) => onBannerChange("goal", e.target.value)}
          className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800"
        >
          <option value="traffic">Návštěvnost</option>
          <option value="leads">Poptávky</option>
          <option value="sale">Prodej</option>
          <option value="remarketing">Remarketing</option>
        </select>
        <Label className="text-xs text-slate-600">Stav</Label>
        <select
          value={banner.status}
          onChange={(e) => onBannerChange("status", e.target.value)}
          className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-800"
        >
          <option value="draft">Draft</option>
          <option value="ready">Ready</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={persistBrandKit} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Uložit brand kit
          </button>
          <button type="button" onClick={applyBrandKit} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Použít brand kit
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-slate-600">URL webu</Label>
        <div className="flex gap-2">
          <Input value={banner.brandUrl} onChange={(e) => onBannerChange("brandUrl", e.target.value)} className="border-slate-200 bg-white" placeholder="https://..." />
          <button type="button" onClick={hydrateFromUrl} disabled={loadingMeta} className="rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            {loadingMeta ? <Loader2 className="h-4 w-4 animate-spin" /> : "Načíst"}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-slate-600">Logo URL</Label>
        <Input value={banner.logoUrl || ""} onChange={(e) => onBannerChange("logoUrl", e.target.value)} className="border-slate-200 bg-white" placeholder="https://.../logo.png" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-slate-600">Nahrát logo</Label>
        <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50">
          <Upload className="h-3.5 w-3.5" />
          Vybrat soubor
          <input type="file" className="hidden" accept="image/*" onChange={(e) => void onLogoUpload(e.target.files?.[0] || null)} />
        </label>
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-slate-600">Headline</Label>
        <Input value={banner.headline} onChange={(e) => onBannerChange("headline", e.target.value)} className="border-slate-200 bg-white" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-slate-600">Subheadline</Label>
        <Input value={banner.subheadline} onChange={(e) => onBannerChange("subheadline", e.target.value)} className="border-slate-200 bg-white" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-slate-600">CTA text</Label>
        <Input value={banner.ctaText} onChange={(e) => onBannerChange("ctaText", e.target.value)} className="border-slate-200 bg-white" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs text-slate-600">Barva pozadí</Label>
          <Input type="color" value={banner.bgColor} onChange={(e) => onBannerChange("bgColor", e.target.value)} className="h-11 border-slate-200 bg-white p-1.5" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-slate-600">Barva textu</Label>
          <Input type="color" value={banner.textColor} onChange={(e) => onBannerChange("textColor", e.target.value)} className="h-11 border-slate-200 bg-white p-1.5" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs text-slate-600">CTA pozadí</Label>
          <Input type="color" value={banner.ctaBg} onChange={(e) => onBannerChange("ctaBg", e.target.value)} className="h-11 border-slate-200 bg-white p-1.5" />
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-slate-600">CTA text</Label>
          <Input type="color" value={banner.ctaTextColor} onChange={(e) => onBannerChange("ctaTextColor", e.target.value)} className="h-11 border-slate-200 bg-white p-1.5" />
        </div>
      </div>
      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Kontrola kontrastu</p>
        <p className={`text-xs ${checklist.contrastTextOk ? "text-emerald-700" : "text-red-600"}`}>
          Text vs BG: {textContrast}:1 {checklist.contrastTextOk ? "OK" : "(min. 4.5 doporučeno)"}
        </p>
        <p className={`text-xs ${checklist.contrastCtaOk ? "text-emerald-700" : "text-red-600"}`}>
          CTA text vs CTA BG: {ctaContrast}:1 {checklist.contrastCtaOk ? "OK" : "(min. 4.5 doporučeno)"}
        </p>
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-slate-600">Pozadí URL</Label>
        <Input value={banner.bgImageUrl || ""} onChange={(e) => onBannerChange("bgImageUrl", e.target.value)} className="border-slate-200 bg-white" placeholder="https://.../bg.jpg" />
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-slate-600">Nahrát pozadí</Label>
        <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50">
          <Upload className="h-3.5 w-3.5" />
          Vybrat obrázek
          <input type="file" className="hidden" accept="image/*" onChange={(e) => void onBgUpload(e.target.files?.[0] || null)} />
        </label>
      </div>
      <div className="space-y-2">
        <Label className="text-xs text-slate-600">Prompt pro AI pozadí (free tier)</Label>
        <div className="flex gap-2">
          <Input value={banner.bgPrompt || ""} onChange={(e) => onBannerChange("bgPrompt", e.target.value)} className="border-slate-200 bg-white" placeholder="např. premium studio light gradient background" />
          <button type="button" onClick={generateBackground} disabled={generatingBg || !(banner.bgPrompt || "").trim()} className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 px-3 text-white hover:from-emerald-700 hover:to-cyan-700 disabled:opacity-50">
            {generatingBg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {format ? (
        <>
          <div className="space-y-2">
            <Label className="text-xs">Velikost headline: {format.headlineSize}px</Label>
            <Input
              type="range"
              min={16}
              max={160}
              value={format.headlineSize}
              onChange={(e) => onFormatChange("headlineSize", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Velikost subheadline: {format.subheadlineSize}px</Label>
            <Input
              type="range"
              min={12}
              max={88}
              value={format.subheadlineSize}
              onChange={(e) => onFormatChange("subheadlineSize", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Velikost CTA: {format.ctaSize}px</Label>
            <Input
              type="range"
              min={10}
              max={56}
              value={format.ctaSize}
              onChange={(e) => onFormatChange("ctaSize", Number(e.target.value))}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
