"use client";

import { useState } from "react";
import { Loader2, Sparkles, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeChecklist, contrastRatio, normalizeImageUrl } from "@/components/ppc-banners/banner-utils";
import { getBrandKit, saveBrandKit } from "@/components/ppc-banners/storage";
import type { Banner, BannerFormat } from "@/components/ppc-banners/types";

type LayerId = "logo" | "headline" | "description" | "description2" | "cta" | "background";

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function AlignButtons<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (next: T) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-slate-600">{label}</Label>
      <div className="grid grid-cols-3 gap-2">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-md border px-2 py-1 text-xs font-semibold ${value === opt.value ? "border-cyan-500 bg-cyan-50 text-cyan-700" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PropertyPanel({
  banner,
  format,
  onBannerChange,
  onFormatChange,
}: {
  banner: Banner;
  format?: BannerFormat;
  onBannerChange: (field: keyof Banner, value: string | number | boolean) => void;
  onFormatChange: (field: keyof BannerFormat, value: string | number | boolean) => void;
}) {
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [generatingBg, setGeneratingBg] = useState(false);
  const [activeLayer, setActiveLayer] = useState<LayerId>("logo");

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
      if (data.headline && !(format?.headline || banner.headline)) onFormatChange("headline", data.headline);
      if (data.subheadline && !(format?.subheadline || banner.subheadline)) onFormatChange("subheadline", data.subheadline);
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
    onFormatChange("bgImageUrl", dataUrl);
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
        onFormatChange("bgImageUrl", normalizeImageUrl(data.imageUrl));
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

  const logoAlignX = format?.logoAlignX || "left";
  const logoAlignY = format?.logoAlignY || "top";
  const textAlignX = format?.textAlignX || "left";
  const textAlignY = format?.textAlignY || "center";
  const textContentAlign = format?.textContentAlign || "left";
  const ctaAlignX = format?.ctaAlignX || "left";
  const ctaAlignY = format?.ctaAlignY || "bottom";
  const currentLayerKey =
    activeLayer === "logo" ? "logo" : activeLayer === "cta" ? "cta" : activeLayer === "headline" || activeLayer === "description" || activeLayer === "description2" ? "text" : "background";
  const headlineValue = format?.headline ?? banner.headline;
  const subheadlineValue = format?.subheadline ?? banner.subheadline;
  const subheadline2Value = format?.subheadline2 ?? "";
  const ctaValue = format?.ctaText ?? banner.ctaText;
  const bgImageValue = format?.bgImageUrl ?? banner.bgImageUrl ?? "";
  const bgScaleValue = Number(format?.bgScale ?? banner.bgScale ?? 100);
  const bgPositionXValue = Number(format?.bgPositionX ?? banner.bgPositionX ?? 50);
  const bgPositionYValue = Number(format?.bgPositionY ?? banner.bgPositionY ?? 50);
  const zMap = {
    logo: typeof format?.zLogo === "number" ? format.zLogo : 40,
    text: typeof format?.zText === "number" ? format.zText : 30,
    cta: typeof format?.zCta === "number" ? format.zCta : 50,
  } as const;
  const orderedLayers = Object.entries(zMap)
    .sort((a, b) => a[1] - b[1])
    .map(([key]) => key as "logo" | "text" | "cta");
  const currentOrderIndex = currentLayerKey === "background" ? -1 : orderedLayers.indexOf(currentLayerKey as "logo" | "text" | "cta");

  const applyLayerOrder = (order: Array<"logo" | "text" | "cta">) => {
    order.forEach((layer, idx) => {
      const z = 10 + idx * 10;
      if (layer === "logo") onFormatChange("zLogo", z);
      if (layer === "text") onFormatChange("zText", z);
      if (layer === "cta") onFormatChange("zCta", z);
    });
  };

  const moveLayer = (direction: -1 | 1) => {
    if (currentLayerKey === "background" || currentOrderIndex < 0) return;
    const nextIndex = currentOrderIndex + direction;
    if (nextIndex < 0 || nextIndex >= orderedLayers.length) return;
    const nextOrder = [...orderedLayers];
    const currentLayer = nextOrder[currentOrderIndex];
    nextOrder[currentOrderIndex] = nextOrder[nextIndex];
    nextOrder[nextIndex] = currentLayer;
    applyLayerOrder(nextOrder);
  };

  return (
    <div className="space-y-4 p-3">
      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <Label className="text-xs text-slate-600">URL webu</Label>
        <div className="flex gap-2">
          <Input value={banner.brandUrl} onChange={(e) => onBannerChange("brandUrl", e.target.value)} className="border-slate-200 bg-white" placeholder="https://..." />
          <button type="button" onClick={hydrateFromUrl} disabled={loadingMeta} className="rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-100 disabled:bg-slate-200 disabled:text-slate-500 disabled:border-slate-300">
            {loadingMeta ? <Loader2 className="h-4 w-4 animate-spin" /> : "Načíst"}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={persistBrandKit} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Uložit brand kit
          </button>
          <button type="button" onClick={applyBrandKit} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            Použít brand kit
          </button>
        </div>
      </div>

      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Vrstvy</p>
        <div className="grid grid-cols-1 gap-2">
          {([
            ["logo", "1. Logo"],
            ["headline", "2. Nadpis"],
            ["description", "3. Popis"],
            ["description2", "4. POPIS 2"],
            ["cta", "5. CTA"],
            ["background", "6. Background foto"],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveLayer(id)}
              className={`rounded-md border px-2 py-1.5 text-left text-xs font-semibold ${activeLayer === id ? "border-cyan-500 bg-cyan-50 text-cyan-700" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              {label}
            </button>
          ))}
        </div>
        {currentLayerKey !== "background" ? (
          <div className="mt-2 space-y-2 border-t border-slate-200 pt-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pořadí vrstvy</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => moveLayer(-1)}
                disabled={currentOrderIndex <= 0}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:bg-slate-200 disabled:text-slate-500"
              >
                Posunout dozadu
              </button>
              <button
                type="button"
                onClick={() => moveLayer(1)}
                disabled={currentOrderIndex < 0 || currentOrderIndex >= orderedLayers.length - 1}
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:bg-slate-200 disabled:text-slate-500"
              >
                Posunout dopředu
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {format ? (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          {activeLayer === "logo" ? (
            <>
              <Label className="text-xs text-slate-600">Logo URL</Label>
              <Input value={banner.logoUrl || ""} onChange={(e) => onBannerChange("logoUrl", e.target.value)} className="border-slate-200 bg-white" placeholder="https://.../logo.png" />
              <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50">
                <Upload className="h-3.5 w-3.5" />
                Vybrat logo
                <input type="file" className="hidden" accept="image/*" onChange={(e) => void onLogoUpload(e.target.files?.[0] || null)} />
              </label>
              <label className="flex items-center justify-between rounded-md border border-slate-300 bg-white px-2 py-2 text-xs text-slate-700">
                <span>Transparentní pozadí loga</span>
                <input type="checkbox" checked={Boolean(banner.logoTransparentBg)} onChange={(e) => onBannerChange("logoTransparentBg", e.target.checked)} />
              </label>
              <div className="space-y-2">
                <Label className="text-xs">Velikost loga: {(format.logoScale || 1).toFixed(2)}x</Label>
                <Input type="range" min={0.4} max={12} step={0.1} value={format.logoScale || 1} onChange={(e) => onFormatChange("logoScale", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Posun X: {format.logoOffsetX || 0}px</Label>
                <Input type="range" min={-320} max={320} step={2} value={format.logoOffsetX || 0} onChange={(e) => onFormatChange("logoOffsetX", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Posun Y: {format.logoOffsetY || 0}px</Label>
                <Input type="range" min={-320} max={320} step={2} value={format.logoOffsetY || 0} onChange={(e) => onFormatChange("logoOffsetY", Number(e.target.value))} />
              </div>
              <AlignButtons label="Zarovnání X" value={logoAlignX} onChange={(v) => onFormatChange("logoAlignX", v)} options={[{ value: "left", label: "Vlevo" }, { value: "center", label: "Střed" }, { value: "right", label: "Vpravo" }]} />
              <AlignButtons label="Zarovnání Y" value={logoAlignY} onChange={(v) => onFormatChange("logoAlignY", v)} options={[{ value: "top", label: "Nahoru" }, { value: "center", label: "Střed" }, { value: "bottom", label: "Dolů" }]} />
            </>
          ) : null}

          {activeLayer === "headline" ? (
            <>
              <Label className="text-xs text-slate-600">Text nadpisu</Label>
              <Input value={headlineValue} onChange={(e) => onFormatChange("headline", e.target.value)} className="border-slate-200 bg-white" />
              <div className="space-y-2">
                <Label className="text-xs">Velikost headline: {format.headlineSize}px</Label>
                <Input type="range" min={16} max={180} value={format.headlineSize} onChange={(e) => onFormatChange("headlineSize", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Posun bloku X: {format.textOffsetX || 0}px</Label>
                <Input type="range" min={-360} max={360} step={2} value={format.textOffsetX || 0} onChange={(e) => onFormatChange("textOffsetX", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Posun bloku Y: {format.textOffsetY || 0}px</Label>
                <Input type="range" min={-360} max={360} step={2} value={format.textOffsetY || 0} onChange={(e) => onFormatChange("textOffsetY", Number(e.target.value))} />
              </div>
              <AlignButtons label="Zarovnání bloku X" value={textAlignX} onChange={(v) => onFormatChange("textAlignX", v)} options={[{ value: "left", label: "Vlevo" }, { value: "center", label: "Střed" }, { value: "right", label: "Vpravo" }]} />
              <AlignButtons label="Zarovnání bloku Y" value={textAlignY} onChange={(v) => onFormatChange("textAlignY", v)} options={[{ value: "top", label: "Nahoru" }, { value: "center", label: "Střed" }, { value: "bottom", label: "Dolů" }]} />
              <AlignButtons label="Zarovnání textu" value={textContentAlign} onChange={(v) => onFormatChange("textContentAlign", v)} options={[{ value: "left", label: "Vlevo" }, { value: "center", label: "Střed" }, { value: "right", label: "Vpravo" }]} />
            </>
          ) : null}

          {activeLayer === "description" ? (
            <>
              <Label className="text-xs text-slate-600">Text popisu</Label>
              <Input value={subheadlineValue} onChange={(e) => onFormatChange("subheadline", e.target.value)} className="border-slate-200 bg-white" />
              <div className="space-y-2">
                <Label className="text-xs">Velikost popisu: {format.subheadlineSize}px</Label>
                <Input type="range" min={12} max={96} value={format.subheadlineSize} onChange={(e) => onFormatChange("subheadlineSize", Number(e.target.value))} />
              </div>
              <AlignButtons label="Zarovnání textu" value={textContentAlign} onChange={(v) => onFormatChange("textContentAlign", v)} options={[{ value: "left", label: "Vlevo" }, { value: "center", label: "Střed" }, { value: "right", label: "Vpravo" }]} />
            </>
          ) : null}

          {activeLayer === "description2" ? (
            <>
              <Label className="text-xs text-slate-600">Text POPIS 2</Label>
              <Input value={subheadline2Value} onChange={(e) => onFormatChange("subheadline2", e.target.value)} className="border-slate-200 bg-white" />
              <div className="space-y-2">
                <Label className="text-xs">Velikost POPIS 2: {format.subheadline2Size || format.subheadlineSize}px</Label>
                <Input type="range" min={12} max={96} value={format.subheadline2Size || format.subheadlineSize} onChange={(e) => onFormatChange("subheadline2Size", Number(e.target.value))} />
              </div>
              <AlignButtons label="Zarovnání textu" value={textContentAlign} onChange={(v) => onFormatChange("textContentAlign", v)} options={[{ value: "left", label: "Vlevo" }, { value: "center", label: "Střed" }, { value: "right", label: "Vpravo" }]} />
            </>
          ) : null}

          {activeLayer === "cta" ? (
            <>
              <Label className="text-xs text-slate-600">CTA text</Label>
              <Input value={ctaValue} onChange={(e) => onFormatChange("ctaText", e.target.value)} className="border-slate-200 bg-white" />
              <div className="space-y-2">
                <Label className="text-xs">Velikost CTA: {format.ctaSize}px</Label>
                <Input type="range" min={10} max={60} value={format.ctaSize} onChange={(e) => onFormatChange("ctaSize", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Posun CTA X: {format.ctaOffsetX || 0}px</Label>
                <Input type="range" min={-320} max={320} step={2} value={format.ctaOffsetX || 0} onChange={(e) => onFormatChange("ctaOffsetX", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Posun CTA Y: {format.ctaOffsetY || 0}px</Label>
                <Input type="range" min={-320} max={320} step={2} value={format.ctaOffsetY || 0} onChange={(e) => onFormatChange("ctaOffsetY", Number(e.target.value))} />
              </div>
              <AlignButtons label="Zarovnání CTA X" value={ctaAlignX} onChange={(v) => onFormatChange("ctaAlignX", v)} options={[{ value: "left", label: "Vlevo" }, { value: "center", label: "Střed" }, { value: "right", label: "Vpravo" }]} />
              <AlignButtons label="Zarovnání CTA Y" value={ctaAlignY} onChange={(v) => onFormatChange("ctaAlignY", v)} options={[{ value: "top", label: "Nahoru" }, { value: "center", label: "Střed" }, { value: "bottom", label: "Dolů" }]} />
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
            </>
          ) : null}

          {activeLayer === "background" ? (
            <>
              <Label className="text-xs text-slate-600">Pozadí URL</Label>
              <Input value={bgImageValue} onChange={(e) => onFormatChange("bgImageUrl", normalizeImageUrl(e.target.value))} className="border-slate-200 bg-white" placeholder="https://.../bg.jpg" />
              <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50">
                <Upload className="h-3.5 w-3.5" />
                Vybrat obrázek
                <input type="file" className="hidden" accept="image/*" onChange={(e) => void onBgUpload(e.target.files?.[0] || null)} />
              </label>
              <Label className="text-xs text-slate-600">Prompt pro AI pozadí (free tier)</Label>
              <div className="flex gap-2">
                <Input value={banner.bgPrompt || ""} onChange={(e) => onBannerChange("bgPrompt", e.target.value)} className="border-slate-200 bg-white" placeholder="např. modern architecture hero background" />
                <button type="button" onClick={generateBackground} disabled={generatingBg || !(banner.bgPrompt || "").trim()} className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 px-3 text-white hover:from-emerald-700 hover:to-cyan-700 disabled:opacity-100 disabled:bg-slate-200 disabled:text-slate-500 disabled:from-slate-200 disabled:to-slate-200">
                  {generatingBg ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </button>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Zoom pozadí: {Math.round(bgScaleValue)}%</Label>
                <Input type="range" min={10} max={260} value={bgScaleValue} onChange={(e) => onFormatChange("bgScale", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Pozice X: {Math.round(bgPositionXValue)}%</Label>
                <Input type="range" min={0} max={100} value={bgPositionXValue} onChange={(e) => onFormatChange("bgPositionX", Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Pozice Y: {Math.round(bgPositionYValue)}%</Label>
                <Input type="range" min={0} max={100} value={bgPositionYValue} onChange={(e) => onFormatChange("bgPositionY", Number(e.target.value))} />
              </div>
            </>
          ) : null}
        </div>
      ) : null}

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

      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Kontrola kontrastu</p>
        <p className={`text-xs ${checklist.contrastTextOk ? "text-emerald-700" : "text-red-600"}`}>
          Text vs BG: {textContrast}:1 {checklist.contrastTextOk ? "OK" : "(min. 4.5 doporučeno)"}
        </p>
        <p className={`text-xs ${checklist.contrastCtaOk ? "text-emerald-700" : "text-red-600"}`}>
          CTA text vs CTA BG: {ctaContrast}:1 {checklist.contrastCtaOk ? "OK" : "(min. 4.5 doporučeno)"}
        </p>
      </div>
    </div>
  );
}
