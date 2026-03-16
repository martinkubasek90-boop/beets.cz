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
  contactSize: number;
  ctaSize: number;
  logoW: number;
  logoH: number;
  logoLeft: number;
  logoTop: number;
  textW: number;
  headlineLeft: number;
  headlineTop: number;
  subheadlineLeft: number;
  subheadlineTop: number;
  subheadline2Left: number;
  subheadline2Top: number;
  contactLeft: number;
  contactTop: number;
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
  resolvedContactText: string;
  resolvedCtaText: string;
  resolvedBgImageUrl: string;
};

export function computeBannerRenderModel(banner: Banner, format: BannerFormat, scale: number): BannerRenderModel {
  const padding = Math.max(8, Math.round(format.padding * scale));
  const headlineSize = Math.max(12, Math.min(Math.round(270 * scale), Math.round(format.headlineSize * scale)));
  const subheadlineSize = Math.max(10, Math.min(Math.round(144 * scale), Math.round(format.subheadlineSize * scale)));
  const subheadline2Size = Math.max(10, Math.min(Math.round(144 * scale), Math.round((format.subheadline2Size || format.subheadlineSize) * scale)));
  const contactSize = Math.max(10, Math.min(Math.round(144 * scale), Math.round((format.contactSize || format.subheadlineSize) * scale)));
  const ctaSize = Math.max(10, Math.min(Math.round(90 * scale), Math.round(format.ctaSize * scale)));
  const logoScale = Math.max(0.4, Math.min(18, format.logoScale || 1));
  const logoOffsetX = Math.round((format.logoOffsetX || 0) * scale);
  const logoOffsetY = Math.round((format.logoOffsetY || 0) * scale);
  const textOffsetX = Math.round((format.textOffsetX || 0) * scale);
  const textOffsetY = Math.round((format.textOffsetY || 0) * scale);
  const ctaOffsetX = Math.round((format.ctaOffsetX || 0) * scale);
  const ctaOffsetY = Math.round((format.ctaOffsetY || 0) * scale);

  const resolvedHeadline = format.headline ?? banner.headline;
  const resolvedSubheadline = format.subheadline ?? banner.subheadline;
  const resolvedSubheadline2 = format.subheadline2 ?? "";
  const resolvedContactText = format.contactText ?? banner.contactText ?? "";
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
  const logoLeft = logoBaseX + logoOffsetX;
  const logoTop = logoBaseY + logoOffsetY;

  const textAlignX = format.textAlignX || "left";
  const textAlignY = format.textAlignY || "center";
  const textW = Math.max(120, boxW - padding * 2 - 10);
  const textBaseX = textAlignX === "left" ? padding : textAlignX === "center" ? Math.round((boxW - textW) / 2) : boxW - padding - textW;
  const textBaseY = textAlignY === "top" ? padding + Math.round(80 * scale) : textAlignY === "center" ? Math.round(boxH * 0.37) : boxH - padding - Math.round(140 * scale);
  const headlineLeft = textBaseX + textOffsetX + Math.round((format.headlineOffsetX || 0) * scale);
  const headlineTop = textBaseY + textOffsetY + Math.round((format.headlineOffsetY || 0) * scale);
  const subheadlineLeft = textBaseX + textOffsetX + Math.round((format.subheadlineOffsetX || 0) * scale);
  const subheadlineTop = textBaseY + textOffsetY + Math.round(headlineSize * 1.35) + Math.round((format.subheadlineOffsetY || 0) * scale);
  const subheadline2Left = textBaseX + textOffsetX + Math.round((format.subheadline2OffsetX || 0) * scale);
  const subheadline2Top = textBaseY + textOffsetY + Math.round(headlineSize * 1.35 + subheadlineSize * 1.7) + Math.round((format.subheadline2OffsetY || 0) * scale);
  const contactBaseY = boxH - padding - Math.round(contactSize * 2.2);
  const contactLeft = textBaseX + Math.round((format.contactOffsetX || 0) * scale);
  const contactTop = contactBaseY + Math.round((format.contactOffsetY || 0) * scale);

  const ctaAlignX = format.ctaAlignX || "left";
  const ctaAlignY = format.ctaAlignY || "bottom";
  const ctaPadX = Math.round(16 * scale);
  const ctaPadY = Math.round(10 * scale);
  const ctaW = Math.round((resolvedCtaText || "Zjistit více").length * ctaSize * 0.55 + ctaPadX * 2);
  const ctaH = Math.round(ctaSize + ctaPadY * 2);
  const ctaBaseX = ctaAlignX === "left" ? padding : ctaAlignX === "center" ? Math.round((boxW - ctaW) / 2) : boxW - padding - ctaW;
  const ctaBaseY = ctaAlignY === "top" ? padding : ctaAlignY === "center" ? Math.round((boxH - ctaH) / 2) : boxH - padding - ctaH;
  const ctaLeft = ctaBaseX + ctaOffsetX;
  const ctaTop = ctaBaseY + ctaOffsetY;

  return {
    boxW,
    boxH,
    padding,
    headlineSize,
    subheadlineSize,
    subheadline2Size,
    contactSize,
    ctaSize,
    logoW,
    logoH,
    logoLeft,
    logoTop,
    textW,
    headlineLeft,
    headlineTop,
    subheadlineLeft,
    subheadlineTop,
    subheadline2Left,
    subheadline2Top,
    contactLeft,
    contactTop,
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
    resolvedContactText,
    resolvedCtaText,
    resolvedBgImageUrl,
  };
}
