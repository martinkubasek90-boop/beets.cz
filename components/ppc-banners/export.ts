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

export async function exportBannerPng(banner: Banner, format: BannerFormat) {
  const canvas = document.createElement("canvas");
  canvas.width = format.width;
  canvas.height = format.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");

  ctx.fillStyle = banner.bgColor || "#0f172a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const bgSrc = await resolveImageSource(banner.bgImageUrl);
  if (bgSrc) {
    try {
      const bg = await loadImage(bgSrc);
      const scale = Math.max(canvas.width / bg.width, canvas.height / bg.height);
      const drawW = bg.width * scale;
      const drawH = bg.height * scale;
      const x = (canvas.width - drawW) / 2;
      const y = (canvas.height - drawH) / 2;
      ctx.drawImage(bg, x, y, drawW, drawH);
    } catch {}
  }

  const pad = format.padding;
  const maxWidth = canvas.width - pad * 2;

  if (bgSrc) {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "rgba(2,6,23,0.24)");
    gradient.addColorStop(1, "rgba(2,6,23,0.45)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  let headerY = pad;
  const logoSrc = await resolveImageSource(banner.logoUrl);
  if (logoSrc) {
    try {
      const logo = await loadImage(logoSrc);
      const maxLogoH = Math.max(28, Math.round(canvas.height * 0.07));
      const scale = maxLogoH / logo.height;
      const w = logo.width * scale;
      const h = logo.height * scale;
      ctx.drawImage(logo, pad, headerY, w, h);
      ctx.font = "700 24px Inter, Arial, sans-serif";
      ctx.fillStyle = banner.textColor || "#ffffff";
      ctx.textBaseline = "middle";
      ctx.fillText(banner.brandName || "", pad + w + 14, headerY + h / 2);
      headerY += h + 18;
    } catch {}
  } else {
    ctx.font = "700 24px Inter, Arial, sans-serif";
    ctx.fillStyle = banner.textColor || "#ffffff";
    ctx.textBaseline = "top";
    ctx.fillText((banner.brandName || "Brand").toUpperCase(), pad, headerY);
    headerY += 38;
  }

  ctx.fillStyle = banner.textColor || "#ffffff";
  ctx.font = `800 ${format.headlineSize}px Inter, Arial, sans-serif`;
  ctx.textBaseline = "top";
  const headlineLines = wrapLines(ctx, banner.headline || "Silný headline", maxWidth, format.layout === "vertical" ? 3 : 2);
  let textY = headerY;
  headlineLines.forEach((line) => {
    ctx.fillText(line, pad, textY);
    textY += format.headlineSize * 1.12;
  });

  textY += Math.max(10, Math.round(format.subheadlineSize * 0.5));
  ctx.font = `500 ${format.subheadlineSize}px Inter, Arial, sans-serif`;
  const subLines = wrapLines(ctx, banner.subheadline || "Krátké doplnění hodnoty.", maxWidth, format.layout === "vertical" ? 4 : 3);
  subLines.forEach((line) => {
    ctx.fillText(line, pad, textY);
    textY += format.subheadlineSize * 1.32;
  });

  const ctaText = banner.ctaText || "Zjistit více";
  ctx.font = `700 ${format.ctaSize}px Inter, Arial, sans-serif`;
  const ctaPadX = Math.round(format.ctaSize * 0.9);
  const ctaPadY = Math.round(format.ctaSize * 0.6);
  const ctaW = Math.round(ctx.measureText(ctaText).width + ctaPadX * 2);
  const ctaH = Math.round(format.ctaSize + ctaPadY * 2);
  const ctaX = pad;
  const ctaY = canvas.height - pad - ctaH;
  ctx.fillStyle = banner.ctaBg || "#facc15";
  roundedRectPath(ctx, ctaX, ctaY, ctaW, ctaH, Math.round(ctaH * 0.28));
  ctx.fill();
  ctx.fillStyle = banner.ctaTextColor || "#111827";
  ctx.textBaseline = "middle";
  ctx.fillText(ctaText, ctaX + ctaPadX, ctaY + ctaH / 2);

  const dataUrl = canvas.toDataURL("image/png");
  const safeName = (banner.name || "banner").replace(/[^\w\-]+/g, "_");
  downloadDataUrl(dataUrl, `${safeName}_${format.width}x${format.height}.png`);
}
