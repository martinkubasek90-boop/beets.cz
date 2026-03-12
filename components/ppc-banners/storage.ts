"use client";

import type { Banner } from "@/components/ppc-banners/types";

const BANNERS_KEY = "ppc_banners_v1";

function safeParse(input: string) {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return null;
  }
}

export function listBanners(): Banner[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(BANNERS_KEY);
  if (!raw) return [];
  const parsed = safeParse(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter((item): item is Banner => Boolean(item && typeof item === "object" && (item as Banner).id))
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export function getBannerById(id: string) {
  return listBanners().find((item) => item.id === id) || null;
}

export function upsertBanner(banner: Banner) {
  if (typeof window === "undefined") return;
  const all = listBanners();
  const idx = all.findIndex((item) => item.id === banner.id);
  if (idx >= 0) all[idx] = banner;
  else all.unshift(banner);
  window.localStorage.setItem(BANNERS_KEY, JSON.stringify(all));
}

export function deleteBanner(id: string) {
  if (typeof window === "undefined") return;
  const next = listBanners().filter((item) => item.id !== id);
  window.localStorage.setItem(BANNERS_KEY, JSON.stringify(next));
}

