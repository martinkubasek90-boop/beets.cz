"use client";

import type { Banner, BannerFormat } from "@/components/ppc-banners/types";

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

  return (
    <div className="relative z-10 flex h-full items-center justify-center p-6">
      <div
        className="overflow-hidden rounded-xl border border-slate-200 shadow-xl"
        style={{
          width: `${Math.round(format.width * scale)}px`,
          height: `${Math.round(format.height * scale)}px`,
          backgroundColor: banner.bgColor,
          backgroundImage: banner.bgImageUrl ? `url(${banner.bgImageUrl})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div
          className="flex h-full w-full flex-col justify-between"
          style={{ padding, background: banner.bgImageUrl ? "linear-gradient(180deg, rgba(2,6,23,0.25), rgba(2,6,23,0.42))" : undefined }}
        >
          <div className="flex items-center gap-2">
            {banner.logoUrl ? (
              <img
                src={banner.logoUrl}
                alt="Logo"
                className="max-h-8 w-auto max-w-[130px] rounded object-contain"
              />
            ) : null}
            <div className="text-xs font-bold uppercase tracking-wide" style={{ color: banner.textColor }}>
              {banner.brandName || "Vaše značka"}
            </div>
          </div>
          <div>
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
          <div>
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
