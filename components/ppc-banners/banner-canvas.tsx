"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent } from "react";
import type { Banner, BannerFormat } from "@/components/ppc-banners/types";
import { toPreviewImageUrl } from "@/components/ppc-banners/banner-utils";
import { clamp, computeBannerRenderModel } from "@/components/ppc-banners/render-model";

const BANNER_FONT_STACK = 'Inter, "Segoe UI", Arial, sans-serif';

type DragTarget = "logo" | "qr" | "headline" | "subheadline" | "subheadline2" | "contact" | "cta" | "shape" | "guideArea";
type ResizeTarget = "logo" | "qr" | "headline" | "subheadline" | "subheadline2" | "contact" | "shape" | "guideArea";

type DragState = {
  target: DragTarget;
  startX: number;
  startY: number;
    origin: {
    logoOffsetX: number;
    logoOffsetY: number;
    qrOffsetX: number;
    qrOffsetY: number;
    headlineOffsetX: number;
    headlineOffsetY: number;
    subheadlineOffsetX: number;
    subheadlineOffsetY: number;
    subheadline2OffsetX: number;
    subheadline2OffsetY: number;
    contactOffsetX: number;
    contactOffsetY: number;
    ctaOffsetX: number;
    ctaOffsetY: number;
      shapeX: number;
      shapeY: number;
      guideAreaX: number;
      guideAreaY: number;
    };
};

type ResizeState = {
  target: ResizeTarget;
  startX: number;
  startY: number;
  origin: {
    logoScale: number;
    qrScale: number;
    headlineSize: number;
    subheadlineSize: number;
    subheadline2Size: number;
    contactSize: number;
    shapeSize: number;
    guideAreaWidth: number;
    guideAreaHeight: number;
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
  contactSize: 52,
  ctaSize: 56,
  logoScale: 1,
  qrScale: 1,
  textOffsetX: 0,
  textOffsetY: 0,
  headlineOffsetX: 0,
  headlineOffsetY: 0,
  subheadlineOffsetX: 0,
  subheadlineOffsetY: 0,
  subheadline2OffsetX: 0,
  subheadline2OffsetY: 0,
  contactOffsetX: 0,
  contactOffsetY: 0,
  logoOffsetX: 0,
  logoOffsetY: 0,
  qrOffsetX: 0,
  qrOffsetY: 0,
  ctaOffsetX: 0,
  ctaOffsetY: 0,
  shapeEnabled: false,
  shapeType: "circle",
  shapeColor: "#06B6D4",
  shapeOpacity: 26,
  shapeX: 78,
  shapeY: 22,
  shapeSize: 24,
  guideAreaEnabled: false,
  guideAreaX: 4,
  guideAreaY: 4,
  guideAreaWidth: 36,
  guideAreaHeight: 92,
  logoAlignX: "left",
  logoAlignY: "top",
  textAlignX: "left",
  textAlignY: "center",
  textContentAlign: "left",
  ctaAlignX: "left",
  ctaAlignY: "bottom",
  zLogo: 40,
  zQr: 45,
  zText: 30,
  zHeadline: 30,
  zSubheadline: 31,
  zSubheadline2: 32,
  zContact: 33,
  zCta: 50,
  zShape: 10,
  padding: 112,
};

function applyStep(value: number, delta: number, min: number, max: number) {
  return clamp(Number((value + delta).toFixed(2)), min, max);
}

const LOGO_SCALE_MIN = 0.4;
const LOGO_SCALE_MAX = 18;
const QR_SCALE_MIN = 0.4;
const QR_SCALE_MAX = 6;
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
  const contactSize = model.contactSize;
  const ctaSize = model.ctaSize;
  const resolvedHeadline = model.resolvedHeadline;
  const resolvedSubheadline = model.resolvedSubheadline;
  const resolvedSubheadline2 = model.resolvedSubheadline2;
  const resolvedContactText = model.resolvedContactText;
  const resolvedCtaText = model.resolvedCtaText;
  const resolvedBgImageUrl = model.resolvedBgImageUrl;
  const bgPreviewUrl = toPreviewImageUrl(resolvedBgImageUrl);
  const bgScale = model.bgScale;
  const bgPositionX = model.bgPositionX;
  const bgPositionY = model.bgPositionY;
  const boxW = model.boxW;
  const boxH = model.boxH;
  const guideAreaEnabled = model.guideAreaEnabled;
  const guideAreaLeft = model.guideAreaLeft;
  const guideAreaTop = model.guideAreaTop;
  const guideAreaWidth = model.guideAreaWidth;
  const guideAreaHeight = model.guideAreaHeight;
  const shapeSizePx = Math.round(Math.min(boxW, boxH) * ((resolvedFormat.shapeSize || 24) / 100));
  const shapeLeft = Math.round(boxW * ((resolvedFormat.shapeX || 78) / 100) - shapeSizePx / 2);
  const shapeTop = Math.round(boxH * ((resolvedFormat.shapeY || 22) / 100) - shapeSizePx / 2);
  const sizeTarget =
    selected === "headline" || selected === "subheadline" || selected === "subheadline2" || selected === "contact" || selected === "logo" || selected === "qr" || selected === "shape"
      ? selected
      : null;
  const textContentAlign = resolvedFormat.textContentAlign || "left";
  const zLogo = typeof resolvedFormat.zLogo === "number" ? resolvedFormat.zLogo : 40;
  const zQr = typeof resolvedFormat.zQr === "number" ? resolvedFormat.zQr : 45;
  const zHeadline = typeof resolvedFormat.zHeadline === "number" ? resolvedFormat.zHeadline : 30;
  const zSubheadline = typeof resolvedFormat.zSubheadline === "number" ? resolvedFormat.zSubheadline : 31;
  const zSubheadline2 = typeof resolvedFormat.zSubheadline2 === "number" ? resolvedFormat.zSubheadline2 : 32;
  const zContact = typeof resolvedFormat.zContact === "number" ? resolvedFormat.zContact : 33;
  const zCta = typeof resolvedFormat.zCta === "number" ? resolvedFormat.zCta : 50;
  const zShape = typeof resolvedFormat.zShape === "number" ? resolvedFormat.zShape : 10;

  const logoW = model.logoW;
  const logoH = model.logoH;
  const logoLeft = model.logoLeft;
  const logoTop = model.logoTop;

  const textW = model.textW;
  const headlineLeft = model.headlineLeft;
  const headlineTop = model.headlineTop;
  const subheadlineLeft = model.subheadlineLeft;
  const subheadlineTop = model.subheadlineTop;
  const subheadline2Left = model.subheadline2Left;
  const subheadline2Top = model.subheadline2Top;
  const contactLeft = model.contactLeft;
  const contactTop = model.contactTop;

  const estimatedCtaW = model.ctaW;
  const estimatedCtaH = model.ctaH;
  const ctaLeft = model.ctaLeft;
  const ctaTop = model.ctaTop;
  const logoBaseLeft = logoLeft - Math.round((resolvedFormat.logoOffsetX || 0) * scale);
  const logoBaseTop = logoTop - Math.round((resolvedFormat.logoOffsetY || 0) * scale);
  const qrScale = clamp(resolvedFormat.qrScale || 1, QR_SCALE_MIN, QR_SCALE_MAX);
  const qrBaseFrameSize = Math.round(clamp(Math.min(resolvedFormat.width, resolvedFormat.height) * 0.19, 56, 220) * scale);
  const qrFrameSize = Math.round(qrBaseFrameSize * qrScale);
  const qrPadding = Math.max(6, Math.round(qrFrameSize * 0.08));
  const qrBaseLeft = boxW - padding - qrFrameSize;
  const qrBaseTop = boxH - padding - qrFrameSize;
  const qrLeft = qrBaseLeft + Math.round((resolvedFormat.qrOffsetX || 0) * scale);
  const qrTop = qrBaseTop + Math.round((resolvedFormat.qrOffsetY || 0) * scale);
  const headlineBaseLeft = headlineLeft - Math.round((resolvedFormat.headlineOffsetX || 0) * scale);
  const headlineBaseTop = headlineTop - Math.round((resolvedFormat.headlineOffsetY || 0) * scale);
  const subheadlineBaseLeft = subheadlineLeft - Math.round((resolvedFormat.subheadlineOffsetX || 0) * scale);
  const subheadlineBaseTop = subheadlineTop - Math.round((resolvedFormat.subheadlineOffsetY || 0) * scale);
  const subheadline2BaseLeft = subheadline2Left - Math.round((resolvedFormat.subheadline2OffsetX || 0) * scale);
  const subheadline2BaseTop = subheadline2Top - Math.round((resolvedFormat.subheadline2OffsetY || 0) * scale);
  const contactBaseLeft = contactLeft - Math.round((resolvedFormat.contactOffsetX || 0) * scale);
  const contactBaseTop = contactTop - Math.round((resolvedFormat.contactOffsetY || 0) * scale);
  const ctaBaseLeft = ctaLeft - Math.round((resolvedFormat.ctaOffsetX || 0) * scale);
  const ctaBaseTop = ctaTop - Math.round((resolvedFormat.ctaOffsetY || 0) * scale);
  const hasLogo = Boolean((banner.logoUrl || "").trim());
  const hasHeadline = Boolean((resolvedHeadline || "").trim());
  const hasSubheadline = Boolean((resolvedSubheadline || "").trim());
  const hasSubheadline2 = Boolean((resolvedSubheadline2 || "").trim());
  const hasContact = Boolean((resolvedContactText || "").trim());
  const hasLogoTransparent = Boolean(banner.logoTransparentBg);
  const logoRawPreviewSrc = banner.logoUrl ? toPreviewImageUrl(banner.logoUrl) : "";
  const qrPreviewSrc = banner.qrImageUrl ? toPreviewImageUrl(banner.qrImageUrl) : "";
  const hasQr = Boolean(qrPreviewSrc);
  const overlayIcon = (banner.overlayIcon || "").trim();
  const hasOverlayIcon = Boolean(overlayIcon);
  const iconFrameSize = Math.round(clamp(Math.min(boxW, boxH) * 0.13, 44, 160));
  const iconLeft = padding;
  const iconTop = padding;
  const iconFontSize = Math.round(iconFrameSize * 0.48);

  const patchSize = useCallback(
    (target: ResizeTarget, direction: 1 | -1) => {
      if (!editable || !onFormatPatch) return;
      if (target === "headline") return void onFormatPatch({ headlineSize: Math.round(applyStep(resolvedFormat.headlineSize || 56, direction * 4, 16, 270)) });
      if (target === "subheadline") return void onFormatPatch({ subheadlineSize: Math.round(applyStep(resolvedFormat.subheadlineSize || 28, direction * 2, 12, 144)) });
      if (target === "subheadline2") return void onFormatPatch({ subheadline2Size: Math.round(applyStep(resolvedFormat.subheadline2Size || resolvedFormat.subheadlineSize || 28, direction * 2, 12, 144)) });
      if (target === "contact") return void onFormatPatch({ contactSize: Math.round(applyStep(resolvedFormat.contactSize || resolvedFormat.subheadlineSize || 28, direction * 2, 12, 144)) });
      if (target === "logo") {
        onFormatPatch({
          logoScale: applyStep(resolvedFormat.logoScale || 1, direction * 0.1, LOGO_SCALE_MIN, LOGO_SCALE_MAX),
        });
        return;
      }
      if (target === "qr") {
        onFormatPatch({
          qrScale: applyStep(resolvedFormat.qrScale || 1, direction * 0.08, QR_SCALE_MIN, QR_SCALE_MAX),
        });
        return;
      }
      if (target === "guideArea") {
        onFormatPatch({
          guideAreaWidth: Math.round(applyStep(resolvedFormat.guideAreaWidth || 36, direction * 2, 5, 100 - (resolvedFormat.guideAreaX || 4))),
          guideAreaHeight: Math.round(applyStep(resolvedFormat.guideAreaHeight || 92, direction * 2, 5, 100 - (resolvedFormat.guideAreaY || 4))),
        });
        return;
      }
      onFormatPatch({
        shapeSize: Math.round(applyStep(resolvedFormat.shapeSize || 24, direction * 2, 4, 120)),
      });
    },
    [
      editable,
      onFormatPatch,
      resolvedFormat.headlineSize,
      resolvedFormat.logoScale,
      resolvedFormat.contactSize,
      resolvedFormat.guideAreaHeight,
      resolvedFormat.guideAreaWidth,
      resolvedFormat.guideAreaX,
      resolvedFormat.guideAreaY,
      resolvedFormat.qrScale,
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
          qrOffsetX: resolvedFormat.qrOffsetX || 0,
          qrOffsetY: resolvedFormat.qrOffsetY || 0,
          headlineOffsetX: resolvedFormat.headlineOffsetX || 0,
          headlineOffsetY: resolvedFormat.headlineOffsetY || 0,
          subheadlineOffsetX: resolvedFormat.subheadlineOffsetX || 0,
          subheadlineOffsetY: resolvedFormat.subheadlineOffsetY || 0,
          subheadline2OffsetX: resolvedFormat.subheadline2OffsetX || 0,
          subheadline2OffsetY: resolvedFormat.subheadline2OffsetY || 0,
          contactOffsetX: resolvedFormat.contactOffsetX || 0,
          contactOffsetY: resolvedFormat.contactOffsetY || 0,
          ctaOffsetX: resolvedFormat.ctaOffsetX || 0,
          ctaOffsetY: resolvedFormat.ctaOffsetY || 0,
          shapeX: resolvedFormat.shapeX || 78,
          shapeY: resolvedFormat.shapeY || 22,
          guideAreaX: resolvedFormat.guideAreaX || 4,
          guideAreaY: resolvedFormat.guideAreaY || 4,
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
        qrScale: resolvedFormat.qrScale || 1,
        headlineSize: resolvedFormat.headlineSize || 56,
        subheadlineSize: resolvedFormat.subheadlineSize || 28,
        subheadline2Size: resolvedFormat.subheadline2Size || resolvedFormat.subheadlineSize || 28,
        contactSize: resolvedFormat.contactSize || resolvedFormat.subheadlineSize || 28,
        shapeSize: resolvedFormat.shapeSize || 24,
        guideAreaWidth: resolvedFormat.guideAreaWidth || 36,
        guideAreaHeight: resolvedFormat.guideAreaHeight || 92,
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
        if (resizeState.target === "qr") {
          const nextQrScale = applyStep(resizeState.origin.qrScale, dragDelta / 120, QR_SCALE_MIN, QR_SCALE_MAX);
          onFormatPatch({ qrScale: nextQrScale });
          return;
        }
        if (resizeState.target === "headline") return void onFormatPatch({ headlineSize: Math.round(applyStep(resizeState.origin.headlineSize, dragDelta * 1.1, 16, 270)) });
        if (resizeState.target === "subheadline") return void onFormatPatch({ subheadlineSize: Math.round(applyStep(resizeState.origin.subheadlineSize, dragDelta * 0.55, 12, 144)) });
        if (resizeState.target === "subheadline2") return void onFormatPatch({ subheadline2Size: Math.round(applyStep(resizeState.origin.subheadline2Size, dragDelta * 0.55, 12, 144)) });
        if (resizeState.target === "contact") return void onFormatPatch({ contactSize: Math.round(applyStep(resizeState.origin.contactSize, dragDelta * 0.55, 12, 144)) });
        if (resizeState.target === "guideArea") {
          const nextWidth = clamp(resizeState.origin.guideAreaWidth + (dragDelta / resolvedFormat.width) * 100, 5, 100 - (resolvedFormat.guideAreaX || 4));
          const nextHeight = clamp(resizeState.origin.guideAreaHeight + (dragDelta / resolvedFormat.height) * 100, 5, 100 - (resolvedFormat.guideAreaY || 4));
          onFormatPatch({ guideAreaEnabled: true, guideAreaWidth: Math.round(nextWidth), guideAreaHeight: Math.round(nextHeight) });
          return;
        }
        const nextShapeSize = applyStep(resizeState.origin.shapeSize, dragDelta / 2.2, 4, 120);
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

      if (state.target === "qr") {
        let nextOffsetX = state.origin.qrOffsetX + dx;
        let nextOffsetY = state.origin.qrOffsetY + dy;
        const nextCenterX = qrBaseLeft + Math.round(nextOffsetX * scale) + qrFrameSize / 2;
        const nextCenterY = qrBaseTop + Math.round(nextOffsetY * scale) + qrFrameSize / 2;
        const centerDiffX = boxW / 2 - nextCenterX;
        const centerDiffY = boxH / 2 - nextCenterY;
        if (Math.abs(centerDiffX) <= CENTER_MAGNET_PX) nextOffsetX += centerDiffX / scale;
        if (Math.abs(centerDiffY) <= CENTER_MAGNET_PX) nextOffsetY += centerDiffY / scale;
        onFormatPatch({
          qrOffsetX: Math.round(nextOffsetX),
          qrOffsetY: Math.round(nextOffsetY),
        });
        return;
      }

      if (state.target === "headline" || state.target === "subheadline" || state.target === "subheadline2" || state.target === "contact") {
        const offsetKeyX =
          state.target === "headline"
            ? "headlineOffsetX"
            : state.target === "subheadline"
              ? "subheadlineOffsetX"
              : state.target === "subheadline2"
                ? "subheadline2OffsetX"
                : "contactOffsetX";
        const offsetKeyY =
          state.target === "headline"
            ? "headlineOffsetY"
            : state.target === "subheadline"
              ? "subheadlineOffsetY"
              : state.target === "subheadline2"
                ? "subheadline2OffsetY"
                : "contactOffsetY";
        const baseLeft =
          state.target === "headline"
            ? headlineBaseLeft
            : state.target === "subheadline"
              ? subheadlineBaseLeft
              : state.target === "subheadline2"
                ? subheadline2BaseLeft
                : contactBaseLeft;
        const baseTop =
          state.target === "headline"
            ? headlineBaseTop
            : state.target === "subheadline"
              ? subheadlineBaseTop
              : state.target === "subheadline2"
                ? subheadline2BaseTop
                : contactBaseTop;
        let nextOffsetX = state.origin[offsetKeyX] + dx;
        let nextOffsetY = state.origin[offsetKeyY] + dy;
        const nextCenterX = baseLeft + Math.round(nextOffsetX * scale) + textW / 2;
        const nextCenterY = baseTop + Math.round(nextOffsetY * scale);
        const centerDiffX = boxW / 2 - nextCenterX;
        const centerDiffY = boxH / 2 - nextCenterY;
        if (Math.abs(centerDiffX) <= CENTER_MAGNET_PX) nextOffsetX += centerDiffX / scale;
        if (Math.abs(centerDiffY) <= CENTER_MAGNET_PX) nextOffsetY += centerDiffY / scale;
        onFormatPatch({
          [offsetKeyX]: Math.round(nextOffsetX),
          [offsetKeyY]: Math.round(nextOffsetY),
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
        return;
      }

      if (state.target === "guideArea") {
        const currentWidth = resolvedFormat.guideAreaWidth || 36;
        const currentHeight = resolvedFormat.guideAreaHeight || 92;
        const nextGuideX = clamp(state.origin.guideAreaX + (dx / resolvedFormat.width) * 100, 0, 100 - currentWidth);
        const nextGuideY = clamp(state.origin.guideAreaY + (dy / resolvedFormat.height) * 100, 0, 100 - currentHeight);
        onFormatPatch({ guideAreaEnabled: true, guideAreaX: Math.round(nextGuideX), guideAreaY: Math.round(nextGuideY) });
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
    contactBaseLeft,
    contactBaseTop,
    editable,
    estimatedCtaH,
    estimatedCtaW,
    headlineBaseLeft,
    headlineBaseTop,
    logoBaseLeft,
    logoBaseTop,
    logoH,
    logoW,
    onFormatPatch,
    qrBaseLeft,
    qrBaseTop,
    qrFrameSize,
    resolvedFormat.height,
    resolvedFormat.guideAreaHeight,
    resolvedFormat.guideAreaWidth,
    resolvedFormat.guideAreaX,
    resolvedFormat.guideAreaY,
    resolvedFormat.width,
    scale,
    subheadline2BaseLeft,
    subheadline2BaseTop,
    subheadlineBaseLeft,
    subheadlineBaseTop,
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
      : selected === "qr"
        ? qrLeft + qrFrameSize / 2
      : selected === "headline"
        ? headlineLeft + textW / 2
      : selected === "subheadline"
        ? subheadlineLeft + textW / 2
      : selected === "subheadline2"
        ? subheadline2Left + textW / 2
      : selected === "contact"
        ? contactLeft + textW / 2
        : selected === "cta"
          ? ctaLeft + estimatedCtaW / 2
          : selected === "guideArea"
            ? guideAreaLeft + guideAreaWidth / 2
          : selected === "shape"
            ? shapeLeft + shapeSizePx / 2
            : null;
  const selectedCenterY =
    selected === "logo"
      ? logoTop + logoH / 2
      : selected === "qr"
        ? qrTop + qrFrameSize / 2
      : selected === "headline"
        ? headlineTop
      : selected === "subheadline"
        ? subheadlineTop
      : selected === "subheadline2"
        ? subheadline2Top
      : selected === "contact"
        ? contactTop
        : selected === "cta"
          ? ctaTop + estimatedCtaH / 2
          : selected === "guideArea"
            ? guideAreaTop + guideAreaHeight / 2
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
          {editable && guideAreaEnabled ? (
            <div
              className={`absolute border-2 border-dashed ${selected === "guideArea" ? "border-cyan-400 bg-cyan-200/10" : "border-cyan-300/80 bg-cyan-100/10"} cursor-move`}
              style={{
                left: `${guideAreaLeft}px`,
                top: `${guideAreaTop}px`,
                width: `${guideAreaWidth}px`,
                height: `${guideAreaHeight}px`,
                zIndex: 115,
              }}
              onMouseDown={(event) => startDrag("guideArea", event)}
              onWheel={(event) => onResizeWheel("guideArea", event)}
            >
              <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-cyan-300/80" />
              <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-cyan-300/80" />
              <div className="pointer-events-none absolute left-2 top-2 rounded bg-cyan-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                Oblast zarovnání
              </div>
              <button
                type="button"
                aria-label="Resize guide area"
                className="absolute -bottom-2 -right-2 h-4 w-4 cursor-se-resize rounded-full border border-white bg-cyan-500 shadow"
                onMouseDown={(event) => startResize("guideArea", event)}
              />
            </div>
          ) : null}

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
              className={`absolute overflow-hidden rounded-[10px] border border-white/70 bg-white/95 shadow-lg ${editable ? "cursor-move" : ""} ${selected === "qr" ? "ring-2 ring-cyan-300" : ""}`}
              onMouseDown={(event) => startDrag("qr", event)}
              onWheel={(event) => onResizeWheel("qr", event)}
              style={{
                left: `${qrLeft}px`,
                top: `${qrTop}px`,
                width: `${qrFrameSize}px`,
                height: `${qrFrameSize}px`,
                padding: `${qrPadding}px`,
                zIndex: zQr,
              }}
            >
              <img
                src={qrPreviewSrc}
                alt="QR"
                className="h-full w-full object-contain"
                style={{ imageRendering: "pixelated" }}
                draggable={false}
              />
              {editable && selected === "qr" ? (
                <button
                  type="button"
                  aria-label="Resize QR"
                  className="absolute -bottom-2 -right-2 h-4 w-4 cursor-se-resize rounded-full border border-white bg-cyan-500 shadow"
                  onMouseDown={(event) => startResize("qr", event)}
                />
              ) : null}
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
                zIndex: Math.max(zLogo, zCta, zHeadline, zSubheadline, zSubheadline2, zContact) + 4,
              }}
            >
              <span>{overlayIcon}</span>
            </div>
          ) : null}

          {hasHeadline ? (
            <div
              className={`absolute ${editable ? "cursor-move" : ""} ${selected === "headline" ? "ring-2 ring-cyan-300" : ""}`}
              style={{
                left: `${headlineLeft}px`,
                top: `${headlineTop}px`,
                width: `${textW}px`,
                textAlign: textContentAlign,
                zIndex: zHeadline,
              }}
              onMouseDown={(event) => startDrag("headline", event)}
              onWheel={(event) => onResizeWheel("headline", event)}
            >
              <h2
                className="font-extrabold whitespace-pre-wrap"
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
              {editable && selected === "headline" ? (
                <button
                  type="button"
                  aria-label="Resize headline"
                  className="absolute -bottom-2 -right-2 h-4 w-4 cursor-se-resize rounded-full border border-white bg-cyan-500 shadow"
                  onMouseDown={(event) => startResize("headline", event)}
                />
              ) : null}
            </div>
          ) : null}

          {hasSubheadline ? (
            <div
              className={`absolute ${editable ? "cursor-move" : ""} ${selected === "subheadline" ? "ring-2 ring-cyan-300" : ""}`}
              style={{ left: `${subheadlineLeft}px`, top: `${subheadlineTop}px`, width: `${textW}px`, textAlign: textContentAlign, zIndex: zSubheadline }}
              onMouseDown={(event) => startDrag("subheadline", event)}
              onWheel={(event) => onResizeWheel("subheadline", event)}
            >
              <p
                className="font-medium whitespace-pre-wrap"
                style={{ color: banner.textColor, fontSize: `${subheadlineSize}px`, lineHeight: "1.5", fontFamily: BANNER_FONT_STACK, margin: 0 }}
              >
                {resolvedSubheadline}
              </p>
              {editable && selected === "subheadline" ? (
                <button
                  type="button"
                  aria-label="Resize subheadline"
                  className="absolute -bottom-2 -right-2 h-4 w-4 cursor-se-resize rounded-full border border-white bg-cyan-500 shadow"
                  onMouseDown={(event) => startResize("subheadline", event)}
                />
              ) : null}
            </div>
          ) : null}

          {hasSubheadline2 ? (
            <div
              className={`absolute ${editable ? "cursor-move" : ""} ${selected === "subheadline2" ? "ring-2 ring-cyan-300" : ""}`}
              style={{ left: `${subheadline2Left}px`, top: `${subheadline2Top}px`, width: `${textW}px`, textAlign: textContentAlign, zIndex: zSubheadline2 }}
              onMouseDown={(event) => startDrag("subheadline2", event)}
              onWheel={(event) => onResizeWheel("subheadline2", event)}
            >
              <p
                className="font-medium whitespace-pre-wrap"
                style={{ color: banner.textColor, fontSize: `${subheadline2Size}px`, lineHeight: "1.5", fontFamily: BANNER_FONT_STACK, margin: 0 }}
              >
                {resolvedSubheadline2}
              </p>
              {editable && selected === "subheadline2" ? (
                <button
                  type="button"
                  aria-label="Resize subheadline2"
                  className="absolute -bottom-2 -right-2 h-4 w-4 cursor-se-resize rounded-full border border-white bg-cyan-500 shadow"
                  onMouseDown={(event) => startResize("subheadline2", event)}
                />
              ) : null}
            </div>
          ) : null}

          {hasContact ? (
            <div
              className={`absolute ${editable ? "cursor-move" : ""} ${selected === "contact" ? "ring-2 ring-cyan-300" : ""}`}
              style={{ left: `${contactLeft}px`, top: `${contactTop}px`, width: `${textW}px`, textAlign: textContentAlign, zIndex: zContact }}
              onMouseDown={(event) => startDrag("contact", event)}
              onWheel={(event) => onResizeWheel("contact", event)}
            >
              <p
                className="font-medium whitespace-pre-wrap"
                style={{ color: banner.textColor, fontSize: `${contactSize}px`, lineHeight: "1.4", fontFamily: BANNER_FONT_STACK, margin: 0 }}
              >
                {resolvedContactText}
              </p>
              {editable && selected === "contact" ? (
                <button
                  type="button"
                  aria-label="Resize contact"
                  className="absolute -bottom-2 -right-2 h-4 w-4 cursor-se-resize rounded-full border border-white bg-cyan-500 shadow"
                  onMouseDown={(event) => startResize("contact", event)}
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
