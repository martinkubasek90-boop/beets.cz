import type { Banner, BannerFormat } from "@/components/ppc-banners/types";

export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export type BannerRenderModel = {
  boxW: number;
  boxH: number;
  padding: number;
  headlineSize: number;
  subheadlineSize: number;
  subheadline2Size: number;
  ctaSize: number;
  logoW: number;
  logoH: number;
  logoLeft: number;
  logoTop: number;
  textW: number;
  textLeft: number;
  textTop: number;
  ctaW: number;
  ctaH: number;
  ctaLeft: number;
  ctaTop: number;
  bgScale: number;
  bgPositionX: number;
  bgPositionY: number;
  resolvedHeadline: string;
  resolvedSubheadline: string;
  resolvedSubheadline2: string;
  resolvedCtaText: string;
  resolvedBgImageUrl: string;
};

export function computeBannerRenderModel(banner: Banner, format: BannerFormat, scale: number): BannerRenderModel {
  const padding = Math.max(8, Math.round(format.padding * scale));
  const headlineSize = Math.max(12, Math.round(format.headlineSize * scale));
  const subheadlineSize = Math.max(10, Math.round(format.subheadlineSize * scale));
  const subheadline2Size = Math.max(10, Math.round((format.subheadline2Size || format.subheadlineSize) * scale));
  const ctaSize = Math.max(10, Math.round(format.ctaSize * scale));
  const logoScale = Math.max(0.4, Math.min(12, format.logoScale || 1));
  const logoOffsetX = Math.round((format.logoOffsetX || 0) * scale);
  const logoOffsetY = Math.round((format.logoOffsetY || 0) * scale);
  const textOffsetX = Math.round((format.textOffsetX || 0) * scale);
  const textOffsetY = Math.round((format.textOffsetY || 0) * scale);
  const ctaOffsetX = Math.round((format.ctaOffsetX || 0) * scale);
  const ctaOffsetY = Math.round((format.ctaOffsetY || 0) * scale);

  const resolvedHeadline = format.headline ?? banner.headline;
  const resolvedSubheadline = format.subheadline ?? banner.subheadline;
  const resolvedSubheadline2 = format.subheadline2 ?? "";
  const resolvedCtaText = format.ctaText ?? banner.ctaText;
  const resolvedBgImageUrl = format.bgImageUrl ?? banner.bgImageUrl ?? "";
  const bgScale = clamp(typeof format.bgScale === "number" ? format.bgScale : typeof banner.bgScale === "number" ? banner.bgScale : 100, 10, 260);
  const bgPositionX = clamp(typeof format.bgPositionX === "number" ? format.bgPositionX : typeof banner.bgPositionX === "number" ? banner.bgPositionX : 50, 0, 100);
  const bgPositionY = clamp(typeof format.bgPositionY === "number" ? format.bgPositionY : typeof banner.bgPositionY === "number" ? banner.bgPositionY : 50, 0, 100);

  const boxW = Math.round(format.width * scale);
  const boxH = Math.round(format.height * scale);

  const logoAlignX = format.logoAlignX || "left";
  const logoAlignY = format.logoAlignY || "top";
  const logoW = Math.round(130 * scale * logoScale);
  const logoH = Math.round(32 * scale * logoScale);
  const logoBaseX = logoAlignX === "left" ? padding : logoAlignX === "center" ? Math.round((boxW - logoW) / 2) : boxW - padding - logoW;
  const logoBaseY = logoAlignY === "top" ? padding : logoAlignY === "center" ? Math.round((boxH - logoH) / 2) : boxH - padding - logoH;
  const logoLeft = clamp(logoBaseX + logoOffsetX, 0, Math.max(0, boxW - logoW));
  const logoTop = clamp(logoBaseY + logoOffsetY, 0, Math.max(0, boxH - logoH));

  const textAlignX = format.textAlignX || "left";
  const textAlignY = format.textAlignY || "center";
  const textW = Math.max(120, boxW - padding * 2 - 10);
  const textBaseX = textAlignX === "left" ? padding : textAlignX === "center" ? Math.round((boxW - textW) / 2) : boxW - padding - textW;
  const textBaseY = textAlignY === "top" ? padding + Math.round(80 * scale) : textAlignY === "center" ? Math.round(boxH * 0.37) : boxH - padding - Math.round(140 * scale);
  const textLeft = clamp(textBaseX + textOffsetX, 0, Math.max(0, boxW - textW));
  const textTop = clamp(textBaseY + textOffsetY, 0, boxH);

  const ctaAlignX = format.ctaAlignX || "left";
  const ctaAlignY = format.ctaAlignY || "bottom";
  const ctaW = Math.round((resolvedCtaText || "Zjistit více").length * ctaSize * 0.55 + 32);
  const ctaH = Math.round(ctaSize + 20);
  const ctaBaseX = ctaAlignX === "left" ? padding : ctaAlignX === "center" ? Math.round((boxW - ctaW) / 2) : boxW - padding - ctaW;
  const ctaBaseY = ctaAlignY === "top" ? padding : ctaAlignY === "center" ? Math.round((boxH - ctaH) / 2) : boxH - padding - ctaH;
  const ctaLeft = clamp(ctaBaseX + ctaOffsetX, 0, Math.max(0, boxW - ctaW));
  const ctaTop = clamp(ctaBaseY + ctaOffsetY, 0, Math.max(0, boxH - ctaH));

  return {
    boxW,
    boxH,
    padding,
    headlineSize,
    subheadlineSize,
    subheadline2Size,
    ctaSize,
    logoW,
    logoH,
    logoLeft,
    logoTop,
    textW,
    textLeft,
    textTop,
    ctaW,
    ctaH,
    ctaLeft,
    ctaTop,
    bgScale,
    bgPositionX,
    bgPositionY,
    resolvedHeadline,
    resolvedSubheadline,
    resolvedSubheadline2,
    resolvedCtaText,
    resolvedBgImageUrl,
  };
}
