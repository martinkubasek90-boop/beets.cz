export type ResizeImageOptions = {
  maxSize?: number;
  quality?: number;
  mimeType?: string;
};

const isResizableImage = (file: File) => {
  const type = file.type.toLowerCase();
  return type === "image/jpeg" || type === "image/png" || type === "image/webp";
};

const getOutputName = (name: string, mimeType: string) => {
  const base = name.replace(/\.[^/.]+$/, "");
  const ext = mimeType === "image/png" ? "png" : mimeType === "image/jpeg" ? "jpg" : "webp";
  return `${base}.${ext}`;
};

export async function resizeImageFile(file: File, options: ResizeImageOptions = {}) {
  if (!isResizableImage(file)) return file;

  const maxSize = options.maxSize ?? 512;
  const quality = options.quality ?? 0.82;
  const mimeType = options.mimeType ?? "image/webp";

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.type === mimeType) {
    bitmap.close();
    return file;
  }

  const targetWidth = Math.max(1, Math.round(bitmap.width * scale));
  const targetHeight = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, mimeType, quality);
  });
  if (!blob) return file;

  return new File([blob], getOutputName(file.name, mimeType), { type: mimeType });
}
