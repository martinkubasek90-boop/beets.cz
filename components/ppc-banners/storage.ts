"use client";

import { PRESET_FORMATS, type Banner, type BannerFormat, type BannerGoal, type BannerSnapshot, type BannerStatus, type BrandKit } from "@/components/ppc-banners/types";

const BANNERS_KEY = "ppc_banners_v1";
const BRAND_KIT_KEY = "ppc_brand_kit_v1";

function safeParse(input: string) {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return null;
  }
}

function deepClone<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function makeDuplicateName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "Banner (kopie)";
  const match = trimmed.match(/^(.*) \(kopie(?: (\d+))?\)$/);
  if (!match) return `${trimmed} (kopie)`;
  const baseName = match[1]?.trim() || "Banner";
  const currentIndex = Number(match[2] || "1");
  return `${baseName} (kopie ${currentIndex + 1})`;
}

function withDefaults(banner: Banner): Banner {
  const goal: BannerGoal = banner.goal || "traffic";
  const status: BannerStatus = banner.status || "draft";
  const normalizedFormats = (banner.formats || []).map((format) => withFormatDefaults(format));
  return {
    ...banner,
    goal,
    status,
    logoTransparentBg: Boolean(banner.logoTransparentBg),
    qrTrackingEnabled: typeof banner.qrTrackingEnabled === "boolean" ? banner.qrTrackingEnabled : true,
    gifFrames: Array.isArray(banner.gifFrames) ? banner.gifFrames.filter((item): item is string => typeof item === "string" && item.length > 0) : [],
    gifFrameDelayMs: typeof banner.gifFrameDelayMs === "number" ? banner.gifFrameDelayMs : 900,
    formats: normalizedFormats.length ? normalizedFormats : [withFormatDefaults(PRESET_FORMATS[0])],
    versions: Array.isArray(banner.versions) ? banner.versions : [],
  };
}

function withFormatDefaults(format: BannerFormat): BannerFormat {
  const preset = PRESET_FORMATS.find((item) => item.id === format.id);
  const fallback = preset || PRESET_FORMATS[0];
  return {
    ...fallback,
    ...format,
    contactSize: typeof format.contactSize === "number" ? format.contactSize : format.subheadlineSize || fallback.subheadlineSize,
    logoScale: typeof format.logoScale === "number" ? format.logoScale : 1,
    qrScale: typeof format.qrScale === "number" ? format.qrScale : 1,
    textOffsetX: typeof format.textOffsetX === "number" ? format.textOffsetX : 0,
    textOffsetY: typeof format.textOffsetY === "number" ? format.textOffsetY : 0,
    headlineOffsetX: typeof format.headlineOffsetX === "number" ? format.headlineOffsetX : 0,
    headlineOffsetY: typeof format.headlineOffsetY === "number" ? format.headlineOffsetY : 0,
    subheadlineOffsetX: typeof format.subheadlineOffsetX === "number" ? format.subheadlineOffsetX : 0,
    subheadlineOffsetY: typeof format.subheadlineOffsetY === "number" ? format.subheadlineOffsetY : 0,
    subheadline2OffsetX: typeof format.subheadline2OffsetX === "number" ? format.subheadline2OffsetX : 0,
    subheadline2OffsetY: typeof format.subheadline2OffsetY === "number" ? format.subheadline2OffsetY : 0,
    contactOffsetX: typeof format.contactOffsetX === "number" ? format.contactOffsetX : 0,
    contactOffsetY: typeof format.contactOffsetY === "number" ? format.contactOffsetY : 0,
    logoOffsetX: typeof format.logoOffsetX === "number" ? format.logoOffsetX : 0,
    logoOffsetY: typeof format.logoOffsetY === "number" ? format.logoOffsetY : 0,
    qrOffsetX: typeof format.qrOffsetX === "number" ? format.qrOffsetX : 0,
    qrOffsetY: typeof format.qrOffsetY === "number" ? format.qrOffsetY : 0,
    ctaOffsetX: typeof format.ctaOffsetX === "number" ? format.ctaOffsetX : 0,
    ctaOffsetY: typeof format.ctaOffsetY === "number" ? format.ctaOffsetY : 0,
    guideAreaEnabled: typeof format.guideAreaEnabled === "boolean" ? format.guideAreaEnabled : false,
    guideAreaX: typeof format.guideAreaX === "number" ? format.guideAreaX : 4,
    guideAreaY: typeof format.guideAreaY === "number" ? format.guideAreaY : 4,
    guideAreaWidth: typeof format.guideAreaWidth === "number" ? format.guideAreaWidth : 36,
    guideAreaHeight: typeof format.guideAreaHeight === "number" ? format.guideAreaHeight : 92,
    shapeEnabled: typeof format.shapeEnabled === "boolean" ? format.shapeEnabled : false,
    shapeType: format.shapeType === "rect" ? "rect" : "circle",
    shapeColor: format.shapeColor || "#06B6D4",
    shapeOpacity: typeof format.shapeOpacity === "number" ? format.shapeOpacity : 26,
    shapeX: typeof format.shapeX === "number" ? format.shapeX : 78,
    shapeY: typeof format.shapeY === "number" ? format.shapeY : 22,
    shapeSize: typeof format.shapeSize === "number" ? format.shapeSize : 24,
    borderWidth: typeof format.borderWidth === "number" ? format.borderWidth : 0,
    logoAlignX: format.logoAlignX || "left",
    logoAlignY: format.logoAlignY || "top",
    textAlignX: format.textAlignX || "left",
    textAlignY: format.textAlignY || "center",
    textContentAlign: format.textContentAlign || "left",
    ctaAlignX: format.ctaAlignX || "left",
    ctaAlignY: format.ctaAlignY || "bottom",
    zLogo: typeof format.zLogo === "number" ? format.zLogo : 40,
    zQr: typeof format.zQr === "number" ? format.zQr : 45,
    zText: typeof format.zText === "number" ? format.zText : 30,
    zHeadline: typeof format.zHeadline === "number" ? format.zHeadline : 30,
    zSubheadline: typeof format.zSubheadline === "number" ? format.zSubheadline : 31,
    zSubheadline2: typeof format.zSubheadline2 === "number" ? format.zSubheadline2 : 32,
    zContact: typeof format.zContact === "number" ? format.zContact : 33,
    zCta: typeof format.zCta === "number" ? format.zCta : 50,
    zShape: typeof format.zShape === "number" ? format.zShape : 10,
    subheadline2Size: typeof format.subheadline2Size === "number" ? format.subheadline2Size : format.subheadlineSize || fallback.subheadlineSize,
  };
}

export function listBanners(): Banner[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(BANNERS_KEY);
  if (!raw) return [];
  const parsed = safeParse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((item): item is Banner => Boolean(item && typeof item === "object" && (item as Banner).id))
    .map((item) => withDefaults(item))
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export function getBannerById(id: string) {
  return listBanners().find((item) => item.id === id) || null;
}

export function upsertBanner(banner: Banner) {
  if (typeof window === "undefined") return;
  const all = listBanners();
  const idx = all.findIndex((item) => item.id === banner.id);
  const normalized = withDefaults(banner);
  if (idx >= 0) all[idx] = normalized;
  else all.unshift(normalized);
  window.localStorage.setItem(BANNERS_KEY, JSON.stringify(all));
}

export function duplicateBanner(source: Banner) {
  if (typeof window === "undefined") return null;
  const now = new Date().toISOString();
  const sourceClone = deepClone(withDefaults(source));
  const clone: Banner = withDefaults({
    ...sourceClone,
    id: `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    name: makeDuplicateName(source.name),
    createdAt: now,
    updatedAt: now,
    autosavedAt: now,
    shareToken: undefined,
  });
  upsertBanner(clone);
  return clone;
}

export function deleteBanner(id: string) {
  if (typeof window === "undefined") return;
  const next = listBanners().filter((item) => item.id !== id);
  window.localStorage.setItem(BANNERS_KEY, JSON.stringify(next));
}

export function makeSnapshot(banner: Banner): BannerSnapshot {
  return {
    name: banner.name,
    headline: banner.headline,
    subheadline: banner.subheadline,
    contactText: banner.contactText,
    ctaText: banner.ctaText,
    brandName: banner.brandName,
    brandUrl: banner.brandUrl,
    logoUrl: banner.logoUrl,
    qrTargetUrl: banner.qrTargetUrl,
    qrTrackingEnabled: banner.qrTrackingEnabled,
    qrUtmSource: banner.qrUtmSource,
    qrUtmMedium: banner.qrUtmMedium,
    qrUtmCampaign: banner.qrUtmCampaign,
    qrUtmContent: banner.qrUtmContent,
    qrUtmTerm: banner.qrUtmTerm,
    qrImageUrl: banner.qrImageUrl,
    overlayIcon: banner.overlayIcon,
    logoTransparentBg: banner.logoTransparentBg,
    bgMode: banner.bgMode,
    bgColor: banner.bgColor,
    bgImageUrl: banner.bgImageUrl,
    bgPrompt: banner.bgPrompt,
    gifFrames: banner.gifFrames,
    gifFrameDelayMs: banner.gifFrameDelayMs,
    bgPositionX: banner.bgPositionX,
    bgPositionY: banner.bgPositionY,
    bgScale: banner.bgScale,
    textColor: banner.textColor,
    ctaBg: banner.ctaBg,
    ctaTextColor: banner.ctaTextColor,
    formats: banner.formats,
    activeFormatIndex: banner.activeFormatIndex || 0,
    goal: banner.goal || "traffic",
    status: banner.status || "draft",
  };
}

export function applySnapshot(banner: Banner, snapshot: BannerSnapshot): Banner {
  return {
    ...banner,
    ...snapshot,
  };
}

export function getBrandKit(): BrandKit | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(BRAND_KIT_KEY);
  if (!raw) return null;
  const parsed = safeParse(raw);
  if (!parsed || typeof parsed !== "object") return null;
  const kit = parsed as BrandKit;
  if (!kit.brandName && !kit.brandUrl) return null;
  return kit;
}

export function saveBrandKit(brandKit: BrandKit) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BRAND_KIT_KEY, JSON.stringify(brandKit));
}
