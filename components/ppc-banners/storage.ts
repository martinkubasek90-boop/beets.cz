"use client";

import type { Banner, BannerGoal, BannerSnapshot, BannerStatus, BrandKit } from "@/components/ppc-banners/types";

const BANNERS_KEY = "ppc_banners_v1";
const BRAND_KIT_KEY = "ppc_brand_kit_v1";

function safeParse(input: string) {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return null;
  }
}

function withDefaults(banner: Banner): Banner {
  const goal: BannerGoal = banner.goal || "traffic";
  const status: BannerStatus = banner.status || "draft";
  return {
    ...banner,
    goal,
    status,
    versions: Array.isArray(banner.versions) ? banner.versions : [],
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
    ctaText: banner.ctaText,
    brandName: banner.brandName,
    brandUrl: banner.brandUrl,
    logoUrl: banner.logoUrl,
    bgMode: banner.bgMode,
    bgColor: banner.bgColor,
    bgImageUrl: banner.bgImageUrl,
    bgPrompt: banner.bgPrompt,
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
