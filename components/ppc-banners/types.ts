export type BannerLayout = "horizontal" | "vertical" | "square";
export type BannerGoal = "traffic" | "leads" | "sale" | "remarketing";
export type BannerStatus = "draft" | "ready";

export type BannerFormat = {
  id: string;
  name: string;
  width: number;
  height: number;
  layout: BannerLayout;
  headlineSize: number;
  subheadlineSize: number;
  ctaSize: number;
  logoScale: number;
  textOffsetX: number;
  textOffsetY: number;
  logoOffsetX: number;
  logoOffsetY: number;
  ctaOffsetX: number;
  ctaOffsetY: number;
  shapeEnabled: boolean;
  shapeType: "circle" | "rect";
  shapeColor: string;
  shapeOpacity: number;
  shapeX: number;
  shapeY: number;
  shapeSize: number;
  padding: number;
  logoAlignX?: "left" | "center" | "right";
  logoAlignY?: "top" | "center" | "bottom";
  textAlignX?: "left" | "center" | "right";
  textAlignY?: "top" | "center" | "bottom";
  textContentAlign?: "left" | "center" | "right";
  ctaAlignX?: "left" | "center" | "right";
  ctaAlignY?: "top" | "center" | "bottom";
  zLogo?: number;
  zText?: number;
  zCta?: number;
  zShape?: number;
  headline?: string;
  subheadline?: string;
  subheadline2?: string;
  subheadline2Size?: number;
  ctaText?: string;
  bgImageUrl?: string;
  bgScale?: number;
  bgPositionX?: number;
  bgPositionY?: number;
};

export type BannerSnapshot = {
  name: string;
  headline: string;
  subheadline: string;
  ctaText: string;
  brandName: string;
  brandUrl: string;
  logoUrl?: string;
  logoTransparentBg?: boolean;
  bgMode: "none" | "upload" | "generate";
  bgColor: string;
  bgImageUrl?: string;
  bgPrompt?: string;
  bgPositionX?: number;
  bgPositionY?: number;
  bgScale?: number;
  textColor: string;
  ctaBg: string;
  ctaTextColor: string;
  formats: BannerFormat[];
  activeFormatIndex: number;
  goal: BannerGoal;
  status: BannerStatus;
};

export type BannerVersion = {
  id: string;
  label: string;
  savedAt: string;
  snapshot: BannerSnapshot;
};

export type BannerChecklist = {
  hasBrandUrl: boolean;
  hasHeadline: boolean;
  hasSubheadline: boolean;
  hasLogo: boolean;
  hasBackground: boolean;
  hasMinFormats: boolean;
  contrastTextOk: boolean;
  contrastCtaOk: boolean;
};

export type BrandKit = {
  brandName: string;
  brandUrl: string;
  logoUrl?: string;
  bgColor: string;
  textColor: string;
  ctaBg: string;
  ctaTextColor: string;
  updatedAt: string;
};

export type Banner = {
  id: string;
  name: string;
  headline: string;
  subheadline: string;
  ctaText: string;
  brandName: string;
  brandUrl: string;
  logoUrl?: string;
  logoTransparentBg?: boolean;
  bgMode: "none" | "upload" | "generate";
  bgColor: string;
  bgImageUrl?: string;
  bgPrompt?: string;
  bgPositionX?: number;
  bgPositionY?: number;
  bgScale?: number;
  textColor: string;
  ctaBg: string;
  ctaTextColor: string;
  formats: BannerFormat[];
  activeFormatIndex: number;
  goal: BannerGoal;
  status: BannerStatus;
  checklist?: BannerChecklist;
  versions?: BannerVersion[];
  shareToken?: string;
  autosavedAt?: string;
  updatedAt: string;
  createdAt: string;
};

export const PRESET_FORMATS: BannerFormat[] = [
  { id: "1200x628", name: "Meta 1200x628", width: 1200, height: 628, layout: "horizontal", headlineSize: 72, subheadlineSize: 34, ctaSize: 28, logoScale: 1, textOffsetX: 0, textOffsetY: 0, logoOffsetX: 0, logoOffsetY: 0, ctaOffsetX: 0, ctaOffsetY: 0, shapeEnabled: false, shapeType: "circle", shapeColor: "#06B6D4", shapeOpacity: 26, shapeX: 78, shapeY: 22, shapeSize: 24, padding: 64 },
  { id: "1080x1080", name: "Square 1080x1080", width: 1080, height: 1080, layout: "square", headlineSize: 74, subheadlineSize: 34, ctaSize: 28, logoScale: 1, textOffsetX: 0, textOffsetY: 0, logoOffsetX: 0, logoOffsetY: 0, ctaOffsetX: 0, ctaOffsetY: 0, shapeEnabled: false, shapeType: "circle", shapeColor: "#06B6D4", shapeOpacity: 26, shapeX: 78, shapeY: 22, shapeSize: 24, padding: 74 },
  { id: "1080x1920", name: "Story 1080x1920", width: 1080, height: 1920, layout: "vertical", headlineSize: 92, subheadlineSize: 42, ctaSize: 32, logoScale: 1, textOffsetX: 0, textOffsetY: 0, logoOffsetX: 0, logoOffsetY: 0, ctaOffsetX: 0, ctaOffsetY: 0, shapeEnabled: false, shapeType: "circle", shapeColor: "#06B6D4", shapeOpacity: 26, shapeX: 78, shapeY: 22, shapeSize: 24, padding: 86 },
  { id: "300x250", name: "Display 300x250", width: 300, height: 250, layout: "horizontal", headlineSize: 28, subheadlineSize: 16, ctaSize: 14, logoScale: 1, textOffsetX: 0, textOffsetY: 0, logoOffsetX: 0, logoOffsetY: 0, ctaOffsetX: 0, ctaOffsetY: 0, shapeEnabled: false, shapeType: "circle", shapeColor: "#06B6D4", shapeOpacity: 26, shapeX: 78, shapeY: 22, shapeSize: 24, padding: 20 },
  { id: "336x280", name: "Display 336x280", width: 336, height: 280, layout: "horizontal", headlineSize: 30, subheadlineSize: 16, ctaSize: 14, logoScale: 1, textOffsetX: 0, textOffsetY: 0, logoOffsetX: 0, logoOffsetY: 0, ctaOffsetX: 0, ctaOffsetY: 0, shapeEnabled: false, shapeType: "circle", shapeColor: "#06B6D4", shapeOpacity: 26, shapeX: 78, shapeY: 22, shapeSize: 24, padding: 22 },
  { id: "728x90", name: "Leaderboard 728x90", width: 728, height: 90, layout: "horizontal", headlineSize: 30, subheadlineSize: 16, ctaSize: 14, logoScale: 1, textOffsetX: 0, textOffsetY: 0, logoOffsetX: 0, logoOffsetY: 0, ctaOffsetX: 0, ctaOffsetY: 0, shapeEnabled: false, shapeType: "circle", shapeColor: "#06B6D4", shapeOpacity: 26, shapeX: 78, shapeY: 22, shapeSize: 24, padding: 18 },
  { id: "300x600", name: "Half-page 300x600", width: 300, height: 600, layout: "vertical", headlineSize: 42, subheadlineSize: 22, ctaSize: 18, logoScale: 1, textOffsetX: 0, textOffsetY: 0, logoOffsetX: 0, logoOffsetY: 0, ctaOffsetX: 0, ctaOffsetY: 0, shapeEnabled: false, shapeType: "circle", shapeColor: "#06B6D4", shapeOpacity: 26, shapeX: 78, shapeY: 22, shapeSize: 24, padding: 26 },
  { id: "160x600", name: "Skyscraper 160x600", width: 160, height: 600, layout: "vertical", headlineSize: 30, subheadlineSize: 16, ctaSize: 13, logoScale: 1, textOffsetX: 0, textOffsetY: 0, logoOffsetX: 0, logoOffsetY: 0, ctaOffsetX: 0, ctaOffsetY: 0, shapeEnabled: false, shapeType: "circle", shapeColor: "#06B6D4", shapeOpacity: 26, shapeX: 78, shapeY: 22, shapeSize: 24, padding: 16 },
];

export function makeCustomFormat(width: number, height: number): BannerFormat {
  const w = Math.max(64, Math.round(width));
  const h = Math.max(64, Math.round(height));
  const ratio = h / w;
  const layout: BannerLayout = ratio > 1.2 ? "vertical" : ratio < 0.85 ? "horizontal" : "square";

  const base = PRESET_FORMATS[0];
  const scale = Math.max(0.35, Math.min(2.2, Math.min(w / base.width, h / base.height)));
  const headlineSize = Math.max(16, Math.round(base.headlineSize * scale));
  const subheadlineSize = Math.max(12, Math.round(base.subheadlineSize * scale));
  const ctaSize = Math.max(10, Math.round(base.ctaSize * scale));
  const padding = Math.max(12, Math.round(base.padding * scale));
  const stamp = Date.now().toString(36).slice(-5);

  return {
    ...base,
    id: `custom-${w}x${h}-${stamp}`,
    name: `Custom ${w}x${h}`,
    width: w,
    height: h,
    layout,
    headlineSize,
    subheadlineSize,
    subheadline2Size: subheadlineSize,
    ctaSize,
    padding,
    logoScale: 1,
    textOffsetX: 0,
    textOffsetY: 0,
    logoOffsetX: 0,
    logoOffsetY: 0,
    ctaOffsetX: 0,
    ctaOffsetY: 0,
    shapeEnabled: false,
  };
}
