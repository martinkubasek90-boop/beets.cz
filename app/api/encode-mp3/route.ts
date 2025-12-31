import { NextResponse } from 'next/server';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const execFileAsync = promisify(execFile);

async function resolveFfmpegPath() {
  const candidates = [
    ffmpegPath,
    path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg'),
    path.join(process.cwd(), '.next', 'standalone', 'node_modules', 'ffmpeg-static', 'ffmpeg'),
    path.join(process.cwd(), '.next', 'server', 'node_modules', 'ffmpeg-static', 'ffmpeg'),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  throw new Error('Chybí ffmpeg binárka.');
}

export async function POST(request: Request) {
  let workingDir: string | null = null;
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Chybí audio soubor.' }, { status: 400 });
    }

    workingDir = await mkdtemp(path.join(os.tmpdir(), 'beets-encode-'));
    const inputDir = path.join(workingDir, 'input');
    const outputDir = path.join(workingDir, 'output');
    await mkdir(inputDir, { recursive: true });
    await mkdir(outputDir, { recursive: true });

    const inputPath = path.join(inputDir, 'input.wav');
    const outputPath = path.join(outputDir, 'output.mp3');
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(inputPath, buffer);

    const ffmpeg = await resolveFfmpegPath();
    await execFileAsync(ffmpeg, ['-y', '-i', inputPath, '-codec:a', 'libmp3lame', '-b:a', '320k', outputPath]);

    const mp3Buffer = await readFile(outputPath);
    await rm(workingDir, { recursive: true, force: true });
    workingDir = null;

    return new NextResponse(new Uint8Array(mp3Buffer), {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename="mix-fix.mp3"',
      },
    });
  } catch (error: any) {
    if (workingDir) {
      await rm(workingDir, { recursive: true, force: true });
    }
    return NextResponse.json({ error: error?.message || 'Konverze selhala.' }, { status: 500 });
  }
}
