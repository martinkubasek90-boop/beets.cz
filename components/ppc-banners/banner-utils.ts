import type { Banner, BannerChecklist, BannerGoal } from "@/components/ppc-banners/types";

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const full = normalized.length === 3 ? normalized.split("").map((c) => `${c}${c}`).join("") : normalized;
  if (full.length !== 6) return null;
  const value = Number.parseInt(full, 16);
  if (Number.isNaN(value)) return null;
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function luminancePart(v: number) {
  const srgb = v / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(first: string, second: string) {
  const a = hexToRgb(first);
  const b = hexToRgb(second);
  if (!a || !b) return 1;
  const l1 = 0.2126 * luminancePart(a.r) + 0.7152 * luminancePart(a.g) + 0.0722 * luminancePart(a.b);
  const l2 = 0.2126 * luminancePart(b.r) + 0.7152 * luminancePart(b.g) + 0.0722 * luminancePart(b.b);
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

export function computeChecklist(banner: Banner): BannerChecklist {
  const textContrast = contrastRatio(banner.bgColor, banner.textColor);
  const ctaContrast = contrastRatio(banner.ctaBg, banner.ctaTextColor);
  return {
    hasBrandUrl: Boolean((banner.brandUrl || "").trim()),
    hasHeadline: Boolean((banner.headline || "").trim()),
    hasSubheadline: Boolean((banner.subheadline || "").trim()),
    hasLogo: Boolean((banner.logoUrl || "").trim()),
    hasBackground: Boolean((banner.bgImageUrl || "").trim()) || banner.bgMode === "generate",
    hasMinFormats: (banner.formats?.length || 0) >= 2,
    contrastTextOk: textContrast >= 4.5,
    contrastCtaOk: ctaContrast >= 4.5,
  };
}

export function isChecklistComplete(checklist: BannerChecklist) {
  return Object.values(checklist).every(Boolean);
}

export function createAiVariants(goal: BannerGoal, tone: "performance" | "premium" | "friendly", brandName: string) {
  const brand = brandName || "Vaše značka";
  const baseByGoal = {
    traffic: {
      headline: `${brand}: Objevte víc za méně času`,
      subheadline: "Klikněte a prohlédněte si nabídku, která funguje v praxi.",
      ctaText: "Zjistit více",
    },
    leads: {
      headline: `${brand}: Poptávka během 60 sekund`,
      subheadline: "Vyplňte krátký formulář a my se ozveme s konkrétním řešením.",
      ctaText: "Chci nabídku",
    },
    sale: {
      headline: `${brand}: Nabídka, která konvertuje`,
      subheadline: "Vyberte řešení připravené na okamžitou realizaci.",
      ctaText: "Nakoupit teď",
    },
    remarketing: {
      headline: `${brand}: Dokončete výběr ještě dnes`,
      subheadline: "Vraťte se k produktu, který jste si už vybrali.",
      ctaText: "Dokončit výběr",
    },
  }[goal];

  if (tone === "premium") {
    return [
      {
        headline: `${brand}: Prémiové řešení pro náročné`,
        subheadline: "Technická kvalita, rychlá dostupnost a servis bez kompromisů.",
        ctaText: "Vyžádat konzultaci",
      },
      {
        headline: `${brand}: Profesionální standard`,
        subheadline: "Stabilní výkon a spolehlivý partner pro každý projekt.",
        ctaText: "Zobrazit nabídku",
      },
      baseByGoal,
    ];
  }

  if (tone === "friendly") {
    return [
      {
        headline: `${brand}: Začněte jednoduše`,
        subheadline: "Vyberte si řešení, které dává smysl hned na první pohled.",
        ctaText: "Podívat se",
      },
      baseByGoal,
      {
        headline: `${brand}: Máte minutu?`,
        subheadline: "Ukážeme vám nejvhodnější variantu bez složitostí.",
        ctaText: "Chci doporučení",
      },
    ];
  }

  return [
    {
      headline: `${brand}: Vyšší výkon kampaně`,
      subheadline: "Optimalizované sdělení pro lepší CTR i více konverzí.",
      ctaText: "Spustit výkon",
    },
    baseByGoal,
    {
      headline: `${brand}: Rychleji k výsledkům`,
      subheadline: "Silná nabídka, jasná hodnota a okamžitá akce.",
      ctaText: "Aktivovat nabídku",
    },
  ];
}

export function encodeSharePayload(banner: Banner) {
  const safe = {
    ...banner,
    versions: [],
    checklist: undefined,
  };
  const json = JSON.stringify(safe);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function decodeSharePayload(value: string): Banner | null {
  try {
    const binary = atob(value);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as Banner;
  } catch {
    return null;
  }
}

export function normalizeImageUrl(value?: string) {
  if (!value) return "";
  let next = value.trim();
  if ((next.startsWith('"') && next.endsWith('"')) || (next.startsWith("'") && next.endsWith("'"))) {
    next = next.slice(1, -1).trim();
  }
  next = next.replace(/['"]+$/g, "").trim();
  return next;
}

export function toPreviewImageUrl(value?: string) {
  const normalized = normalizeImageUrl(value);
  if (!normalized) return "";
  if (
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:") ||
    normalized.startsWith("/api/ppc-banners/image-proxy")
  ) {
    return normalized;
  }
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
    return `/api/ppc-banners/image-proxy?url=${encodeURIComponent(normalized)}`;
  }
  return normalized;
}
