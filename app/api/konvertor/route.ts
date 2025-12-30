import { NextResponse } from 'next/server';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const execFileAsync = promisify(execFile);

function sanitizeName(value: string) {
  const base = path.basename(value);
  return base.replace(/[^\w.-]+/g, '_');
}

async function convertToMp3(inputPath: string, outputPath: string) {
  await execFileAsync('ffmpeg', ['-y', '-i', inputPath, '-codec:a', 'libmp3lame', '-b:a', '320k', outputPath]);
}

async function zipFolder(sourceDir: string, zipPath: string) {
  await execFileAsync('zip', ['-r', zipPath, '.'], { cwd: sourceDir });
}

export async function POST(request: Request) {
  let workingDir: string | null = null;

  try {
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
      await convertToMp3(inputPath, outputPath);
    }

    if (errors.length === files.length) {
      return NextResponse.json({ error: 'Nepodařilo se převést žádný soubor.', details: errors }, { status: 400 });
    }

    const zipName = `beets-konvertor-${Date.now()}.zip`;
    const zipPath = path.join(workingDir, zipName);
    await zipFolder(outputDir, zipPath);

    const zipBuffer = await readFile(zipPath);
    await rm(workingDir, { recursive: true, force: true });
    workingDir = null;

    return new NextResponse(zipBuffer, {
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
        ? 'Chybí ffmpeg nebo zip. Nainstaluj je na server nebo uprav runtime.'
        : error?.message || 'Konverze selhala.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
