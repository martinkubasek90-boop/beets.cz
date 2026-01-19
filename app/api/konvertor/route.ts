import { NextResponse } from 'next/server';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, mkdtemp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PassThrough } from 'node:stream';
import archiver from 'archiver';
import ffmpegPath from 'ffmpeg-static';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const execFileAsync = promisify(execFile);

function sanitizeName(value: string) {
  const base = path.basename(value);
  return base.replace(/[^\w.-]+/g, '_');
}

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
      // Zkus další kandidát
    }
  }

  throw new Error('Chybí ffmpeg binárka.');
}

function readWavSampleRate(buffer: Buffer) {
  if (buffer.length < 32) return null;
  const fmtLabel = Buffer.from('fmt ');
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.subarray(offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    if (chunkId.equals(fmtLabel)) {
      if (offset + 8 + 16 <= buffer.length) {
        return buffer.readUInt32LE(offset + 12);
      }
      return null;
    }
    const advance = 8 + chunkSize + (chunkSize % 2);
    offset += advance;
  }
  return null;
}

async function convertToMp3(inputPath: string, outputPath: string, sampleRate?: number | null) {
  const resolved = await resolveFfmpegPath();
  const args = ['-y', '-i', inputPath, '-codec:a', 'libmp3lame', '-b:a', '320k'];
  if (sampleRate) {
    args.push('-ar', String(sampleRate));
  }
  args.push(outputPath);
  await execFileAsync(resolved, args);
}

async function zipFolderToBuffer(sourceDir: string) {
  return new Promise<Buffer>((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = new PassThrough();
    const chunks: Buffer[] = [];

    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
    archive.on('error', reject);

    archive.directory(sourceDir, false);
    archive.pipe(stream);
    void archive.finalize();
  });
}

async function zipFolderToFile(sourceDir: string, outputPath: string) {
  await new Promise<void>((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = createWriteStream(outputPath);

    stream.on('close', () => resolve());
    stream.on('error', reject);
    archive.on('error', reject);

    archive.directory(sourceDir, false);
    archive.pipe(stream);
    void archive.finalize();
  });
}

function getStorageClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE ||
    process.env.SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function parseSampleRate(value?: string | null) {
  if (!value || value === 'auto') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeOutputRate(inputRate: number | null, requested: number | null) {
  if (requested && ![44100, 48000].includes(requested)) return null;
  if (!inputRate) return requested;
  if (![44100, 48000].includes(inputRate)) return null;
  return requested || inputRate;
}

export async function POST(request: Request) {
  let workingDir: string | null = null;

  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const payload = (await request.json()) as {
        jobId?: string;
        inputPaths?: string[];
        sampleRate?: string;
      };
      const inputPaths = payload?.inputPaths?.filter(Boolean) ?? [];
      if (!inputPaths.length) {
        return NextResponse.json({ error: 'Chybí soubory ke konverzi.' }, { status: 400 });
      }

      const supabase = getStorageClient();
      if (!supabase) {
        return NextResponse.json({ error: 'Chybí Supabase service key.' }, { status: 500 });
      }

      const bucket = 'konvertor';
      const jobId = payload.jobId || `job-${Date.now()}`;
      const requestRate = parseSampleRate(payload.sampleRate);

      workingDir = await mkdtemp(path.join(os.tmpdir(), 'beets-konvertor-'));
      const uploadDir = path.join(workingDir, 'uploads');
      const outputDir = path.join(workingDir, 'outputs');
      await mkdir(uploadDir, { recursive: true });
      await mkdir(outputDir, { recursive: true });

      const errors: string[] = [];
      for (const inputPath of inputPaths) {
        const name = sanitizeName(path.basename(inputPath));
        const ext = path.extname(name).toLowerCase();
        if (ext !== '.wav') {
          errors.push(`${name}: nepodporovaný formát`);
          continue;
        }

        const { data: downloaded, error: downloadError } = await supabase.storage
          .from(bucket)
          .download(inputPath);
        if (downloadError || !downloaded) {
          errors.push(`${name}: nepodařilo se stáhnout`);
          continue;
        }

        const buffer = Buffer.from(await downloaded.arrayBuffer());
        const inputFilePath = path.join(uploadDir, name);
        await writeFile(inputFilePath, buffer);

        const sampleRate = readWavSampleRate(buffer);
        const outputRate = normalizeOutputRate(sampleRate, requestRate);
        if (!outputRate && sampleRate && ![44100, 48000].includes(sampleRate)) {
          errors.push(`${name}: podporujeme jen 44.1/48 kHz`);
          continue;
        }

        const outputName = `${path.basename(name, ext)}.mp3`;
        const outputPath = path.join(outputDir, outputName);
        await convertToMp3(inputFilePath, outputPath, outputRate);
      }

      if (errors.length === inputPaths.length) {
        await supabase.storage.from(bucket).remove(inputPaths);
        return NextResponse.json(
          { error: 'Nepodařilo se převést žádný soubor.', details: errors },
          { status: 400 }
        );
      }

      const zipName = `beets-konvertor-${Date.now()}.zip`;
      const zipPath = path.join(workingDir, zipName);
      await zipFolderToFile(outputDir, zipPath);
      const zipBuffer = await readFile(zipPath);
      const zipStoragePath = `jobs/${jobId}/output/${zipName}`;

      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(zipStoragePath, zipBuffer, {
          contentType: 'application/zip',
          upsert: true,
        });

      await supabase.storage.from(bucket).remove(inputPaths);

      if (uploadErr) {
        throw uploadErr;
      }

      const { data: signed, error: signedErr } = await supabase.storage
        .from(bucket)
        .createSignedUrl(zipStoragePath, 60 * 60 * 6);
      if (signedErr || !signed?.signedUrl) {
        throw signedErr || new Error('Nepodařilo se vytvořit link ke stažení.');
      }

      await rm(workingDir, { recursive: true, force: true });
      workingDir = null;

      return NextResponse.json({
        ok: true,
        downloadUrl: signed.signedUrl,
        errors,
      });
    }

    const formData = await request.formData();
    const files = formData.getAll('files').filter((file): file is File => file instanceof File);

    if (!files.length) {
      return NextResponse.json({ error: 'Nebyl vybrán žádný WAV soubor.' }, { status: 400 });
    }

    workingDir = await mkdtemp(path.join(os.tmpdir(), 'beets-konvertor-'));
    const uploadDir = path.join(workingDir, 'uploads');
    const outputDir = path.join(workingDir, 'outputs');
    await mkdir(uploadDir, { recursive: true });
    await mkdir(outputDir, { recursive: true });

    const errors: string[] = [];
    for (const file of files) {
      const originalName = sanitizeName(file.name || 'audio.wav');
      const ext = path.extname(originalName).toLowerCase();
      if (ext !== '.wav') {
        errors.push(`${originalName}: nepodporovaný formát`);
        continue;
      }

      const inputPath = path.join(uploadDir, originalName);
      const outputName = `${path.basename(originalName, ext)}.mp3`;
      const outputPath = path.join(outputDir, outputName);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(inputPath, buffer);
      const sampleRate = readWavSampleRate(buffer);
      if (sampleRate && ![44100, 48000].includes(sampleRate)) {
        errors.push(`${originalName}: podporujeme jen 44.1/48 kHz`);
        continue;
      }
      await convertToMp3(inputPath, outputPath, sampleRate);
    }

    if (errors.length === files.length) {
      return NextResponse.json({ error: 'Nepodařilo se převést žádný soubor.', details: errors }, { status: 400 });
    }

    const zipName = `beets-konvertor-${Date.now()}.zip`;
    const zipBuffer = await zipFolderToBuffer(outputDir);
    await rm(workingDir, { recursive: true, force: true });
    workingDir = null;

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipName}"`,
      },
    });
  } catch (error: any) {
    console.error('Konverze WAV -> MP3 selhala:', error);
    if (workingDir) {
      await rm(workingDir, { recursive: true, force: true });
    }
    const message =
      error?.code === 'ENOENT'
        ? 'Chybí ffmpeg. Zkontroluj nasazení konvertoru.'
        : error?.message || 'Konverze selhala.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
