import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Payload = {
  prompt?: string;
  width?: number;
  height?: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function safePrompt(input: string) {
  return input.replace(/\s+/g, " ").trim().slice(0, 500);
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as Payload;
  const prompt = safePrompt(payload.prompt || "");

  if (!prompt) {
    return NextResponse.json({ error: "Chybí prompt." }, { status: 400 });
  }

  const width = clamp(Number(payload.width) || 1536, 512, 2048);
  const height = clamp(Number(payload.height) || 1024, 512, 2048);

  // Free-tier fallback provider without API key.
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&enhance=true`;

  return NextResponse.json({ imageUrl: url });
}
