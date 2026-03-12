"use client";

import type { Banner, BannerFormat } from "@/components/ppc-banners/types";
import { toPreviewImageUrl } from "@/components/ppc-banners/banner-utils";

export function BannerCanvas({
  banner,
  format,
}: {
  banner: Banner;
  format?: BannerFormat;
}) {
  if (!format) return null;

  const scale = Math.min(1, 760 / format.width, 560 / format.height);
  const padding = Math.max(8, Math.round(format.padding * scale));
  const headlineSize = Math.max(12, Math.round(format.headlineSize * scale));
  const subheadlineSize = Math.max(10, Math.round(format.subheadlineSize * scale));
  const ctaSize = Math.max(10, Math.round(format.ctaSize * scale));
  const logoScale = Math.max(0.5, Math.min(2.4, format.logoScale || 1));
  const logoOffsetX = Math.round((format.logoOffsetX || 0) * scale);
  const logoOffsetY = Math.round((format.logoOffsetY || 0) * scale);
  const textOffsetX = Math.round((format.textOffsetX || 0) * scale);
  const textOffsetY = Math.round((format.textOffsetY || 0) * scale);
  const ctaOffsetX = Math.round((format.ctaOffsetX || 0) * scale);
  const ctaOffsetY = Math.round((format.ctaOffsetY || 0) * scale);
  const bgPreviewUrl = toPreviewImageUrl(banner.bgImageUrl);
  const boxW = Math.round(format.width * scale);
  const boxH = Math.round(format.height * scale);
  const shapeSizePx = Math.round(Math.min(boxW, boxH) * ((format.shapeSize || 24) / 100));
  const shapeLeft = Math.round(boxW * ((format.shapeX || 78) / 100) - shapeSizePx / 2);
  const shapeTop = Math.round(boxH * ((format.shapeY || 22) / 100) - shapeSizePx / 2);

  return (
    <div className="relative z-10 flex h-full items-center justify-center p-6">
      <div
        className="relative overflow-hidden rounded-xl border border-slate-200 shadow-xl"
        style={{
          width: `${boxW}px`,
          height: `${boxH}px`,
          backgroundColor: banner.bgColor,
          backgroundImage: bgPreviewUrl ? `url("${bgPreviewUrl}")` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {format.shapeEnabled ? (
          <div
            className="pointer-events-none absolute"
            style={{
              left: `${shapeLeft}px`,
              top: `${shapeTop}px`,
              width: `${shapeSizePx}px`,
              height: `${shapeSizePx}px`,
              backgroundColor: format.shapeColor || "#06B6D4",
              opacity: Math.max(0, Math.min(1, (format.shapeOpacity || 0) / 100)),
              borderRadius: format.shapeType === "rect" ? "14px" : "999px",
            }}
          />
        ) : null}
        <div
          className="relative h-full w-full"
          style={{ padding, background: bgPreviewUrl ? "linear-gradient(180deg, rgba(2,6,23,0.25), rgba(2,6,23,0.42))" : undefined }}
        >
          <div className="absolute flex items-center gap-2" style={{ left: `${padding + logoOffsetX}px`, top: `${padding + logoOffsetY}px` }}>
            {banner.logoUrl ? (
              <img
                src={banner.logoUrl}
                alt="Logo"
                className="w-auto rounded object-contain"
                style={{
                  maxHeight: `${Math.round(32 * scale * logoScale)}px`,
                  maxWidth: `${Math.round(130 * scale * logoScale)}px`,
                }}
              />
            ) : null}
            <div className="text-xs font-bold uppercase tracking-wide" style={{ color: banner.textColor }}>
              {banner.brandName || "Vaše značka"}
            </div>
          </div>
          <div
            className="absolute"
            style={{
              left: `${padding + textOffsetX}px`,
              top: `${Math.round(boxH * 0.37) + textOffsetY}px`,
              width: `${Math.max(120, boxW - padding * 2 - 10)}px`,
              transform: "translateY(-50%)",
            }}
          >
            <h2
              className="font-extrabold leading-[1.05]"
              style={{ color: banner.textColor, fontSize: `${headlineSize}px` }}
            >
              {banner.headline || "Silný headline pro PPC kampaň"}
            </h2>
            <p
              className="mt-2 font-medium"
              style={{ color: banner.textColor, fontSize: `${subheadlineSize}px` }}
            >
              {banner.subheadline || "Doplňte krátký benefit a důvod kliknout"}
            </p>
          </div>
          <div className="absolute" style={{ left: `${padding + ctaOffsetX}px`, bottom: `${padding - ctaOffsetY}px` }}>
            <button
              type="button"
              className="rounded-lg px-4 py-2 font-bold"
              style={{
                backgroundColor: banner.ctaBg,
                color: banner.ctaTextColor,
                fontSize: `${ctaSize}px`,
              }}
            >
              {banner.ctaText || "Zjistit více"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
