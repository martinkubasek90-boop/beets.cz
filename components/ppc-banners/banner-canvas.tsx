"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent } from "react";
import type { Banner, BannerFormat } from "@/components/ppc-banners/types";
import { toPreviewImageUrl } from "@/components/ppc-banners/banner-utils";
import { clamp, computeBannerRenderModel } from "@/components/ppc-banners/render-model";

const BANNER_FONT_STACK = 'Inter, "Segoe UI", Arial, sans-serif';

type DragTarget = "logo" | "text" | "cta" | "shape";
type ResizeTarget = "logo" | "text" | "shape";

type DragState = {
  target: DragTarget;
  startX: number;
  startY: number;
  origin: {
    logoOffsetX: number;
    logoOffsetY: number;
    textOffsetX: number;
    textOffsetY: number;
    ctaOffsetX: number;
    ctaOffsetY: number;
    shapeX: number;
    shapeY: number;
  };
};

type ResizeState = {
  target: ResizeTarget;
  startX: number;
  startY: number;
  origin: {
    logoScale: number;
    headlineSize: number;
    subheadlineSize: number;
    subheadline2Size: number;
    shapeSize: number;
  };
};

const FALLBACK_FORMAT: BannerFormat = {
  id: "fallback",
  name: "Fallback",
  width: 2400,
  height: 1256,
  layout: "horizontal",
  headlineSize: 144,
  subheadlineSize: 64,
  ctaSize: 56,
  logoScale: 1,
  textOffsetX: 0,
  textOffsetY: 0,
  logoOffsetX: 0,
  logoOffsetY: 0,
  ctaOffsetX: 0,
  ctaOffsetY: 0,
  shapeEnabled: false,
  shapeType: "circle",
  shapeColor: "#06B6D4",
  shapeOpacity: 26,
  shapeX: 78,
  shapeY: 22,
  shapeSize: 24,
  logoAlignX: "left",
  logoAlignY: "top",
  textAlignX: "left",
  textAlignY: "center",
  textContentAlign: "left",
  ctaAlignX: "left",
  ctaAlignY: "bottom",
  zLogo: 40,
  zText: 30,
  zCta: 50,
  zShape: 10,
  padding: 112,
};

function applyStep(value: number, delta: number, min: number, max: number) {
  return clamp(Number((value + delta).toFixed(2)), min, max);
}

const LOGO_SCALE_MIN = 0.4;
const LOGO_SCALE_MAX = 12;
const CENTER_MAGNET_PX = 8;
const CENTER_GUIDE_EPS = 0.5;

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function makeLogoTransparent(src: string) {
  const img = await loadImageElement(src);
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = data.data;
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const avg = (r + g + b) / 3;
    if (avg > 238 && r > 228 && g > 228 && b > 228) {
      pixels[i + 3] = 0;
    }
  }
  ctx.putImageData(data, 0, 0);
  return canvas.toDataURL("image/png");
}

export function BannerCanvas({
  banner,
  format,
  editable = false,
  onFormatPatch,
}: {
  banner: Banner;
  format?: BannerFormat;
  editable?: boolean;
  onFormatPatch?: (changes: Partial<BannerFormat>) => void;
}) {
  const [selected, setSelected] = useState<DragTarget | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const [logoPreviewSrc, setLogoPreviewSrc] = useState<string>("");
  const resolvedFormat = format ?? FALLBACK_FORMAT;

  const scale = Math.min(1, 760 / resolvedFormat.width, 560 / resolvedFormat.height);
  const model = computeBannerRenderModel(banner, resolvedFormat, scale);
  const padding = model.padding;
  const headlineSize = model.headlineSize;
  const subheadlineSize = model.subheadlineSize;
  const subheadline2Size = model.subheadline2Size;
  const ctaSize = model.ctaSize;
  const resolvedHeadline = model.resolvedHeadline;
  const resolvedSubheadline = model.resolvedSubheadline;
  const resolvedSubheadline2 = model.resolvedSubheadline2;
  const resolvedCtaText = model.resolvedCtaText;
  const resolvedBgImageUrl = model.resolvedBgImageUrl;
  const bgPreviewUrl = toPreviewImageUrl(resolvedBgImageUrl);
  const bgScale = model.bgScale;
  const bgPositionX = model.bgPositionX;
  const bgPositionY = model.bgPositionY;
  const boxW = model.boxW;
  const boxH = model.boxH;
  const shapeSizePx = Math.round(Math.min(boxW, boxH) * ((resolvedFormat.shapeSize || 24) / 100));
  const shapeLeft = Math.round(boxW * ((resolvedFormat.shapeX || 78) / 100) - shapeSizePx / 2);
  const shapeTop = Math.round(boxH * ((resolvedFormat.shapeY || 22) / 100) - shapeSizePx / 2);
  const sizeTarget = selected === "text" || selected === "logo" || selected === "shape" ? selected : null;
  const textContentAlign = resolvedFormat.textContentAlign || "left";
  const zLogo = typeof resolvedFormat.zLogo === "number" ? resolvedFormat.zLogo : 40;
  const zText = typeof resolvedFormat.zText === "number" ? resolvedFormat.zText : 30;
  const zCta = typeof resolvedFormat.zCta === "number" ? resolvedFormat.zCta : 50;
  const zShape = typeof resolvedFormat.zShape === "number" ? resolvedFormat.zShape : 10;

  const logoW = model.logoW;
  const logoH = model.logoH;
  const logoLeft = model.logoLeft;
  const logoTop = model.logoTop;

  const textW = model.textW;
  const textLeft = model.textLeft;
  const textTop = model.textTop;
  const textGap = Math.max(2, Math.round(8 * scale));

  const estimatedCtaW = model.ctaW;
  const estimatedCtaH = model.ctaH;
  const ctaLeft = model.ctaLeft;
  const ctaTop = model.ctaTop;
  const logoBaseLeft = logoLeft - Math.round((resolvedFormat.logoOffsetX || 0) * scale);
  const logoBaseTop = logoTop - Math.round((resolvedFormat.logoOffsetY || 0) * scale);
  const textBaseLeft = textLeft - Math.round((resolvedFormat.textOffsetX || 0) * scale);
  const textBaseTop = textTop - Math.round((resolvedFormat.textOffsetY || 0) * scale);
  const ctaBaseLeft = ctaLeft - Math.round((resolvedFormat.ctaOffsetX || 0) * scale);
  const ctaBaseTop = ctaTop - Math.round((resolvedFormat.ctaOffsetY || 0) * scale);
  const hasLogo = Boolean((banner.logoUrl || "").trim());
  const hasHeadline = Boolean((resolvedHeadline || "").trim());
  const hasSubheadline = Boolean((resolvedSubheadline || "").trim());
  const hasSubheadline2 = Boolean((resolvedSubheadline2 || "").trim());
  const hasLogoTransparent = Boolean(banner.logoTransparentBg);
  const logoRawPreviewSrc = banner.logoUrl ? toPreviewImageUrl(banner.logoUrl) : "";
  const qrPreviewSrc = banner.qrImageUrl ? toPreviewImageUrl(banner.qrImageUrl) : "";
  const hasQr = Boolean(qrPreviewSrc);
  const qrFrameSize = Math.round(clamp(Math.min(boxW, boxH) * 0.19, 56, 220));
  const qrPadding = Math.max(6, Math.round(qrFrameSize * 0.08));
  const qrLeft = boxW - padding - qrFrameSize;
  const qrTop = boxH - padding - qrFrameSize;
  const overlayIcon = (banner.overlayIcon || "").trim();
  const hasOverlayIcon = Boolean(overlayIcon);
  const iconFrameSize = Math.round(clamp(Math.min(boxW, boxH) * 0.13, 44, 160));
  const iconLeft = padding;
  const iconTop = padding;
  const iconFontSize = Math.round(iconFrameSize * 0.48);

  const patchSize = useCallback(
    (target: ResizeTarget, direction: 1 | -1) => {
      if (!editable || !onFormatPatch) return;
      if (target === "text") {
        const nextHeadline = applyStep(resolvedFormat.headlineSize || 56, direction * 4, 16, 180);
        const nextSubheadline = applyStep(resolvedFormat.subheadlineSize || 28, direction * 2, 12, 96);
        const nextSubheadline2 = applyStep(resolvedFormat.subheadline2Size || resolvedFormat.subheadlineSize || 28, direction * 2, 12, 96);
        onFormatPatch({
          headlineSize: Math.round(nextHeadline),
          subheadlineSize: Math.round(nextSubheadline),
          subheadline2Size: Math.round(nextSubheadline2),
        });
        return;
      }
      if (target === "logo") {
        onFormatPatch({
          logoScale: applyStep(resolvedFormat.logoScale || 1, direction * 0.1, LOGO_SCALE_MIN, LOGO_SCALE_MAX),
        });
        return;
      }
      onFormatPatch({
        shapeSize: Math.round(applyStep(resolvedFormat.shapeSize || 24, direction * 2, 4, 80)),
      });
    },
    [
      editable,
      onFormatPatch,
      resolvedFormat.headlineSize,
      resolvedFormat.logoScale,
      resolvedFormat.shapeSize,
      resolvedFormat.subheadlineSize,
      resolvedFormat.subheadline2Size,
    ],
  );

  const startDrag = (target: DragTarget, event: ReactMouseEvent) => {
    if (!editable || !onFormatPatch) return;
    event.preventDefault();
    event.stopPropagation();
    setSelected(target);
    dragRef.current = {
      target,
      startX: event.clientX,
      startY: event.clientY,
      origin: {
        logoOffsetX: resolvedFormat.logoOffsetX || 0,
        logoOffsetY: resolvedFormat.logoOffsetY || 0,
        textOffsetX: resolvedFormat.textOffsetX || 0,
        textOffsetY: resolvedFormat.textOffsetY || 0,
        ctaOffsetX: resolvedFormat.ctaOffsetX || 0,
        ctaOffsetY: resolvedFormat.ctaOffsetY || 0,
        shapeX: resolvedFormat.shapeX || 78,
        shapeY: resolvedFormat.shapeY || 22,
      },
    };
  };

  const startResize = (target: ResizeTarget, event: ReactMouseEvent) => {
    if (!editable || !onFormatPatch) return;
    event.preventDefault();
    event.stopPropagation();
    setSelected(target);
    resizeRef.current = {
      target,
      startX: event.clientX,
      startY: event.clientY,
      origin: {
        logoScale: resolvedFormat.logoScale || 1,
        headlineSize: resolvedFormat.headlineSize || 56,
        subheadlineSize: resolvedFormat.subheadlineSize || 28,
        subheadline2Size: resolvedFormat.subheadline2Size || resolvedFormat.subheadlineSize || 28,
        shapeSize: resolvedFormat.shapeSize || 24,
      },
    };
  };

  const onResizeWheel = (target: ResizeTarget, event: ReactWheelEvent) => {
    if (!editable || !onFormatPatch) return;
    event.preventDefault();
    event.stopPropagation();
    const direction: 1 | -1 = event.nativeEvent.deltaY < 0 ? 1 : -1;
    setSelected(target);
    patchSize(target, direction);
  };

  useEffect(() => {
    if (!editable || !onFormatPatch) return;

    const onMouseMove = (event: MouseEvent) => {
      const resizeState = resizeRef.current;
      if (resizeState) {
        const dragDelta = (event.clientX - resizeState.startX + (event.clientY - resizeState.startY)) / (2 * scale);
        if (resizeState.target === "logo") {
          const nextLogoScale = applyStep(resizeState.origin.logoScale, dragDelta / 120, LOGO_SCALE_MIN, LOGO_SCALE_MAX);
          onFormatPatch({ logoScale: nextLogoScale });
          return;
        }
        if (resizeState.target === "text") {
          const nextHeadline = applyStep(resizeState.origin.headlineSize, dragDelta * 1.1, 16, 180);
          const nextSubheadline = applyStep(resizeState.origin.subheadlineSize, dragDelta * 0.55, 12, 96);
          const nextSubheadline2 = applyStep(resizeState.origin.subheadline2Size, dragDelta * 0.55, 12, 96);
          onFormatPatch({
            headlineSize: Math.round(nextHeadline),
            subheadlineSize: Math.round(nextSubheadline),
            subheadline2Size: Math.round(nextSubheadline2),
          });
          return;
        }
        const nextShapeSize = applyStep(resizeState.origin.shapeSize, dragDelta / 2.2, 4, 80);
        onFormatPatch({ shapeSize: Math.round(nextShapeSize) });
        return;
      }

      const state = dragRef.current;
      if (!state) return;
      const dx = (event.clientX - state.startX) / scale;
      const dy = (event.clientY - state.startY) / scale;

      if (state.target === "logo") {
        let nextOffsetX = state.origin.logoOffsetX + dx;
        let nextOffsetY = state.origin.logoOffsetY + dy;
        const nextCenterX = logoBaseLeft + Math.round(nextOffsetX * scale) + logoW / 2;
        const nextCenterY = logoBaseTop + Math.round(nextOffsetY * scale) + logoH / 2;
        const centerDiffX = boxW / 2 - nextCenterX;
        const centerDiffY = boxH / 2 - nextCenterY;
        if (Math.abs(centerDiffX) <= CENTER_MAGNET_PX) nextOffsetX += centerDiffX / scale;
        if (Math.abs(centerDiffY) <= CENTER_MAGNET_PX) nextOffsetY += centerDiffY / scale;
        onFormatPatch({
          logoOffsetX: Math.round(nextOffsetX),
          logoOffsetY: Math.round(nextOffsetY),
        });
        return;
      }

      if (state.target === "text") {
        let nextOffsetX = state.origin.textOffsetX + dx;
        let nextOffsetY = state.origin.textOffsetY + dy;
        const nextCenterX = textBaseLeft + Math.round(nextOffsetX * scale) + textW / 2;
        const nextCenterY = textBaseTop + Math.round(nextOffsetY * scale);
        const centerDiffX = boxW / 2 - nextCenterX;
        const centerDiffY = boxH / 2 - nextCenterY;
        if (Math.abs(centerDiffX) <= CENTER_MAGNET_PX) nextOffsetX += centerDiffX / scale;
        if (Math.abs(centerDiffY) <= CENTER_MAGNET_PX) nextOffsetY += centerDiffY / scale;
        onFormatPatch({
          textOffsetX: Math.round(nextOffsetX),
          textOffsetY: Math.round(nextOffsetY),
        });
        return;
      }

      if (state.target === "cta") {
        let nextOffsetX = state.origin.ctaOffsetX + dx;
        let nextOffsetY = state.origin.ctaOffsetY + dy;
        const nextCenterX = ctaBaseLeft + Math.round(nextOffsetX * scale) + estimatedCtaW / 2;
        const nextCenterY = ctaBaseTop + Math.round(nextOffsetY * scale) + estimatedCtaH / 2;
        const centerDiffX = boxW / 2 - nextCenterX;
        const centerDiffY = boxH / 2 - nextCenterY;
        if (Math.abs(centerDiffX) <= CENTER_MAGNET_PX) nextOffsetX += centerDiffX / scale;
        if (Math.abs(centerDiffY) <= CENTER_MAGNET_PX) nextOffsetY += centerDiffY / scale;
        onFormatPatch({
          ctaOffsetX: Math.round(nextOffsetX),
          ctaOffsetY: Math.round(nextOffsetY),
        });
        return;
      }

      if (state.target === "shape") {
        const nextShapeX = clamp(state.origin.shapeX + (dx / resolvedFormat.width) * 100, 0, 100);
        const nextShapeY = clamp(state.origin.shapeY + (dy / resolvedFormat.height) * 100, 0, 100);
        const centerPxX = boxW * (nextShapeX / 100);
        const centerPxY = boxH * (nextShapeY / 100);
        const snapX = Math.abs(centerPxX - boxW / 2) <= CENTER_MAGNET_PX ? 50 : nextShapeX;
        const snapY = Math.abs(centerPxY - boxH / 2) <= CENTER_MAGNET_PX ? 50 : nextShapeY;
        onFormatPatch({ shapeX: Math.round(snapX), shapeY: Math.round(snapY) });
      }
    };

    const onMouseUp = () => {
      dragRef.current = null;
      resizeRef.current = null;
      setSelected(null);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [
    boxH,
    boxW,
    ctaBaseLeft,
    ctaBaseTop,
    editable,
    estimatedCtaH,
    estimatedCtaW,
    logoBaseLeft,
    logoBaseTop,
    logoH,
    logoW,
    onFormatPatch,
    resolvedFormat.height,
    resolvedFormat.width,
    scale,
    textBaseLeft,
    textBaseTop,
    textW,
  ]);

  useEffect(() => {
    if (!editable || !sizeTarget) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement | null)?.tagName === "INPUT") return;
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        patchSize(sizeTarget, 1);
      }
      if (event.key === "-") {
        event.preventDefault();
        patchSize(sizeTarget, -1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editable, patchSize, sizeTarget]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!hasLogo || !logoRawPreviewSrc) {
        if (!cancelled) setLogoPreviewSrc("");
        return;
      }
      if (!hasLogoTransparent) {
        if (!cancelled) setLogoPreviewSrc(logoRawPreviewSrc);
        return;
      }
      try {
        const transparent = await makeLogoTransparent(logoRawPreviewSrc);
        if (!cancelled) setLogoPreviewSrc(transparent);
      } catch {
        if (!cancelled) setLogoPreviewSrc(logoRawPreviewSrc);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [hasLogo, hasLogoTransparent, logoRawPreviewSrc]);

  const selectedCenterX =
    selected === "logo"
      ? logoLeft + logoW / 2
      : selected === "text"
        ? textLeft + textW / 2
        : selected === "cta"
          ? ctaLeft + estimatedCtaW / 2
          : selected === "shape"
            ? shapeLeft + shapeSizePx / 2
            : null;
  const selectedCenterY =
    selected === "logo"
      ? logoTop + logoH / 2
      : selected === "text"
        ? textTop
        : selected === "cta"
          ? ctaTop + estimatedCtaH / 2
          : selected === "shape"
            ? shapeTop + shapeSizePx / 2
            : null;
  const showCenterX = selectedCenterX !== null && Math.abs(selectedCenterX - boxW / 2) <= CENTER_GUIDE_EPS;
  const showCenterY = selectedCenterY !== null && Math.abs(selectedCenterY - boxH / 2) <= CENTER_GUIDE_EPS;

  if (!format) return null;

  return (
    <div className="relative z-10 flex h-full items-center justify-center p-6">
      <div
        className="relative overflow-hidden rounded-xl border border-slate-200 shadow-xl"
        style={{
          width: `${boxW}px`,
          height: `${boxH}px`,
          backgroundColor: bgPreviewUrl ? "#ffffff" : banner.bgColor,
          backgroundImage: bgPreviewUrl ? `url("${bgPreviewUrl}")` : undefined,
          backgroundSize: bgPreviewUrl ? `${bgScale}%` : "cover",
          backgroundPosition: `${bgPositionX}% ${bgPositionY}%`,
          backgroundRepeat: "no-repeat",
        }}
      >
        {resolvedFormat.shapeEnabled ? (
          <div
            className={`absolute ${editable ? "cursor-move" : "pointer-events-none"} ${selected === "shape" ? "ring-2 ring-cyan-300" : ""}`}
            onMouseDown={(event) => startDrag("shape", event)}
            onWheel={(event) => onResizeWheel("shape", event)}
            style={{
              zIndex: zShape,
              left: `${shapeLeft}px`,
              top: `${shapeTop}px`,
              width: `${shapeSizePx}px`,
              height: `${shapeSizePx}px`,
              backgroundColor: resolvedFormat.shapeColor || "#06B6D4",
              opacity: Math.max(0, Math.min(1, (resolvedFormat.shapeOpacity || 0) / 100)),
              borderRadius: resolvedFormat.shapeType === "rect" ? "14px" : "999px",
            }}
          >
            {editable && selected === "shape" ? (
              <button
                type="button"
                aria-label="Resize shape"
                className="absolute -bottom-2 -right-2 h-4 w-4 cursor-se-resize rounded-full border border-white bg-cyan-500 shadow"
                onMouseDown={(event) => startResize("shape", event)}
              />
            ) : null}
          </div>
        ) : null}
        <div className="relative h-full w-full">
          {editable && showCenterX ? <div className="pointer-events-none absolute inset-y-0 left-1/2 z-[120] w-px -translate-x-1/2 bg-cyan-300/90" /> : null}
          {editable && showCenterY ? <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[120] h-px -translate-y-1/2 bg-cyan-300/90" /> : null}

          {hasLogo ? (
            <div
              className={`absolute flex items-center gap-2 ${editable ? "cursor-move" : ""} ${selected === "logo" ? "ring-2 ring-cyan-300" : ""} ${editable ? "relative" : ""}`}
              style={{ left: `${logoLeft}px`, top: `${logoTop}px`, zIndex: zLogo }}
              onMouseDown={(event) => startDrag("logo", event)}
              onWheel={(event) => onResizeWheel("logo", event)}
            >
              <img
                src={logoPreviewSrc || banner.logoUrl}
                alt="Logo"
                className="object-contain object-center"
                style={{
                  width: `${logoW}px`,
                  height: `${logoH}px`,
                  display: "block",
                }}
              />
              {editable && selected === "logo" ? (
                <button
                  type="button"
                  aria-label="Resize logo"
                  className="absolute -bottom-2 -right-2 h-4 w-4 cursor-se-resize rounded-full border border-white bg-cyan-500 shadow"
                  onMouseDown={(event) => startResize("logo", event)}
                />
              ) : null}
            </div>
          ) : null}

          {hasQr ? (
            <div
              className="absolute overflow-hidden rounded-[10px] border border-white/70 bg-white/95 shadow-lg"
              style={{
                left: `${qrLeft}px`,
                top: `${qrTop}px`,
                width: `${qrFrameSize}px`,
                height: `${qrFrameSize}px`,
                padding: `${qrPadding}px`,
                zIndex: Math.max(zLogo, zCta, zText) + 5,
              }}
            >
              <img
                src={qrPreviewSrc}
                alt="QR"
                className="h-full w-full object-contain"
                draggable={false}
              />
            </div>
          ) : null}

          {hasOverlayIcon ? (
            <div
              className="absolute flex items-center justify-center rounded-[14px] border border-white/60 bg-black/45 text-white shadow-lg backdrop-blur-sm"
              style={{
                left: `${iconLeft}px`,
                top: `${iconTop}px`,
                width: `${iconFrameSize}px`,
                height: `${iconFrameSize}px`,
                fontSize: `${iconFontSize}px`,
                lineHeight: "1",
                fontFamily: BANNER_FONT_STACK,
                zIndex: Math.max(zLogo, zCta, zText) + 4,
              }}
            >
              <span>{overlayIcon}</span>
            </div>
          ) : null}

          {hasHeadline || hasSubheadline || hasSubheadline2 ? (
            <div
              className={`absolute ${editable ? "cursor-move" : ""} ${selected === "text" ? "ring-2 ring-cyan-300" : ""}`}
              style={{
                left: `${textLeft}px`,
                top: `${textTop}px`,
                width: `${textW}px`,
                transform: "translateY(-50%)",
                textAlign: textContentAlign,
                zIndex: zText,
              }}
              onMouseDown={(event) => startDrag("text", event)}
              onWheel={(event) => onResizeWheel("text", event)}
            >
              {hasHeadline ? (
                <h2
                  className="font-extrabold"
                  style={{
                    color: banner.textColor,
                    fontSize: `${headlineSize}px`,
                    lineHeight: "1.05",
                    fontFamily: BANNER_FONT_STACK,
                    margin: 0,
                  }}
                >
                  {resolvedHeadline}
                </h2>
              ) : null}
              {hasSubheadline ? (
                <p
                  className="font-medium"
                  style={{
                    marginTop: hasHeadline ? `${textGap}px` : undefined,
                    color: banner.textColor,
                    fontSize: `${subheadlineSize}px`,
                    lineHeight: "1.5",
                    fontFamily: BANNER_FONT_STACK,
                    margin: 0,
                  }}
                >
                  {resolvedSubheadline}
                </p>
              ) : null}
              {hasSubheadline2 ? (
                <p
                  className="font-medium"
                  style={{
                    marginTop: hasHeadline || hasSubheadline ? `${textGap}px` : undefined,
                    color: banner.textColor,
                    fontSize: `${subheadline2Size}px`,
                    lineHeight: "1.5",
                    fontFamily: BANNER_FONT_STACK,
                    margin: 0,
                  }}
                >
                  {resolvedSubheadline2}
                </p>
              ) : null}
              {editable && selected === "text" ? (
                <button
                  type="button"
                  aria-label="Resize text"
                  className="absolute -bottom-2 -right-2 h-4 w-4 cursor-se-resize rounded-full border border-white bg-cyan-500 shadow"
                  onMouseDown={(event) => startResize("text", event)}
                />
              ) : null}
            </div>
          ) : null}

          <div
            className={`absolute ${editable ? "cursor-move" : ""} ${selected === "cta" ? "ring-2 ring-cyan-300" : ""}`}
            style={{ left: `${ctaLeft}px`, top: `${ctaTop}px`, zIndex: zCta }}
            onMouseDown={(event) => startDrag("cta", event)}
          >
            <button
              type="button"
              className="inline-flex items-center justify-center font-bold"
              style={{
                backgroundColor: banner.ctaBg,
                color: banner.ctaTextColor,
                fontSize: `${ctaSize}px`,
                width: `${estimatedCtaW}px`,
                height: `${estimatedCtaH}px`,
                border: 0,
                borderRadius: 0,
                padding: 0,
                margin: 0,
                lineHeight: "1",
                fontFamily: BANNER_FONT_STACK,
                appearance: "none",
                WebkitAppearance: "none",
              }}
            >
              {resolvedCtaText || "Zjistit více"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
