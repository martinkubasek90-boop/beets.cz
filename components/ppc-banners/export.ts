"use client";

import type { Banner, BannerFormat } from "@/components/ppc-banners/types";
import { clamp, computeBannerRenderModel } from "@/components/ppc-banners/render-model";

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
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
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
      document.fonts.load(`800 ${headlineSize}px "Space Grotesk"`),
      document.fonts.load(`500 ${subheadlineSize}px "Space Grotesk"`),
      document.fonts.load(`700 ${ctaSize}px "Space Grotesk"`),
    ]);
  } catch {}
}

export async function renderBannerPngDataUrl(banner: Banner, format: BannerFormat) {
  const pixelScale = 2;
  const viewW = format.width;
  const viewH = format.height;
  const canvas = document.createElement("canvas");
  canvas.width = viewW * pixelScale;
  canvas.height = viewH * pixelScale;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.setTransform(pixelScale, 0, 0, pixelScale, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  const model = computeBannerRenderModel(banner, format, 1);
  const resolvedHeadline = model.resolvedHeadline;
  const resolvedSubheadline = model.resolvedSubheadline;
  const resolvedSubheadline2 = model.resolvedSubheadline2;
  const resolvedCtaText = model.resolvedCtaText;
  const resolvedBgImageUrl = model.resolvedBgImageUrl;
  const resolvedBgScale = model.bgScale;
  const resolvedBgPositionX = model.bgPositionX;
  const resolvedBgPositionY = model.bgPositionY;
  const resolvedSubheadline2Size = model.subheadline2Size;
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

  const boxH = model.boxH;

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
      const drawX = model.logoLeft + (logoBoxW - fitted.width) / 2;
      const drawY = model.logoTop + (logoBoxH - fitted.height) / 2;
      ctx.drawImage(logo, drawX, drawY, fitted.width, fitted.height);
    } catch {}
  }

  const hasHeadline = Boolean((resolvedHeadline || "").trim());
  const hasSubheadline = Boolean((resolvedSubheadline || "").trim());
  const hasSubheadline2 = Boolean((resolvedSubheadline2 || "").trim());
  if (hasHeadline || hasSubheadline || hasSubheadline2) {
    const textW = model.textW;
    const textLeft = model.textLeft;
    const textAnchorY = model.textTop;
    const textX =
      textContentAlign === "left" ? textLeft : textContentAlign === "center" ? textLeft + textW / 2 : textLeft + textW;
    ctx.textAlign = textContentAlign as CanvasTextAlign;
    ctx.fillStyle = banner.textColor || "#ffffff";
    ctx.textBaseline = "top";
    const linesToDraw: Array<{ text: string; size: number; weight: string; lineHeight: number; gapBefore: number }> = [];

    if (hasHeadline) {
      ctx.font = `800 ${model.headlineSize}px "Space Grotesk", Inter, Arial, sans-serif`;
      const headlineLines = wrapLines(ctx, resolvedHeadline || "", textW, format.layout === "vertical" ? 3 : 2);
      headlineLines.forEach((line) => {
        linesToDraw.push({ text: line, size: model.headlineSize, weight: "800", lineHeight: model.headlineSize * 1.05, gapBefore: 0 });
      });
    }

    if (hasSubheadline) {
      ctx.font = `500 ${model.subheadlineSize}px "Space Grotesk", Inter, Arial, sans-serif`;
      const subLines = wrapLines(ctx, resolvedSubheadline || "", textW, format.layout === "vertical" ? 4 : 3);
      subLines.forEach((line) => {
        linesToDraw.push({
          text: line,
          size: model.subheadlineSize,
          weight: "500",
          lineHeight: model.subheadlineSize * 1.5,
          gapBefore: linesToDraw.length ? 8 : 0,
        });
      });
    }

    if (hasSubheadline2) {
      ctx.font = `500 ${resolvedSubheadline2Size}px "Space Grotesk", Inter, Arial, sans-serif`;
      const sub2Lines = wrapLines(ctx, resolvedSubheadline2 || "", textW, format.layout === "vertical" ? 4 : 3);
      sub2Lines.forEach((line) => {
        linesToDraw.push({
          text: line,
          size: resolvedSubheadline2Size,
          weight: "500",
          lineHeight: resolvedSubheadline2Size * 1.5,
          gapBefore: linesToDraw.length ? 8 : 0,
        });
      });
    }

    const totalHeight = linesToDraw.reduce((acc, item) => acc + item.gapBefore + item.lineHeight, 0);
    const minTextY = 0;
    const maxTextY = Math.max(minTextY, boxH - totalHeight);
    let textY = clamp(textAnchorY - totalHeight / 2, minTextY, maxTextY);
    linesToDraw.forEach((item) => {
      textY += item.gapBefore;
      ctx.font = `${item.weight} ${item.size}px "Space Grotesk", Inter, Arial, sans-serif`;
      ctx.fillText(item.text, Math.round(textX), Math.round(textY));
      textY += item.lineHeight;
    });
    ctx.textAlign = "left";
  }

  const ctaText = resolvedCtaText || "Zjistit více";
  ctx.font = `700 ${model.ctaSize}px "Space Grotesk", Inter, Arial, sans-serif`;
  const ctaW = model.ctaW;
  const ctaH = model.ctaH;
  const ctaPadX = 16;
  const ctaX = model.ctaLeft;
  const ctaY = model.ctaTop;
  ctx.fillStyle = banner.ctaBg || "#facc15";
  ctx.fillRect(ctaX, ctaY, ctaW, ctaH);
  ctx.fillStyle = banner.ctaTextColor || "#111827";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(ctaText, Math.round(ctaX + ctaPadX), Math.round(ctaY + ctaH / 2));

  return canvas.toDataURL("image/png");
}

export async function exportBannerPng(banner: Banner, format: BannerFormat) {
  const dataUrl = await renderBannerPngDataUrl(banner, format);
  const safeName = (banner.name || "banner").replace(/[^\w\-]+/g, "_");
  downloadDataUrl(dataUrl, `${safeName}_${format.width}x${format.height}.png`);
}

export async function exportBannerZip(banner: Banner) {
  const safeName = (banner.name || "banner").replace(/[^\w\-]+/g, "_");
  const files = await Promise.all(
    (banner.formats || []).map(async (format) => ({
      name: `${safeName}_${format.width}x${format.height}.png`,
      dataUrl: await renderBannerPngDataUrl(banner, format),
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
}
