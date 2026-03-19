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
  contactSize?: number;
  ctaSize: number;
  ctaScale?: number;
  logoScale: number;
  qrScale?: number;
  textOffsetX: number;
  textOffsetY: number;
  headlineOffsetX?: number;
  headlineOffsetY?: number;
  subheadlineOffsetX?: number;
  subheadlineOffsetY?: number;
  subheadline2OffsetX?: number;
  subheadline2OffsetY?: number;
  contactOffsetX?: number;
  contactOffsetY?: number;
  logoOffsetX: number;
  logoOffsetY: number;
  qrOffsetX?: number;
  qrOffsetY?: number;
  ctaOffsetX: number;
  ctaOffsetY: number;
  shapeEnabled: boolean;
  shapeType: "circle" | "rect";
  shapeColor: string;
  shapeOpacity: number;
  shapeX: number;
  shapeY: number;
  shapeSize: number;
  borderWidth?: number;
  padding: number;
  logoAlignX?: "left" | "center" | "right";
  logoAlignY?: "top" | "center" | "bottom";
  textAlignX?: "left" | "center" | "right";
  textAlignY?: "top" | "center" | "bottom";
  textContentAlign?: "left" | "center" | "right";
  ctaAlignX?: "left" | "center" | "right";
  ctaAlignY?: "top" | "center" | "bottom";
  zLogo?: number;
  zQr?: number;
  zText?: number;
  zHeadline?: number;
  zSubheadline?: number;
  zSubheadline2?: number;
  zContact?: number;
  zCta?: number;
  zShape?: number;
  headline?: string;
  subheadline?: string;
  subheadline2?: string;
  contactText?: string;
  subheadline2Size?: number;
  ctaText?: string;
  bgImageUrl?: string;
  bgScale?: number;
  bgPositionX?: number;
  bgPositionY?: number;
  guideAreaEnabled?: boolean;
  guideAreaX?: number;
  guideAreaY?: number;
  guideAreaWidth?: number;
  guideAreaHeight?: number;
};

export type BannerSnapshot = {
  name: string;
  headline: string;
  subheadline: string;
  contactText?: string;
  ctaText: string;
  brandName: string;
  brandUrl: string;
  logoUrl?: string;
  qrTargetUrl?: string;
  qrTrackingEnabled?: boolean;
  qrUtmSource?: string;
  qrUtmMedium?: string;
  qrUtmCampaign?: string;
  qrUtmContent?: string;
  qrUtmTerm?: string;
  qrImageUrl?: string;
  overlayIcon?: string;
  logoTransparentBg?: boolean;
  bgMode: "none" | "upload" | "generate";
  bgColor: string;
  bgImageUrl?: string;
  bgPrompt?: string;
  gifFrames?: string[];
  gifFrameDelayMs?: number;
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
  contactText?: string;
  ctaText: string;
  brandName: string;
  brandUrl: string;
  logoUrl?: string;
  qrTargetUrl?: string;
  qrTrackingEnabled?: boolean;
  qrUtmSource?: string;
  qrUtmMedium?: string;
  qrUtmCampaign?: string;
  qrUtmContent?: string;
  qrUtmTerm?: string;
  qrImageUrl?: string;
  overlayIcon?: string;
  logoTransparentBg?: boolean;
  bgMode: "none" | "upload" | "generate";
  bgColor: string;
  bgImageUrl?: string;
  bgPrompt?: string;
  gifFrames?: string[];
  gifFrameDelayMs?: number;
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
  { id: "1200x628", name: "Meta 1200x628 (2x edit)", width: 2400, height: 1256, layout: "horizontal", headlineSize: 144, subheadlineSize: 68, ctaSize: 56, logoScale: 1, textOffsetX: 0, textOffsetY: 0, logoOffsetX: 0, logoOffsetY: 0, ctaOffsetX: 0, ctaOffsetY: 0, shapeEnabled: false, shapeType: "circle", shapeColor: "#06B6D4", shapeOpacity: 26, shapeX: 78, shapeY: 22, shapeSize: 24, padding: 128 },
  { id: "1080x1080", name: "Square 1080x1080 (2x edit)", width: 2160, height: 2160, layout: "square", headlineSize: 148, subheadlineSize: 68, ctaSize: 56, ctaScale: 1, logoScale: 1, textOffsetX: 0, textOffsetY: 0, logoOffsetX: 0, logoOffsetY: 0, ctaOffsetX: 0, ctaOffsetY: 0, shapeEnabled: false, shapeType: "circle", shapeColor: "#06B6D4", shapeOpacity: 26, shapeX: 78, shapeY: 22, shapeSize: 24, padding: 148 },
  { id: "1080x1920", name: "Story 1080x1920 (2x edit)", width: 2160, height: 3840, layout: "vertical", headlineSize: 184, subheadlineSize: 84, ctaSize: 64, ctaScale: 1, logoScale: 1, textOffsetX: 0, textOffsetY: 0, logoOffsetX: 0, logoOffsetY: 0, ctaOffsetX: 0, ctaOffsetY: 0, shapeEnabled: false, shapeType: "circle", shapeColor: "#06B6D4", shapeOpacity: 26, shapeX: 78, shapeY: 22, shapeSize: 24, padding: 172 },
  { id: "300x250", name: "Display 300x250 (2x edit)", width: 600, height: 500, layout: "horizontal", headlineSize: 56, subheadlineSize: 32, ctaSize: 28, ctaScale: 1, logoScale: 1, textOffsetX: 0, textOffsetY: 0, logoOffsetX: 0, logoOffsetY: 0, ctaOffsetX: 0, ctaOffsetY: 0, shapeEnabled: false, shapeType: "circle", shapeColor: "#06B6D4", shapeOpacity: 26, shapeX: 78, shapeY: 22, shapeSize: 24, padding: 40 },
  { id: "336x280", name: "Display 336x280 (2x edit)", width: 672, height: 560, layout: "horizontal", headlineSize: 60, subheadlineSize: 32, ctaSize: 28, ctaScale: 1, logoScale: 1, textOffsetX: 0, textOffsetY: 0, logoOffsetX: 0, logoOffsetY: 0, ctaOffsetX: 0, ctaOffsetY: 0, shapeEnabled: false, shapeType: "circle", shapeColor: "#06B6D4", shapeOpacity: 26, shapeX: 78, shapeY: 22, shapeSize: 24, padding: 44 },
  { id: "728x90", name: "Leaderboard 728x90 (2x edit)", width: 1456, height: 180, layout: "horizontal", headlineSize: 60, subheadlineSize: 32, ctaSize: 28, ctaScale: 1, logoScale: 1, textOffsetX: 0, textOffsetY: 0, logoOffsetX: 0, logoOffsetY: 0, ctaOffsetX: 0, ctaOffsetY: 0, shapeEnabled: false, shapeType: "circle", shapeColor: "#06B6D4", shapeOpacity: 26, shapeX: 78, shapeY: 22, shapeSize: 24, padding: 36 },
  { id: "300x600", name: "Half-page 300x600 (2x edit)", width: 600, height: 1200, layout: "vertical", headlineSize: 84, subheadlineSize: 44, ctaSize: 36, ctaScale: 1, logoScale: 1, textOffsetX: 0, textOffsetY: 0, logoOffsetX: 0, logoOffsetY: 0, ctaOffsetX: 0, ctaOffsetY: 0, shapeEnabled: false, shapeType: "circle", shapeColor: "#06B6D4", shapeOpacity: 26, shapeX: 78, shapeY: 22, shapeSize: 24, padding: 52 },
  { id: "160x600", name: "Skyscraper 160x600 (2x edit)", width: 320, height: 1200, layout: "vertical", headlineSize: 60, subheadlineSize: 32, ctaSize: 26, ctaScale: 1, logoScale: 1, textOffsetX: 0, textOffsetY: 0, logoOffsetX: 0, logoOffsetY: 0, ctaOffsetX: 0, ctaOffsetY: 0, shapeEnabled: false, shapeType: "circle", shapeColor: "#06B6D4", shapeOpacity: 26, shapeX: 78, shapeY: 22, shapeSize: 24, padding: 32 },
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
    ctaScale: 1,
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
