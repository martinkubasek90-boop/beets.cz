"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Banner, BannerFormat } from "@/components/ppc-banners/types";

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
  return (
    <div className="space-y-4 p-3">
      <div className="space-y-2">
        <Label className="text-xs">Headline</Label>
        <Input value={banner.headline} onChange={(e) => onBannerChange("headline", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">Subheadline</Label>
        <Input value={banner.subheadline} onChange={(e) => onBannerChange("subheadline", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label className="text-xs">CTA text</Label>
        <Input value={banner.ctaText} onChange={(e) => onBannerChange("ctaText", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">Barva pozadí</Label>
          <Input type="color" value={banner.bgColor} onChange={(e) => onBannerChange("bgColor", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Barva textu</Label>
          <Input type="color" value={banner.textColor} onChange={(e) => onBannerChange("textColor", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label className="text-xs">CTA pozadí</Label>
          <Input type="color" value={banner.ctaBg} onChange={(e) => onBannerChange("ctaBg", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">CTA text</Label>
          <Input type="color" value={banner.ctaTextColor} onChange={(e) => onBannerChange("ctaTextColor", e.target.value)} />
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

