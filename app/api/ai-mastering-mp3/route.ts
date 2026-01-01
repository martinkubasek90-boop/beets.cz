import { NextResponse } from 'next/server';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ffmpegPath from 'ffmpeg-static';

export const runtime = 'nodejs';

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
      // zkus další cestu
    }
  }

  throw new Error('Chybí ffmpeg binárka.');
}

export async function POST(request: Request) {
  let workingDir: string | null = null;
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Chybí WAV soubor.' }, { status: 400 });
    }

    workingDir = await mkdtemp(path.join(os.tmpdir(), 'beets-mastering-'));
    const inputPath = path.join(workingDir, 'input.wav');
    const outputPath = path.join(workingDir, 'output.mp3');

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
        'Content-Disposition': 'attachment; filename="beets-master.mp3"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    if (workingDir) {
      await rm(workingDir, { recursive: true, force: true });
    }
    const message =
      error?.code === 'ENOENT'
        ? 'Chybí ffmpeg. Zkontroluj nasazení.'
        : error?.message || 'Konverze do MP3 selhala.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
