import { NextResponse } from "next/server";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportGifBody = {
  name?: string;
  width?: number;
  height?: number;
  delayMs?: number;
  files?: Array<{
    name: string;
    dataUrl: string;
  }>;
};

function sanitizeName(value: string) {
  return value.replace(/[^\w.\-]+/g, "_");
}

function dataUrlToBuffer(dataUrl: string) {
  const split = dataUrl.split(",");
  if (split.length < 2) throw new Error("Neplatný data URL.");
  return Buffer.from(split[1], "base64");
}

function runFfmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    if (!ffmpegPath) {
      reject(new Error("FFmpeg není dostupný."));
      return;
    }
    const child = spawn(ffmpegPath, args, { stdio: "pipe" });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || "FFmpeg zpracování selhalo."));
    });
  });
}

export async function POST(request: Request) {
  const tempRoot = await mkdtemp(join(tmpdir(), "ppc-banner-gif-"));
  try {
    const body = (await request.json()) as ExportGifBody;
    const input = Array.isArray(body.files) ? body.files : [];
    if (input.length < 2) {
      return NextResponse.json({ error: "Pro GIF jsou potřeba aspoň 2 snímky." }, { status: 400 });
    }

    const width = Math.max(1, Math.round(Number(body.width) || 1200));
    const height = Math.max(1, Math.round(Number(body.height) || 628));
    const delayMs = Math.max(200, Math.min(3000, Math.round(Number(body.delayMs) || 900)));
    const fps = Math.max(0.2, Math.min(10, 1000 / delayMs));

    for (let i = 0; i < input.length; i += 1) {
      const framePath = join(tempRoot, `frame-${String(i + 1).padStart(3, "0")}.png`);
      await writeFile(framePath, dataUrlToBuffer(input[i].dataUrl));
    }

    const palettePath = join(tempRoot, "palette.png");
    const gifPath = join(tempRoot, "output.gif");

    await runFfmpeg([
      "-y",
      "-framerate",
      String(fps),
      "-i",
      join(tempRoot, "frame-%03d.png"),
      "-vf",
      `fps=${fps},scale=${width}:${height}:flags=lanczos,palettegen`,
      palettePath,
    ]);

    await runFfmpeg([
      "-y",
      "-framerate",
      String(fps),
      "-i",
      join(tempRoot, "frame-%03d.png"),
      "-i",
      palettePath,
      "-lavfi",
      `fps=${fps},scale=${width}:${height}:flags=lanczos[x];[x][1:v]paletteuse`,
      "-loop",
      "0",
      gifPath,
    ]);

    const gifBuffer = await readFile(gifPath);
    const gifBytes = new Uint8Array(gifBuffer);
    const baseName = sanitizeName(body.name || "banner");
    return new NextResponse(gifBytes, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Content-Disposition": `attachment; filename="${baseName}.gif"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "GIF export selhal.";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await rm(tempRoot, { recursive: true, force: true }).catch(() => undefined);
  }
}
