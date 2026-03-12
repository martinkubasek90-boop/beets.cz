"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent } from "react";
import type { Banner, BannerFormat } from "@/components/ppc-banners/types";
import { toPreviewImageUrl } from "@/components/ppc-banners/banner-utils";

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
    shapeSize: number;
  };
};

const FALLBACK_FORMAT: BannerFormat = {
  id: "fallback",
  name: "Fallback",
  width: 1200,
  height: 628,
  layout: "horizontal",
  headlineSize: 72,
  subheadlineSize: 32,
  ctaSize: 28,
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
  padding: 56,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function applyStep(value: number, delta: number, min: number, max: number) {
  return clamp(Number((value + delta).toFixed(2)), min, max);
}

const LOGO_SCALE_MIN = 0.4;
const LOGO_SCALE_MAX = 12;

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
  const resolvedFormat = format ?? FALLBACK_FORMAT;

  const scale = Math.min(1, 760 / resolvedFormat.width, 560 / resolvedFormat.height);
  const padding = Math.max(8, Math.round(resolvedFormat.padding * scale));
  const headlineSize = Math.max(12, Math.round(resolvedFormat.headlineSize * scale));
  const subheadlineSize = Math.max(10, Math.round(resolvedFormat.subheadlineSize * scale));
  const ctaSize = Math.max(10, Math.round(resolvedFormat.ctaSize * scale));
  const logoScale = Math.max(LOGO_SCALE_MIN, Math.min(LOGO_SCALE_MAX, resolvedFormat.logoScale || 1));
  const logoOffsetX = Math.round((resolvedFormat.logoOffsetX || 0) * scale);
  const logoOffsetY = Math.round((resolvedFormat.logoOffsetY || 0) * scale);
  const textOffsetX = Math.round((resolvedFormat.textOffsetX || 0) * scale);
  const textOffsetY = Math.round((resolvedFormat.textOffsetY || 0) * scale);
  const ctaOffsetX = Math.round((resolvedFormat.ctaOffsetX || 0) * scale);
  const ctaOffsetY = Math.round((resolvedFormat.ctaOffsetY || 0) * scale);
  const bgPreviewUrl = toPreviewImageUrl(banner.bgImageUrl);
  const bgScale = clamp(typeof banner.bgScale === "number" ? banner.bgScale : 100, 10, 260);
  const bgPositionX = clamp(typeof banner.bgPositionX === "number" ? banner.bgPositionX : 50, 0, 100);
  const bgPositionY = clamp(typeof banner.bgPositionY === "number" ? banner.bgPositionY : 50, 0, 100);
  const boxW = Math.round(resolvedFormat.width * scale);
  const boxH = Math.round(resolvedFormat.height * scale);
  const shapeSizePx = Math.round(Math.min(boxW, boxH) * ((resolvedFormat.shapeSize || 24) / 100));
  const shapeLeft = Math.round(boxW * ((resolvedFormat.shapeX || 78) / 100) - shapeSizePx / 2);
  const shapeTop = Math.round(boxH * ((resolvedFormat.shapeY || 22) / 100) - shapeSizePx / 2);
  const sizeTarget = selected === "text" || selected === "logo" || selected === "shape" ? selected : null;
  const logoAlignX = resolvedFormat.logoAlignX || "left";
  const logoAlignY = resolvedFormat.logoAlignY || "top";
  const textAlignX = resolvedFormat.textAlignX || "left";
  const textAlignY = resolvedFormat.textAlignY || "center";
  const textContentAlign = resolvedFormat.textContentAlign || "left";
  const ctaAlignX = resolvedFormat.ctaAlignX || "left";
  const ctaAlignY = resolvedFormat.ctaAlignY || "bottom";
  const zLogo = typeof resolvedFormat.zLogo === "number" ? resolvedFormat.zLogo : 40;
  const zText = typeof resolvedFormat.zText === "number" ? resolvedFormat.zText : 30;
  const zCta = typeof resolvedFormat.zCta === "number" ? resolvedFormat.zCta : 50;
  const zShape = typeof resolvedFormat.zShape === "number" ? resolvedFormat.zShape : 10;

  const logoW = Math.round(130 * scale * logoScale);
  const logoH = Math.round(32 * scale * logoScale);
  const logoBaseX = logoAlignX === "left" ? padding : logoAlignX === "center" ? Math.round((boxW - logoW) / 2) : boxW - padding - logoW;
  const logoBaseY = logoAlignY === "top" ? padding : logoAlignY === "center" ? Math.round((boxH - logoH) / 2) : boxH - padding - logoH;
  const logoLeft = logoBaseX + logoOffsetX;
  const logoTop = logoBaseY + logoOffsetY;

  const textW = Math.max(120, boxW - padding * 2 - 10);
  const textBaseX = textAlignX === "left" ? padding : textAlignX === "center" ? Math.round((boxW - textW) / 2) : boxW - padding - textW;
  const textBaseY = textAlignY === "top" ? padding + Math.round(80 * scale) : textAlignY === "center" ? Math.round(boxH * 0.37) : boxH - padding - Math.round(140 * scale);
  const textLeft = textBaseX + textOffsetX;
  const textTop = textBaseY + textOffsetY;

  const estimatedCtaW = Math.round((banner.ctaText || "Zjistit více").length * ctaSize * 0.55 + 32);
  const estimatedCtaH = Math.round(ctaSize + 20);
  const ctaBaseX = ctaAlignX === "left" ? padding : ctaAlignX === "center" ? Math.round((boxW - estimatedCtaW) / 2) : boxW - padding - estimatedCtaW;
  const ctaBaseY = ctaAlignY === "top" ? padding : ctaAlignY === "center" ? Math.round((boxH - estimatedCtaH) / 2) : boxH - padding - estimatedCtaH;
  const ctaLeft = ctaBaseX + ctaOffsetX;
  const ctaTop = ctaBaseY + ctaOffsetY;
  const hasLogo = Boolean((banner.logoUrl || "").trim());
  const hasHeadline = Boolean((banner.headline || "").trim());
  const hasSubheadline = Boolean((banner.subheadline || "").trim());

  const patchSize = useCallback(
    (target: ResizeTarget, direction: 1 | -1) => {
      if (!editable || !onFormatPatch) return;
      if (target === "text") {
        const nextHeadline = applyStep(resolvedFormat.headlineSize || 56, direction * 4, 16, 180);
        const nextSubheadline = applyStep(resolvedFormat.subheadlineSize || 28, direction * 2, 12, 96);
        onFormatPatch({
          headlineSize: Math.round(nextHeadline),
          subheadlineSize: Math.round(nextSubheadline),
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
          onFormatPatch({
            headlineSize: Math.round(nextHeadline),
            subheadlineSize: Math.round(nextSubheadline),
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
        onFormatPatch({
          logoOffsetX: Math.round(state.origin.logoOffsetX + dx),
          logoOffsetY: Math.round(state.origin.logoOffsetY + dy),
        });
        return;
      }

      if (state.target === "text") {
        onFormatPatch({
          textOffsetX: Math.round(state.origin.textOffsetX + dx),
          textOffsetY: Math.round(state.origin.textOffsetY + dy),
        });
        return;
      }

      if (state.target === "cta") {
        onFormatPatch({
          ctaOffsetX: Math.round(state.origin.ctaOffsetX + dx),
          ctaOffsetY: Math.round(state.origin.ctaOffsetY + dy),
        });
        return;
      }

      if (state.target === "shape") {
        const nextShapeX = clamp(state.origin.shapeX + (dx / resolvedFormat.width) * 100, 0, 100);
        const nextShapeY = clamp(state.origin.shapeY + (dy / resolvedFormat.height) * 100, 0, 100);
        onFormatPatch({ shapeX: Math.round(nextShapeX), shapeY: Math.round(nextShapeY) });
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
  }, [editable, onFormatPatch, resolvedFormat.height, resolvedFormat.width, scale]);

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

  if (!format) return null;

  return (
    <div className="relative z-10 flex h-full items-center justify-center p-6">
      <div
        className="relative overflow-hidden rounded-xl border border-slate-200 shadow-xl"
        style={{
          width: `${boxW}px`,
          height: `${boxH}px`,
          backgroundColor: banner.bgColor,
          backgroundImage: bgPreviewUrl ? `url("${bgPreviewUrl}")` : undefined,
          backgroundSize: bgPreviewUrl ? `${bgScale}%` : "cover",
          backgroundPosition: `${bgPositionX}% ${bgPositionY}%`,
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
        <div
          className="relative h-full w-full"
          style={{ padding, background: bgPreviewUrl ? "linear-gradient(180deg, rgba(2,6,23,0.25), rgba(2,6,23,0.42))" : undefined }}
        >
          {editable ? <div className="absolute right-2 top-2 rounded bg-slate-900/70 px-2 py-1 text-[10px] text-white">Drag: logo / text / CTA / shape</div> : null}
          {editable && sizeTarget ? <div className="absolute left-2 top-2 z-20 rounded-md bg-slate-900/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">Resize: táhni rohový bod, nebo kolečko myši</div> : null}

          {hasLogo ? (
            <div
              className={`absolute flex items-center gap-2 ${editable ? "cursor-move" : ""} ${selected === "logo" ? "ring-2 ring-cyan-300" : ""} ${editable ? "relative" : ""}`}
              style={{ left: `${logoLeft}px`, top: `${logoTop}px`, zIndex: zLogo }}
              onMouseDown={(event) => startDrag("logo", event)}
              onWheel={(event) => onResizeWheel("logo", event)}
            >
              <img
                src={banner.logoUrl}
                alt="Logo"
                className="w-auto rounded object-contain"
                style={{
                  maxHeight: `${Math.round(32 * scale * logoScale)}px`,
                  maxWidth: `${Math.round(130 * scale * logoScale)}px`,
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

          {hasHeadline || hasSubheadline ? (
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
                <h2 className="font-extrabold leading-[1.05]" style={{ color: banner.textColor, fontSize: `${headlineSize}px` }}>
                  {banner.headline}
                </h2>
              ) : null}
              {hasSubheadline ? (
                <p className={`${hasHeadline ? "mt-2" : ""} font-medium`} style={{ color: banner.textColor, fontSize: `${subheadlineSize}px` }}>
                  {banner.subheadline}
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
