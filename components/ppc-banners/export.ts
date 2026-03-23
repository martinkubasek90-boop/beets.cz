"use client";

import type { Banner, BannerFormat } from "@/components/ppc-banners/types";
import { clamp, computeBannerRenderModel } from "@/components/ppc-banners/render-model";

const BANNER_FONT_STACK = 'Inter, "Segoe UI", Arial, sans-serif';
export type BannerExportMimeType = "image/png" | "image/jpeg";
export type BannerExportResult = {
  blob: Blob;
  width: number;
  height: number;
  mimeType: BannerExportMimeType;
  fileExtension: "png" | "jpg";
  targetBytesMet: boolean;
};

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function makeLogoTransparentForExport(src: string) {
  const img = await loadImage(src);
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

async function toDataUrlFromProxy(url: string) {
  const response = await fetch(`/api/ppc-banners/image-proxy?url=${encodeURIComponent(url)}`);
  if (!response.ok) throw new Error("Image proxy failed.");
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function resolveImageSource(input?: string) {
  if (!input) return null;
  if (input.startsWith("data:") || input.startsWith("blob:")) return input;
  try {
    return await toDataUrlFromProxy(input);
  } catch {
    return input;
  }
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const paragraphs = text.split(/\r?\n/);
  const lines: string[] = [];
  paragraphs.forEach((paragraph) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push("");
      return;
    }
    let current = words[0];
    for (let i = 1; i < words.length; i++) {
      const next = `${current} ${words[i]}`;
      if (ctx.measureText(next).width <= maxWidth) current = next;
      else {
        lines.push(current);
        current = words[i];
        if (lines.length >= maxLines - 1) break;
      }
    }
    if (lines.length < maxLines) lines.push(current);
  });
  return lines.slice(0, maxLines);
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: BannerExportMimeType, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Export blob se nepodařilo vytvořit."));
        return;
      }
      resolve(blob);
    }, mimeType, quality);
  });
}

function fitSize(width: number, height: number, maxWidth: number, maxHeight: number) {
  if (!width || !height || !maxWidth || !maxHeight) return { width: 0, height: 0 };
  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, width * ratio),
    height: Math.max(1, height * ratio),
  };
}

async function ensureFontsLoaded(headlineSize: number, subheadlineSize: number, ctaSize: number) {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  try {
    await Promise.all([
      document.fonts.load(`800 ${headlineSize}px ${BANNER_FONT_STACK}`),
      document.fonts.load(`500 ${subheadlineSize}px ${BANNER_FONT_STACK}`),
      document.fonts.load(`700 ${ctaSize}px ${BANNER_FONT_STACK}`),
    ]);
  } catch {}
}

async function renderBannerCanvas(banner: Banner, format: BannerFormat, outputScale = 1) {
  const viewW = format.width;
  const viewH = format.height;
  const safeOutputScale = clamp(outputScale, 0.1, 1);
  const targetW = Math.max(1, Math.round(viewW * safeOutputScale));
  const targetH = Math.max(1, Math.round(viewH * safeOutputScale));
  // Keep approx 2x sampling over target size, but avoid excessive 4x+ downscale blur for 50% exports.
  const renderScale = clamp(2 * safeOutputScale, 1, 2);

  const workCanvas = document.createElement("canvas");
  workCanvas.width = Math.max(1, Math.round(viewW * renderScale));
  workCanvas.height = Math.max(1, Math.round(viewH * renderScale));
  const ctx = workCanvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const model = computeBannerRenderModel(banner, format, 1);
  const resolvedHeadline = model.resolvedHeadline;
  const resolvedSubheadline = model.resolvedSubheadline;
  const resolvedSubheadline2 = model.resolvedSubheadline2;
  const resolvedContactText = model.resolvedContactText;
  const resolvedCtaText = model.resolvedCtaText;
  const resolvedBgImageUrl = model.resolvedBgImageUrl;
  const resolvedBgScale = model.bgScale;
  const resolvedBgPositionX = model.bgPositionX;
  const resolvedBgPositionY = model.bgPositionY;
  const resolvedSubheadline2Size = model.subheadline2Size;
  const resolvedContactSize = model.contactSize;
  const textContentAlign = format.textContentAlign || "left";
  await ensureFontsLoaded(format.headlineSize, format.subheadlineSize, format.ctaSize);

  ctx.fillStyle = resolvedBgImageUrl ? "#ffffff" : banner.bgColor || "#0f172a";
  ctx.fillRect(0, 0, viewW, viewH);

  const bgSrc = await resolveImageSource(resolvedBgImageUrl);
  if (bgSrc) {
    try {
      const bg = await loadImage(bgSrc);
      // Match preview exactly: CSS background-size: `${bgScale}%` (width-based), no-repeat.
      const scaleFactor = (typeof resolvedBgScale === "number" ? Math.max(10, Math.min(260, resolvedBgScale)) : 100) / 100;
      const drawW = viewW * scaleFactor;
      const drawH = drawW * (bg.height / bg.width);
      const posX = typeof resolvedBgPositionX === "number" ? Math.max(0, Math.min(100, resolvedBgPositionX)) : 50;
      const posY = typeof resolvedBgPositionY === "number" ? Math.max(0, Math.min(100, resolvedBgPositionY)) : 50;
      const x = (viewW - drawW) * (posX / 100);
      const y = (viewH - drawH) * (posY / 100);
      ctx.drawImage(bg, x, y, drawW, drawH);
    } catch {}
  }

  const borderWidth = Math.max(0, Math.round(format.borderWidth || 0));
  if (borderWidth > 0) {
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(borderWidth / 2, borderWidth / 2, viewW - borderWidth, viewH - borderWidth);
  }

  const qrScale = clamp(format.qrScale || 1, 0.4, 4);
  const qrBaseFrameSize = Math.round(clamp(Math.min(viewW, viewH) * 0.19, 56, 220));
  const qrFrameSize = Math.round(qrBaseFrameSize * qrScale);
  const qrPadding = Math.max(6, Math.round(qrFrameSize * 0.08));
  const qrImageSize = qrFrameSize - qrPadding * 2;
  const qrLeft = viewW - model.padding - qrFrameSize + Math.round(format.qrOffsetX || 0);
  const qrTop = viewH - model.padding - qrFrameSize + Math.round(format.qrOffsetY || 0);
  const overlayIcon = (banner.overlayIcon || "").trim();
  const hasOverlayIcon = Boolean(overlayIcon);
  const iconFrameSize = Math.round(clamp(Math.min(viewW, viewH) * 0.13, 44, 160));
  const iconLeft = model.padding;
  const iconTop = model.padding;
  const iconFontSize = Math.round(iconFrameSize * 0.48);

  if (format.shapeEnabled) {
    const minSide = Math.min(viewW, viewH);
    const shapeSize = Math.round(minSide * ((format.shapeSize || 24) / 100));
    const shapeX = Math.round(viewW * ((format.shapeX || 78) / 100) - shapeSize / 2);
    const shapeY = Math.round(viewH * ((format.shapeY || 22) / 100) - shapeSize / 2);
    ctx.globalAlpha = Math.max(0, Math.min(1, (format.shapeOpacity || 0) / 100));
    ctx.fillStyle = format.shapeColor || "#06B6D4";
    if (format.shapeType === "rect") {
      roundedRectPath(ctx, shapeX, shapeY, shapeSize, shapeSize, Math.round(shapeSize * 0.15));
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(shapeX + shapeSize / 2, shapeY + shapeSize / 2, shapeSize / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const logoBoxW = model.logoW;
  const logoBoxH = model.logoH;
  const logoSrcRaw = await resolveImageSource(banner.logoUrl);
  const logoSrc = banner.logoTransparentBg && logoSrcRaw ? await makeLogoTransparentForExport(logoSrcRaw) : logoSrcRaw;
  if (logoSrc) {
    try {
      const logo = await loadImage(logoSrc);
      // Match preview exactly: <img width/height + object-fit: contain + object-position: center.
      const fitted = fitSize(logo.width, logo.height, logoBoxW, logoBoxH);
      const drawW = Math.round(fitted.width);
      const drawH = Math.round(fitted.height);
      const drawX = Math.round(model.logoLeft + (logoBoxW - drawW) / 2);
      const drawY = Math.round(model.logoTop + (logoBoxH - drawH) / 2);
      ctx.drawImage(logo, drawX, drawY, drawW, drawH);
    } catch {}
  }

  const qrSrc = await resolveImageSource(banner.qrImageUrl);
  if (qrSrc) {
    try {
      const qr = await loadImage(qrSrc);
      ctx.fillStyle = "rgba(255,255,255,0.96)";
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(qrLeft, qrTop, qrFrameSize, qrFrameSize);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const fitted = fitSize(qr.width, qr.height, qrImageSize, qrImageSize);
      const drawW = Math.round(fitted.width);
      const drawH = Math.round(fitted.height);
      const drawX = Math.round(qrLeft + qrPadding + (qrImageSize - drawW) / 2);
      const drawY = Math.round(qrTop + qrPadding + (qrImageSize - drawH) / 2);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(qr, drawX, drawY, drawW, drawH);
      ctx.imageSmoothingEnabled = true;
    } catch {}
  }

  if (hasOverlayIcon) {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.strokeStyle = "rgba(255,255,255,0.6)";
    ctx.lineWidth = 2;
    roundedRectPath(ctx, iconLeft, iconTop, iconFrameSize, iconFrameSize, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = `800 ${iconFontSize}px ${BANNER_FONT_STACK}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(overlayIcon, Math.round(iconLeft + iconFrameSize / 2), Math.round(iconTop + iconFrameSize / 2));
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  const drawTextBlock = (text: string, size: number, weight: string, left: number, top: number, maxLines: number, lineHeight: number) => {
    if (!text.trim()) return;
    const textW = model.textW;
    const textX = textContentAlign === "left" ? left : textContentAlign === "center" ? left + textW / 2 : left + textW;
    ctx.textAlign = textContentAlign as CanvasTextAlign;
    ctx.fillStyle = banner.textColor || "#ffffff";
    ctx.textBaseline = "top";
    ctx.font = `${weight} ${size}px ${BANNER_FONT_STACK}`;
    const lines = wrapLines(ctx, text, textW, maxLines);
    let textY = top;
    lines.forEach((line) => {
      ctx.font = `${weight} ${size}px ${BANNER_FONT_STACK}`;
      ctx.fillText(line, Math.round(textX), Math.round(textY));
      textY += lineHeight;
    });
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  };

  drawTextBlock(resolvedHeadline || "", model.headlineSize, "800", model.headlineLeft, model.headlineTop, format.layout === "vertical" ? 8 : 6, model.headlineSize * 1.05);
  drawTextBlock(resolvedSubheadline || "", model.subheadlineSize, "500", model.subheadlineLeft, model.subheadlineTop, format.layout === "vertical" ? 12 : 10, model.subheadlineSize * 1.5);
  drawTextBlock(resolvedSubheadline2 || "", resolvedSubheadline2Size, "500", model.subheadline2Left, model.subheadline2Top, format.layout === "vertical" ? 12 : 10, resolvedSubheadline2Size * 1.5);
  drawTextBlock(resolvedContactText || "", resolvedContactSize, "500", model.contactLeft, model.contactTop, 8, resolvedContactSize * 1.4);

  const ctaText = resolvedCtaText || "Zjistit více";
  ctx.font = `700 ${model.ctaSize}px ${BANNER_FONT_STACK}`;
  const ctaW = model.ctaW;
  const ctaH = model.ctaH;
  const ctaX = model.ctaLeft;
  const ctaY = model.ctaTop;
  ctx.fillStyle = banner.ctaBg || "#facc15";
  ctx.fillRect(ctaX, ctaY, ctaW, ctaH);
  ctx.fillStyle = banner.ctaTextColor || "#111827";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(ctaText, Math.round(ctaX + ctaW / 2), Math.round(ctaY + ctaH / 2));

  if (targetW === viewW && targetH === viewH) {
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = targetW;
    outputCanvas.height = targetH;
    const outputCtx = outputCanvas.getContext("2d");
    if (!outputCtx) throw new Error("Output canvas is not available.");
    outputCtx.imageSmoothingEnabled = true;
    outputCtx.imageSmoothingQuality = "high";
    outputCtx.drawImage(workCanvas, 0, 0, targetW, targetH);
    return outputCanvas;
  }

  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = targetW;
  outputCanvas.height = targetH;
  const outputCtx = outputCanvas.getContext("2d");
  if (!outputCtx) throw new Error("Output canvas is not available.");
  outputCtx.imageSmoothingEnabled = true;
  outputCtx.imageSmoothingQuality = "high";
  outputCtx.drawImage(workCanvas, 0, 0, targetW, targetH);
  return outputCanvas;
}

export async function renderBannerPngDataUrl(banner: Banner, format: BannerFormat, outputScale = 1) {
  const outputCanvas = await renderBannerCanvas(banner, format, outputScale);
  return outputCanvas.toDataURL("image/png");
}

export function getExportFileName(bannerName: string, width: number, height: number, extension: "png" | "jpg" = "png") {
  const safeName = (bannerName || "banner").replace(/[^\w\-]+/g, "_");
  return `${safeName}_${width}x${height}.${extension}`;
}

export async function renderBannerBlob(
  banner: Banner,
  format: BannerFormat,
  options?: {
    outputScale?: number;
    mimeType?: BannerExportMimeType;
    maxFileSizeBytes?: number;
  },
): Promise<BannerExportResult> {
  const safeOutputScale = clamp(options?.outputScale ?? 1, 0.1, 1);
  const mimeType = options?.mimeType === "image/jpeg" ? "image/jpeg" : "image/png";
  const outputCanvas = await renderBannerCanvas(banner, format, safeOutputScale);
  const width = outputCanvas.width;
  const height = outputCanvas.height;
  const maxFileSizeBytes = typeof options?.maxFileSizeBytes === "number" && options.maxFileSizeBytes > 0 ? options.maxFileSizeBytes : undefined;
  const fileExtension = mimeType === "image/jpeg" ? "jpg" : "png";

  if (mimeType === "image/jpeg") {
    let bestBlob: Blob | null = null;
    let targetBytesMet = false;
    for (const quality of [0.92, 0.86, 0.8, 0.74, 0.68, 0.62, 0.56, 0.5, 0.44]) {
      const blob = await canvasToBlob(outputCanvas, mimeType, quality);
      if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;
      if (!maxFileSizeBytes || blob.size <= maxFileSizeBytes) {
        bestBlob = blob;
        targetBytesMet = true;
        break;
      }
    }
    return {
      blob: bestBlob || await canvasToBlob(outputCanvas, mimeType, 0.8),
      width,
      height,
      mimeType,
      fileExtension,
      targetBytesMet: maxFileSizeBytes ? targetBytesMet : true,
    };
  }

  const blob = await canvasToBlob(outputCanvas, mimeType);
  return {
    blob,
    width,
    height,
    mimeType,
    fileExtension,
    targetBytesMet: maxFileSizeBytes ? blob.size <= maxFileSizeBytes : true,
  };
}

export async function exportBannerPng(
  banner: Banner,
  format: BannerFormat,
  outputScale = 1,
  options?: { mimeType?: BannerExportMimeType; maxFileSizeBytes?: number },
) {
  const safeOutputScale = clamp(outputScale, 0.1, 1);
  const result = await renderBannerBlob(banner, format, {
    outputScale: safeOutputScale,
    mimeType: options?.mimeType,
    maxFileSizeBytes: options?.maxFileSizeBytes,
  });
  downloadBlob(result.blob, getExportFileName(banner.name || "banner", result.width, result.height, result.fileExtension));
  return result;
}

export async function exportBannerZip(
  banner: Banner,
  outputScale = 1,
  options?: { mimeType?: BannerExportMimeType; maxFileSizeBytes?: number },
) {
  const safeOutputScale = clamp(outputScale, 0.1, 1);
  const safeName = (banner.name || "banner").replace(/[^\w\-]+/g, "_");
  const renderedFiles = await Promise.all(
    (banner.formats || []).map(async (format) => renderBannerBlob(banner, format, {
      outputScale: safeOutputScale,
      mimeType: options?.mimeType,
      maxFileSizeBytes: options?.maxFileSizeBytes,
    })),
  );
  const files = await Promise.all(
    renderedFiles.map(async (result) => ({
      name: getExportFileName(safeName, result.width, result.height, result.fileExtension),
      dataUrl: await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = reject;
        reader.readAsDataURL(result.blob);
      }),
    })),
  );
  const response = await fetch("/api/ppc-banners/export-zip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: safeName, files }),
  });
  if (!response.ok) {
    throw new Error("ZIP export selhal.");
  }
  const blob = await response.blob();
  downloadBlob(blob, `${safeName}_all-formats.zip`);
  return renderedFiles;
}

export async function exportBannerGif(banner: Banner, format: BannerFormat) {
  const frames = Array.isArray(banner.gifFrames) ? banner.gifFrames.filter(Boolean) : [];
  if (frames.length < 2) {
    throw new Error("Pro GIF nahraj aspoň 2 obrázky.");
  }

  const safeDelayMs = clamp(typeof banner.gifFrameDelayMs === "number" ? banner.gifFrameDelayMs : 900, 200, 3000);
  const renderedFrames = await Promise.all(
    frames.map(async (frameImageUrl, index) => {
      const frameBanner: Banner = {
        ...banner,
        bgMode: "upload",
        bgImageUrl: frameImageUrl,
      };
      return {
        name: `frame-${String(index + 1).padStart(3, "0")}.png`,
        dataUrl: await renderBannerPngDataUrl(frameBanner, format, 1),
      };
    }),
  );

  const safeName = getExportFileName(banner.name || "banner", format.width, format.height).replace(/\.png$/i, "");
  const response = await fetch("/api/ppc-banners/export-gif", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: safeName,
      width: format.width,
      height: format.height,
      delayMs: safeDelayMs,
      files: renderedFrames,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error || "GIF export selhal.");
  }

  const blob = await response.blob();
  downloadBlob(blob, `${safeName}.gif`);
}
