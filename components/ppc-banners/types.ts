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
  padding: number;
};

export type BannerSnapshot = {
  name: string;
  headline: string;
  subheadline: string;
  ctaText: string;
  brandName: string;
  brandUrl: string;
  logoUrl?: string;
  bgMode: "none" | "upload" | "generate";
  bgColor: string;
  bgImageUrl?: string;
  bgPrompt?: string;
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
  bgMode: "none" | "upload" | "generate";
  bgColor: string;
  bgImageUrl?: string;
  bgPrompt?: string;
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
  { id: "1200x628", name: "Meta 1200x628", width: 1200, height: 628, layout: "horizontal", headlineSize: 72, subheadlineSize: 34, ctaSize: 28, padding: 64 },
  { id: "1080x1080", name: "Square 1080x1080", width: 1080, height: 1080, layout: "square", headlineSize: 74, subheadlineSize: 34, ctaSize: 28, padding: 74 },
  { id: "1080x1920", name: "Story 1080x1920", width: 1080, height: 1920, layout: "vertical", headlineSize: 92, subheadlineSize: 42, ctaSize: 32, padding: 86 },
  { id: "300x250", name: "Display 300x250", width: 300, height: 250, layout: "horizontal", headlineSize: 28, subheadlineSize: 16, ctaSize: 14, padding: 20 },
  { id: "336x280", name: "Display 336x280", width: 336, height: 280, layout: "horizontal", headlineSize: 30, subheadlineSize: 16, ctaSize: 14, padding: 22 },
  { id: "728x90", name: "Leaderboard 728x90", width: 728, height: 90, layout: "horizontal", headlineSize: 30, subheadlineSize: 16, ctaSize: 14, padding: 18 },
  { id: "300x600", name: "Half-page 300x600", width: 300, height: 600, layout: "vertical", headlineSize: 42, subheadlineSize: 22, ctaSize: 18, padding: 26 },
  { id: "160x600", name: "Skyscraper 160x600", width: 160, height: 600, layout: "vertical", headlineSize: 30, subheadlineSize: 16, ctaSize: 13, padding: 16 },
];
