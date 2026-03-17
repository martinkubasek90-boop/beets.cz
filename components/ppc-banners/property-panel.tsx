"use client";

import { useState } from "react";
import { Loader2, Sparkles, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeChecklist, contrastRatio, normalizeImageUrl } from "@/components/ppc-banners/banner-utils";
import { computeBannerRenderModel } from "@/components/ppc-banners/render-model";
import { getBrandKit, saveBrandKit } from "@/components/ppc-banners/storage";
import type { Banner, BannerFormat } from "@/components/ppc-banners/types";

type LayerId = "logo" | "qr" | "headline" | "description" | "description2" | "contact" | "cta" | "background";

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const ICON_PRESETS = ["", "→", "↗", "➜", "➔", "↑", "☎", "✉", "★", "✓"] as const;

function countLines(text: string) {
  return Math.max(1, text.split(/\r?\n/).length);
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

function RangeWithCenter({
  min,
  max,
  step,
  value,
  onChange,
  center,
}: {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (next: number) => void;
  center?: number;
}) {
  const centerValue = typeof center === "number" ? center : (min + max) / 2;
  const safeCenter = Math.max(min, Math.min(max, centerValue));
  const centerPct = max === min ? 50 : ((safeCenter - min) / (max - min)) * 100;
  return (
    <div className="space-y-1">
      <div className="relative">
        <Input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
        <span className="pointer-events-none absolute inset-y-0" style={{ left: `calc(${centerPct}% - 0.5px)` }}>
          <span className="absolute top-1/2 h-4 w-px -translate-y-1/2 bg-cyan-500/80" />
        </span>
      </div>
      <div className="flex justify-between text-[10px] text-slate-400">
        <span>{min}</span>
        <span>střed {safeCenter}</span>
        <span>{max}</span>
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
  onBannerChange: (field: keyof Banner, value: string | number | boolean | string[]) => void;
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

  const onGifFramesUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    const dataUrls = await Promise.all(Array.from(files).map((file) => fileToDataUrl(file)));
    onBannerChange("gifFrames", [...(banner.gifFrames || []), ...dataUrls].slice(0, 24));
  };

  const onQrUpload = async (file: File | null) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    onBannerChange("qrImageUrl", dataUrl);
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
    activeLayer === "logo"
      ? "logo"
      : activeLayer === "qr"
        ? "qr"
        : activeLayer === "headline"
          ? "headline"
          : activeLayer === "description"
            ? "subheadline"
            : activeLayer === "description2"
              ? "subheadline2"
              : activeLayer === "contact"
                ? "contact"
        : activeLayer === "cta"
          ? "cta"
          : "background";
  const headlineValue = format?.headline ?? banner.headline;
  const subheadlineValue = format?.subheadline ?? banner.subheadline;
  const subheadline2Value = format?.subheadline2 ?? "";
  const contactValue = format?.contactText ?? banner.contactText ?? "";
  const ctaValue = format?.ctaText ?? banner.ctaText;
  const bgImageValue = format?.bgImageUrl ?? banner.bgImageUrl ?? "";
  const bgScaleValue = Number(format?.bgScale ?? banner.bgScale ?? 100);
  const bgPositionXValue = Number(format?.bgPositionX ?? banner.bgPositionX ?? 50);
  const bgPositionYValue = Number(format?.bgPositionY ?? banner.bgPositionY ?? 50);
  const gifFrames = banner.gifFrames || [];
  const gifDelay = typeof banner.gifFrameDelayMs === "number" ? banner.gifFrameDelayMs : 900;
  const formatWidth = Math.max(1, format?.width ?? 1200);
  const formatHeight = Math.max(1, format?.height ?? 628);
  const offsetRangeX = Math.max(320, Math.round(formatWidth * 1.25));
  const offsetRangeY = Math.max(320, Math.round(formatHeight * 1.25));
  const zMap = {
    logo: typeof format?.zLogo === "number" ? format.zLogo : 40,
    qr: typeof format?.zQr === "number" ? format.zQr : 45,
    headline: typeof format?.zHeadline === "number" ? format.zHeadline : 30,
    subheadline: typeof format?.zSubheadline === "number" ? format.zSubheadline : 31,
    subheadline2: typeof format?.zSubheadline2 === "number" ? format.zSubheadline2 : 32,
    contact: typeof format?.zContact === "number" ? format.zContact : 33,
    cta: typeof format?.zCta === "number" ? format.zCta : 50,
  } as const;
  const orderedLayers = Object.entries(zMap)
    .sort((a, b) => a[1] - b[1])
    .map(([key]) => key as "logo" | "qr" | "headline" | "subheadline" | "subheadline2" | "contact" | "cta");
  const currentOrderIndex = currentLayerKey === "background" ? -1 : orderedLayers.indexOf(currentLayerKey as "logo" | "qr" | "headline" | "subheadline" | "subheadline2" | "contact" | "cta");

  const applyLayerOrder = (order: Array<"logo" | "qr" | "headline" | "subheadline" | "subheadline2" | "contact" | "cta">) => {
    order.forEach((layer, idx) => {
      const z = 10 + idx * 10;
      if (layer === "logo") onFormatChange("zLogo", z);
      if (layer === "qr") onFormatChange("zQr", z);
      if (layer === "headline") onFormatChange("zHeadline", z);
      if (layer === "subheadline") onFormatChange("zSubheadline", z);
      if (layer === "subheadline2") onFormatChange("zSubheadline2", z);
      if (layer === "contact") onFormatChange("zContact", z);
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

  const alignTextLayersToGuideArea = () => {
    if (!format) return;

    const nextFormat: BannerFormat = {
      ...format,
      guideAreaEnabled: true,
      textAlignX: "left",
      textAlignY: "top",
      textContentAlign: "center",
      textOffsetX: 0,
      textOffsetY: 0,
      headlineOffsetX: 0,
      subheadlineOffsetX: 0,
      subheadline2OffsetX: 0,
      contactOffsetX: 0,
    };
    const model = computeBannerRenderModel(banner, nextFormat, 1);
    const areaTop = model.guideAreaTop;
    const areaHeight = model.guideAreaHeight;
    const visibleBlocks = [
      {
        key: "headlineOffsetY" as const,
        text: headlineValue,
        top: model.headlineTop,
        baseTop: model.headlineTop,
        height: countLines(headlineValue) * model.headlineSize * 1.05,
      },
      {
        key: "subheadlineOffsetY" as const,
        text: subheadlineValue,
        top: model.subheadlineTop,
        baseTop: model.subheadlineTop,
        height: countLines(subheadlineValue) * model.subheadlineSize * 1.5,
      },
      {
        key: "subheadline2OffsetY" as const,
        text: subheadline2Value,
        top: model.subheadline2Top,
        baseTop: model.subheadline2Top,
        height: countLines(subheadline2Value) * model.subheadline2Size * 1.5,
      },
      {
        key: "contactOffsetY" as const,
        text: contactValue,
        top: model.contactTop,
        baseTop: model.contactTop,
        height: countLines(contactValue) * model.contactSize * 1.4,
      },
    ].filter((block) => block.text.trim());

    nextFormat.headlineOffsetY = 0;
    nextFormat.subheadlineOffsetY = 0;
    nextFormat.subheadline2OffsetY = 0;
    nextFormat.contactOffsetY = 0;

    if (visibleBlocks.length) {
      const firstTop = visibleBlocks[0].top;
      const stackBottom = Math.max(...visibleBlocks.map((block) => block.top + block.height));
      const stackHeight = stackBottom - firstTop;
      const targetTop = Math.round(areaTop + Math.max(0, (areaHeight - stackHeight) / 2));
      visibleBlocks.forEach((block) => {
        nextFormat[block.key] = Math.round(targetTop + (block.top - firstTop) - block.baseTop);
      });
    }

    (
      [
        "guideAreaEnabled",
        "textAlignX",
        "textAlignY",
        "textContentAlign",
        "textOffsetX",
        "textOffsetY",
        "headlineOffsetX",
        "subheadlineOffsetX",
        "subheadline2OffsetX",
        "contactOffsetX",
        "headlineOffsetY",
        "subheadlineOffsetY",
        "subheadline2OffsetY",
        "contactOffsetY",
      ] as const
    ).forEach((key) => {
      onFormatChange(key, nextFormat[key] as string | number | boolean);
    });
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
            ["qr", "2. QR"],
            ["headline", "3. Nadpis"],
            ["description", "4. Popis"],
            ["description2", "5. POPIS 2"],
            ["contact", "6. Kontakt"],
            ["cta", "7. CTA"],
            ["background", "8. Background foto"],
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
        <>
        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Zarovnávací oblast</p>
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={Boolean(format.guideAreaEnabled)}
                onChange={(e) => onFormatChange("guideAreaEnabled", e.target.checked)}
              />
              Zapnout
            </label>
          </div>
          <p className="text-xs leading-5 text-slate-500">Na plátně se zobrazí oblast, kterou můžeš myší posouvat a měnit její velikost. Texty pak jedním klikem vycentruješ doprostřed této části.</p>
          <div className="space-y-2">
            <Label className="text-xs">Oblast X: {Math.round(format.guideAreaX ?? 4)}%</Label>
            <RangeWithCenter min={0} max={95} step={1} value={Math.round(format.guideAreaX ?? 4)} onChange={(v) => onFormatChange("guideAreaX", v)} center={50} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Oblast Y: {Math.round(format.guideAreaY ?? 4)}%</Label>
            <RangeWithCenter min={0} max={95} step={1} value={Math.round(format.guideAreaY ?? 4)} onChange={(v) => onFormatChange("guideAreaY", v)} center={50} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Šířka oblasti: {Math.round(format.guideAreaWidth ?? 36)}%</Label>
            <RangeWithCenter min={5} max={100 - Math.round(format.guideAreaX ?? 4)} step={1} value={Math.round(format.guideAreaWidth ?? 36)} onChange={(v) => onFormatChange("guideAreaWidth", v)} center={36} />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Výška oblasti: {Math.round(format.guideAreaHeight ?? 92)}%</Label>
            <RangeWithCenter min={5} max={100 - Math.round(format.guideAreaY ?? 4)} step={1} value={Math.round(format.guideAreaHeight ?? 92)} onChange={(v) => onFormatChange("guideAreaHeight", v)} center={92} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onFormatChange("guideAreaEnabled", true);
                onFormatChange("guideAreaX", 4);
                onFormatChange("guideAreaY", 4);
                onFormatChange("guideAreaWidth", 36);
                onFormatChange("guideAreaHeight", 92);
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Levý panel
            </button>
            <button
              type="button"
              onClick={alignTextLayersToGuideArea}
              className="rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-100"
            >
              Vycentrovat texty
            </button>
          </div>
        </div>

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
                <RangeWithCenter min={0.4} max={18} step={0.1} value={format.logoScale || 1} onChange={(v) => onFormatChange("logoScale", v)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Posun X: {format.logoOffsetX || 0}px</Label>
                <RangeWithCenter min={-offsetRangeX} max={offsetRangeX} step={1} value={format.logoOffsetX || 0} onChange={(v) => onFormatChange("logoOffsetX", v)} center={0} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Posun Y: {format.logoOffsetY || 0}px</Label>
                <RangeWithCenter min={-offsetRangeY} max={offsetRangeY} step={1} value={format.logoOffsetY || 0} onChange={(v) => onFormatChange("logoOffsetY", v)} center={0} />
              </div>
              <AlignButtons label="Zarovnání X" value={logoAlignX} onChange={(v) => onFormatChange("logoAlignX", v)} options={[{ value: "left", label: "Vlevo" }, { value: "center", label: "Střed" }, { value: "right", label: "Vpravo" }]} />
              <AlignButtons label="Zarovnání Y" value={logoAlignY} onChange={(v) => onFormatChange("logoAlignY", v)} options={[{ value: "top", label: "Nahoru" }, { value: "center", label: "Střed" }, { value: "bottom", label: "Dolů" }]} />
            </>
          ) : null}

          {activeLayer === "qr" ? (
            <>
              <Label className="text-xs text-slate-600">QR kod URL</Label>
              <Input value={banner.qrImageUrl || ""} onChange={(e) => onBannerChange("qrImageUrl", e.target.value)} className="border-slate-200 bg-white" placeholder="https://.../qr.jpg" />
              <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50">
                <Upload className="h-3.5 w-3.5" />
                Vybrat QR obrazek
                <input type="file" className="hidden" accept="image/*" onChange={(e) => void onQrUpload(e.target.files?.[0] || null)} />
              </label>
              {banner.qrImageUrl ? (
                <button
                  type="button"
                  onClick={() => onBannerChange("qrImageUrl", "")}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Odebrat QR obrazek
                </button>
              ) : null}
              <div className="space-y-2">
                <Label className="text-xs">Velikost QR: {(format.qrScale || 1).toFixed(2)}x</Label>
                <RangeWithCenter min={0.4} max={6} step={0.05} value={format.qrScale || 1} onChange={(v) => onFormatChange("qrScale", v)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Posun QR X: {format.qrOffsetX || 0}px</Label>
                <RangeWithCenter min={-offsetRangeX} max={offsetRangeX} step={1} value={format.qrOffsetX || 0} onChange={(v) => onFormatChange("qrOffsetX", v)} center={0} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Posun QR Y: {format.qrOffsetY || 0}px</Label>
                <RangeWithCenter min={-offsetRangeY} max={offsetRangeY} step={1} value={format.qrOffsetY || 0} onChange={(v) => onFormatChange("qrOffsetY", v)} center={0} />
              </div>
            </>
          ) : null}

          {activeLayer === "headline" ? (
            <>
              <Label className="text-xs text-slate-600">Text nadpisu</Label>
              <textarea
                value={headlineValue}
                onChange={(e) => onFormatChange("headline", e.target.value)}
                className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500"
              />
              <div className="space-y-2">
                <Label className="text-xs">Velikost headline: {format.headlineSize}px</Label>
                <RangeWithCenter min={16} max={270} value={format.headlineSize} onChange={(v) => onFormatChange("headlineSize", v)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Posun headline X: {format.headlineOffsetX || 0}px</Label>
                <RangeWithCenter min={-offsetRangeX} max={offsetRangeX} step={1} value={format.headlineOffsetX || 0} onChange={(v) => onFormatChange("headlineOffsetX", v)} center={0} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Posun headline Y: {format.headlineOffsetY || 0}px</Label>
                <RangeWithCenter min={-offsetRangeY} max={offsetRangeY} step={1} value={format.headlineOffsetY || 0} onChange={(v) => onFormatChange("headlineOffsetY", v)} center={0} />
              </div>
              <AlignButtons label="Zarovnání bloku X" value={textAlignX} onChange={(v) => onFormatChange("textAlignX", v)} options={[{ value: "left", label: "Vlevo" }, { value: "center", label: "Střed" }, { value: "right", label: "Vpravo" }]} />
              <AlignButtons label="Zarovnání bloku Y" value={textAlignY} onChange={(v) => onFormatChange("textAlignY", v)} options={[{ value: "top", label: "Nahoru" }, { value: "center", label: "Střed" }, { value: "bottom", label: "Dolů" }]} />
              <AlignButtons label="Zarovnání textu" value={textContentAlign} onChange={(v) => onFormatChange("textContentAlign", v)} options={[{ value: "left", label: "Vlevo" }, { value: "center", label: "Střed" }, { value: "right", label: "Vpravo" }]} />
            </>
          ) : null}

          {activeLayer === "description" ? (
            <>
              <Label className="text-xs text-slate-600">Text popisu</Label>
              <textarea
                value={subheadlineValue}
                onChange={(e) => onFormatChange("subheadline", e.target.value)}
                className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500"
              />
              <div className="space-y-2">
                <Label className="text-xs">Velikost popisu: {format.subheadlineSize}px</Label>
                <RangeWithCenter min={12} max={144} value={format.subheadlineSize} onChange={(v) => onFormatChange("subheadlineSize", v)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Posun popisu X: {format.subheadlineOffsetX || 0}px</Label>
                <RangeWithCenter min={-offsetRangeX} max={offsetRangeX} step={1} value={format.subheadlineOffsetX || 0} onChange={(v) => onFormatChange("subheadlineOffsetX", v)} center={0} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Posun popisu Y: {format.subheadlineOffsetY || 0}px</Label>
                <RangeWithCenter min={-offsetRangeY} max={offsetRangeY} step={1} value={format.subheadlineOffsetY || 0} onChange={(v) => onFormatChange("subheadlineOffsetY", v)} center={0} />
              </div>
              <AlignButtons label="Zarovnání textu" value={textContentAlign} onChange={(v) => onFormatChange("textContentAlign", v)} options={[{ value: "left", label: "Vlevo" }, { value: "center", label: "Střed" }, { value: "right", label: "Vpravo" }]} />
            </>
          ) : null}

          {activeLayer === "description2" ? (
            <>
              <Label className="text-xs text-slate-600">Text POPIS 2</Label>
              <textarea
                value={subheadline2Value}
                onChange={(e) => onFormatChange("subheadline2", e.target.value)}
                className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500"
              />
              <div className="space-y-2">
                <Label className="text-xs">Velikost POPIS 2: {format.subheadline2Size || format.subheadlineSize}px</Label>
                <RangeWithCenter min={12} max={144} value={format.subheadline2Size || format.subheadlineSize} onChange={(v) => onFormatChange("subheadline2Size", v)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Posun POPIS 2 X: {format.subheadline2OffsetX || 0}px</Label>
                <RangeWithCenter min={-offsetRangeX} max={offsetRangeX} step={1} value={format.subheadline2OffsetX || 0} onChange={(v) => onFormatChange("subheadline2OffsetX", v)} center={0} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Posun POPIS 2 Y: {format.subheadline2OffsetY || 0}px</Label>
                <RangeWithCenter min={-offsetRangeY} max={offsetRangeY} step={1} value={format.subheadline2OffsetY || 0} onChange={(v) => onFormatChange("subheadline2OffsetY", v)} center={0} />
              </div>
              <AlignButtons label="Zarovnání textu" value={textContentAlign} onChange={(v) => onFormatChange("textContentAlign", v)} options={[{ value: "left", label: "Vlevo" }, { value: "center", label: "Střed" }, { value: "right", label: "Vpravo" }]} />
            </>
          ) : null}

          {activeLayer === "contact" ? (
            <>
              <Label className="text-xs text-slate-600">Kontakt</Label>
              <textarea
                value={contactValue}
                onChange={(e) => onFormatChange("contactText", e.target.value)}
                className="min-h-24 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-cyan-500"
                placeholder="+420 123 456 789&#10;info@firma.cz&#10;www.firma.cz"
              />
              <div className="space-y-2">
                <Label className="text-xs">Velikost kontaktu: {format.contactSize || format.subheadlineSize}px</Label>
                <RangeWithCenter min={12} max={144} value={format.contactSize || format.subheadlineSize} onChange={(v) => onFormatChange("contactSize", v)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Posun kontaktu X: {format.contactOffsetX || 0}px</Label>
                <RangeWithCenter min={-offsetRangeX} max={offsetRangeX} step={1} value={format.contactOffsetX || 0} onChange={(v) => onFormatChange("contactOffsetX", v)} center={0} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Posun kontaktu Y: {format.contactOffsetY || 0}px</Label>
                <RangeWithCenter min={-offsetRangeY} max={offsetRangeY} step={1} value={format.contactOffsetY || 0} onChange={(v) => onFormatChange("contactOffsetY", v)} center={0} />
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
                <RangeWithCenter min={10} max={90} value={format.ctaSize} onChange={(v) => onFormatChange("ctaSize", v)} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Posun CTA X: {format.ctaOffsetX || 0}px</Label>
                <RangeWithCenter min={-offsetRangeX} max={offsetRangeX} step={1} value={format.ctaOffsetX || 0} onChange={(v) => onFormatChange("ctaOffsetX", v)} center={0} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Posun CTA Y: {format.ctaOffsetY || 0}px</Label>
                <RangeWithCenter min={-offsetRangeY} max={offsetRangeY} step={1} value={format.ctaOffsetY || 0} onChange={(v) => onFormatChange("ctaOffsetY", v)} center={0} />
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
                <RangeWithCenter min={10} max={260} value={bgScaleValue} onChange={(v) => onFormatChange("bgScale", v)} center={100} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Pozice X: {Math.round(bgPositionXValue)}%</Label>
                <RangeWithCenter min={0} max={100} value={bgPositionXValue} onChange={(v) => onFormatChange("bgPositionX", v)} center={50} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Pozice Y: {Math.round(bgPositionYValue)}%</Label>
                <RangeWithCenter min={0} max={100} value={bgPositionYValue} onChange={(v) => onFormatChange("bgPositionY", v)} center={50} />
              </div>
              <div className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">GIF slideshow</p>
                    <p className="text-[11px] text-slate-500">Nahraj vice obrázků a export GIF použije každý z nich jako další snímek banneru.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{gifFrames.length} snímků</span>
                </div>
                <label className="flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50">
                  <Upload className="h-3.5 w-3.5" />
                  Nahrát obrázky pro GIF
                  <input type="file" className="hidden" accept="image/*" multiple onChange={(e) => void onGifFramesUpload(e.target.files)} />
                </label>
                <div className="space-y-2">
                  <Label className="text-xs">Délka snímku: {gifDelay} ms</Label>
                  <RangeWithCenter min={200} max={3000} step={100} value={gifDelay} onChange={(v) => onBannerChange("gifFrameDelayMs", v)} center={900} />
                </div>
                {gifFrames.length ? (
                  <>
                    <div className="grid grid-cols-4 gap-2">
                      {gifFrames.slice(0, 8).map((frame, index) => (
                        <div key={`${index}-${frame.slice(0, 24)}`} className="relative overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                          <img src={frame} alt={`GIF frame ${index + 1}`} className="aspect-square h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => onBannerChange("gifFrames", gifFrames.filter((_, i) => i !== index))}
                            className="absolute right-1 top-1 rounded bg-white/90 px-1 text-[10px] font-bold text-slate-700 shadow"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => onBannerChange("gifFrames", [])}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Smazat všechny snímky
                      </button>
                      <button
                        type="button"
                        onClick={() => onBannerChange("gifFrames", [...gifFrames].reverse())}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Obrátit pořadí
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
            </>
          ) : null}
        </div>
        </>
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

      <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Ikona nebo sipka</p>
        <div className="grid grid-cols-5 gap-2">
          {ICON_PRESETS.map((icon) => (
            <button
              key={icon || "none"}
              type="button"
              onClick={() => onBannerChange("overlayIcon", icon)}
              className={`flex h-10 items-center justify-center rounded-lg border text-base font-bold ${banner.overlayIcon === icon ? "border-cyan-500 bg-cyan-50 text-cyan-700" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              {icon || "×"}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-slate-600">Vlastni znak nebo ikona</Label>
          <Input
            value={banner.overlayIcon || ""}
            onChange={(e) => onBannerChange("overlayIcon", e.target.value.slice(0, 2))}
            className="border-slate-200 bg-white"
            placeholder="napr. ↗"
          />
        </div>
        <p className="text-[11px] text-slate-500">Ikona se vykresli do leveho horniho rohu a bude i v exportu.</p>
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
