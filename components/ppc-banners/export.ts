"use client";

import type { Banner, BannerFormat } from "@/components/ppc-banners/types";

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

const LOGO_SCALE_MIN = 0.4;
const LOGO_SCALE_MAX = 12;

function fitSize(width: number, height: number, maxWidth: number, maxHeight: number) {
  if (!width || !height || !maxWidth || !maxHeight) return { width: 0, height: 0 };
  const ratio = Math.min(maxWidth / width, maxHeight / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

export async function renderBannerPngDataUrl(banner: Banner, format: BannerFormat) {
  const canvas = document.createElement("canvas");
  canvas.width = format.width;
  canvas.height = format.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");

  const resolvedHeadline = format.headline ?? banner.headline;
  const resolvedSubheadline = format.subheadline ?? banner.subheadline;
  const resolvedSubheadline2 = format.subheadline2 ?? "";
  const resolvedCtaText = format.ctaText ?? banner.ctaText;
  const resolvedBgImageUrl = format.bgImageUrl ?? banner.bgImageUrl;
  const resolvedBgScale = typeof format.bgScale === "number" ? format.bgScale : banner.bgScale;
  const resolvedBgPositionX = typeof format.bgPositionX === "number" ? format.bgPositionX : banner.bgPositionX;
  const resolvedBgPositionY = typeof format.bgPositionY === "number" ? format.bgPositionY : banner.bgPositionY;
  const resolvedSubheadline2Size = format.subheadline2Size || format.subheadlineSize;
  const logoAlignX = format.logoAlignX || "left";
  const logoAlignY = format.logoAlignY || "top";
  const textAlignX = format.textAlignX || "left";
  const textAlignY = format.textAlignY || "center";
  const textContentAlign = format.textContentAlign || "left";
  const ctaAlignX = format.ctaAlignX || "left";
  const ctaAlignY = format.ctaAlignY || "bottom";

  ctx.fillStyle = resolvedBgImageUrl ? "#ffffff" : banner.bgColor || "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const bgSrc = await resolveImageSource(resolvedBgImageUrl);
  if (bgSrc) {
    try {
      const bg = await loadImage(bgSrc);
      const coverScale = Math.max(canvas.width / bg.width, canvas.height / bg.height);
      const scaleFactor = (typeof resolvedBgScale === "number" ? Math.max(10, Math.min(260, resolvedBgScale)) : 100) / 100;
      const drawW = bg.width * coverScale * scaleFactor;
      const drawH = bg.height * coverScale * scaleFactor;
      const posX = typeof resolvedBgPositionX === "number" ? Math.max(0, Math.min(100, resolvedBgPositionX)) : 50;
      const posY = typeof resolvedBgPositionY === "number" ? Math.max(0, Math.min(100, resolvedBgPositionY)) : 50;
      const x = (canvas.width - drawW) * (posX / 100);
      const y = (canvas.height - drawH) * (posY / 100);
      ctx.drawImage(bg, x, y, drawW, drawH);
    } catch {}
  }

  const pad = format.padding;
  const logoScale = Math.max(LOGO_SCALE_MIN, Math.min(LOGO_SCALE_MAX, format.logoScale || 1));
  const logoOffsetX = format.logoOffsetX || 0;
  const logoOffsetY = format.logoOffsetY || 0;
  const textOffsetX = format.textOffsetX || 0;
  const textOffsetY = format.textOffsetY || 0;
  const ctaOffsetX = format.ctaOffsetX || 0;
  const ctaOffsetY = format.ctaOffsetY || 0;
  const boxW = canvas.width;
  const boxH = canvas.height;

  if (bgSrc) {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "rgba(2,6,23,0.24)");
    gradient.addColorStop(1, "rgba(2,6,23,0.45)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  if (format.shapeEnabled) {
    const minSide = Math.min(canvas.width, canvas.height);
    const shapeSize = Math.round(minSide * ((format.shapeSize || 24) / 100));
    const shapeX = Math.round(canvas.width * ((format.shapeX || 78) / 100) - shapeSize / 2);
    const shapeY = Math.round(canvas.height * ((format.shapeY || 22) / 100) - shapeSize / 2);
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

  const logoSrcRaw = await resolveImageSource(banner.logoUrl);
  const logoSrc = banner.logoTransparentBg && logoSrcRaw ? await makeLogoTransparentForExport(logoSrcRaw) : logoSrcRaw;
  if (logoSrc) {
    try {
      const logo = await loadImage(logoSrc);
      const maxLogoW = Math.round(130 * logoScale);
      const maxLogoH = Math.round(32 * logoScale);
      const { width: logoW, height: logoH } = fitSize(logo.width, logo.height, maxLogoW, maxLogoH);
      const logoBaseX =
        logoAlignX === "left" ? pad : logoAlignX === "center" ? Math.round((boxW - logoW) / 2) : boxW - pad - logoW;
      const logoBaseY =
        logoAlignY === "top" ? pad : logoAlignY === "center" ? Math.round((boxH - logoH) / 2) : boxH - pad - logoH;
      const logoX = logoBaseX + logoOffsetX;
      const logoY = logoBaseY + logoOffsetY;
      ctx.drawImage(logo, logoX, logoY, logoW, logoH);
    } catch {}
  }

  const hasHeadline = Boolean((resolvedHeadline || "").trim());
  const hasSubheadline = Boolean((resolvedSubheadline || "").trim());
  const hasSubheadline2 = Boolean((resolvedSubheadline2 || "").trim());
  if (hasHeadline || hasSubheadline || hasSubheadline2) {
    const textW = Math.max(120, boxW - pad * 2 - 10);
    const textBaseX =
      textAlignX === "left" ? pad : textAlignX === "center" ? Math.round((boxW - textW) / 2) : boxW - pad - textW;
    const textBaseY =
      textAlignY === "top"
        ? pad + 80
        : textAlignY === "center"
          ? Math.round(boxH * 0.37)
          : boxH - pad - 140;
    const textLeft = textBaseX + textOffsetX;
    const textAnchorY = textBaseY + textOffsetY;
    const textX =
      textContentAlign === "left" ? textLeft : textContentAlign === "center" ? textLeft + textW / 2 : textLeft + textW;
    ctx.textAlign = textContentAlign as CanvasTextAlign;
    ctx.fillStyle = banner.textColor || "#ffffff";
    ctx.textBaseline = "top";
    const linesToDraw: Array<{ text: string; size: number; weight: string; lineHeight: number; gapBefore: number }> = [];

    if (hasHeadline) {
      ctx.font = `800 ${format.headlineSize}px Inter, Arial, sans-serif`;
      const headlineLines = wrapLines(ctx, resolvedHeadline || "", textW, format.layout === "vertical" ? 3 : 2);
      headlineLines.forEach((line) => {
        linesToDraw.push({ text: line, size: format.headlineSize, weight: "800", lineHeight: format.headlineSize * 1.12, gapBefore: 0 });
      });
    }

    if (hasSubheadline) {
      ctx.font = `500 ${format.subheadlineSize}px Inter, Arial, sans-serif`;
      const subLines = wrapLines(ctx, resolvedSubheadline || "", textW, format.layout === "vertical" ? 4 : 3);
      subLines.forEach((line) => {
        linesToDraw.push({
          text: line,
          size: format.subheadlineSize,
          weight: "500",
          lineHeight: format.subheadlineSize * 1.32,
          gapBefore: linesToDraw.length ? Math.max(10, Math.round(format.subheadlineSize * 0.5)) : 0,
        });
      });
    }

    if (hasSubheadline2) {
      ctx.font = `500 ${resolvedSubheadline2Size}px Inter, Arial, sans-serif`;
      const sub2Lines = wrapLines(ctx, resolvedSubheadline2 || "", textW, format.layout === "vertical" ? 4 : 3);
      sub2Lines.forEach((line) => {
        linesToDraw.push({
          text: line,
          size: resolvedSubheadline2Size,
          weight: "500",
          lineHeight: resolvedSubheadline2Size * 1.32,
          gapBefore: linesToDraw.length ? Math.max(8, Math.round(resolvedSubheadline2Size * 0.45)) : 0,
        });
      });
    }

    const totalHeight = linesToDraw.reduce((acc, item) => acc + item.gapBefore + item.lineHeight, 0);
    let textY = textAnchorY - totalHeight / 2;
    linesToDraw.forEach((item) => {
      textY += item.gapBefore;
      ctx.font = `${item.weight} ${item.size}px Inter, Arial, sans-serif`;
      ctx.fillText(item.text, textX, textY);
      textY += item.lineHeight;
    });
  }

  const ctaText = resolvedCtaText || "Zjistit více";
  ctx.font = `700 ${format.ctaSize}px Inter, Arial, sans-serif`;
  const ctaPadX = Math.round(format.ctaSize * 0.9);
  const ctaPadY = Math.round(format.ctaSize * 0.6);
  const ctaW = Math.round(ctx.measureText(ctaText).width + ctaPadX * 2);
  const ctaH = Math.round(format.ctaSize + ctaPadY * 2);
  const estimatedCtaW = Math.round((ctaText || "Zjistit více").length * format.ctaSize * 0.55 + 32);
  const estimatedCtaH = Math.round(format.ctaSize + 20);
  const ctaBaseX =
    ctaAlignX === "left" ? pad : ctaAlignX === "center" ? Math.round((boxW - estimatedCtaW) / 2) : boxW - pad - estimatedCtaW;
  const ctaBaseY =
    ctaAlignY === "top" ? pad : ctaAlignY === "center" ? Math.round((boxH - estimatedCtaH) / 2) : boxH - pad - estimatedCtaH;
  const ctaX = ctaBaseX + ctaOffsetX;
  const ctaY = ctaBaseY + ctaOffsetY;
  ctx.fillStyle = banner.ctaBg || "#facc15";
  roundedRectPath(ctx, ctaX, ctaY, ctaW, ctaH, Math.round(ctaH * 0.28));
  ctx.fill();
  ctx.fillStyle = banner.ctaTextColor || "#111827";
  ctx.textBaseline = "middle";
  ctx.fillText(ctaText, ctaX + ctaPadX, ctaY + ctaH / 2);

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
