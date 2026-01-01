import { NextResponse } from 'next/server';
import { PassThrough } from 'node:stream';
import path from 'node:path';
import archiver from 'archiver';

export const runtime = 'nodejs';

type RequestPayload = {
  url?: string;
};

type ReplicatePrediction = {
  id: string;
  status: string;
  output?: unknown;
  error?: string | null;
  urls?: {
    get?: string;
  };
};

const MAX_REPLICATE_WAIT_MS = 120_000;
const REPLICATE_POLL_INTERVAL_MS = 3_000;

function sanitizeName(value: string) {
  const base = path.basename(value);
  const cleaned = base.replace(/[^\w.-]+/g, '_');
  return cleaned || 'stem.wav';
}

function ensureExtension(name: string, fallbackExt = '.wav') {
  if (path.extname(name)) return name;
  return `${name}${fallbackExt}`;
}

function filenameFromUrl(url: string, fallback: string) {
  try {
    const base = path.basename(new URL(url).pathname);
    return sanitizeName(base || fallback);
  } catch {
    return sanitizeName(fallback);
  }
}

async function fetchBinary(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Stažení výstupu selhalo: ${response.status} ${text}`);
  }
  const buffer = new Uint8Array(await response.arrayBuffer());
  return {
    buffer,
    contentType: response.headers.get('content-type') || '',
  };
}

async function zipBuffers(files: Array<{ name: string; data: Uint8Array }>) {
  return new Promise<Buffer>((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const stream = new PassThrough();
    const chunks: Buffer[] = [];

    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
    archive.on('error', reject);

    for (const file of files) {
      archive.append(Buffer.from(file.data), { name: file.name });
    }

    archive.pipe(stream);
    void archive.finalize();
  });
}

function collectOutputUrls(output: unknown) {
  const urls: Array<{ url: string; name: string }> = [];

  const pushUrl = (value: string, nameHint?: string) => {
    const fallback = nameHint ? ensureExtension(nameHint) : `stem-${urls.length + 1}.wav`;
    urls.push({ url: value, name: filenameFromUrl(value, fallback) });
  };

  const walk = (value: unknown, key?: string) => {
    if (!value) return;
    if (typeof value === 'string') {
      pushUrl(value, key);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry, idx) => walk(entry, key ? `${key}-${idx + 1}` : undefined));
      return;
    }
    if (typeof value === 'object') {
      Object.entries(value as Record<string, unknown>).forEach(([childKey, childValue]) =>
        walk(childValue, childKey)
      );
    }
  };

  walk(output);
  return urls;
}

async function runReplicate(url: string) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: 'Chybí REPLICATE_API_TOKEN. Doplň ho do env.' },
      { status: 500 }
    );
  }

  const version = process.env.REPLICATE_DEMUCS_VERSION;
  if (!version) {
    return NextResponse.json(
      { error: 'Chybí REPLICATE_DEMUCS_VERSION. Zadej version ID modelu z Replicate.' },
      { status: 500 }
    );
  }

  const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      Authorization: `Token ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version,
      input: { audio: url },
    }),
  });

  if (!createResponse.ok) {
    const text = await createResponse.text();
    return NextResponse.json(
      { error: `Replicate chyba: ${createResponse.status} ${text || 'Bez detailu'}` },
      { status: createResponse.status }
    );
  }

  let prediction = (await createResponse.json()) as ReplicatePrediction;
  const start = Date.now();

  while (!['succeeded', 'failed', 'canceled'].includes(prediction.status)) {
    if (Date.now() - start > MAX_REPLICATE_WAIT_MS) {
      return NextResponse.json(
        { error: 'Replicate timeout. Zkus to prosím znovu.' },
        { status: 504 }
      );
    }
    if (!prediction.urls?.get) {
      return NextResponse.json(
        { error: 'Replicate neposlal URL pro polling.' },
        { status: 500 }
      );
    }
    await new Promise((resolve) => setTimeout(resolve, REPLICATE_POLL_INTERVAL_MS));
    const pollResponse = await fetch(prediction.urls.get, {
      headers: { Authorization: `Token ${token}` },
    });
    if (!pollResponse.ok) {
      const text = await pollResponse.text();
      return NextResponse.json(
        { error: `Replicate polling chyba: ${pollResponse.status} ${text || 'Bez detailu'}` },
        { status: pollResponse.status }
      );
    }
    prediction = (await pollResponse.json()) as ReplicatePrediction;
  }

  if (prediction.status !== 'succeeded') {
    return NextResponse.json(
      { error: `Replicate selhal: ${prediction.error || 'Bez detailu'}` },
      { status: 500 }
    );
  }

  const output = prediction.output;
  if (!output) {
    return NextResponse.json({ error: 'Replicate neposlal žádný výstup.' }, { status: 500 });
  }

  if (typeof output === 'string') {
    const { buffer, contentType } = await fetchBinary(output);
    const isZip = output.toLowerCase().endsWith('.zip') || contentType.includes('zip');
    if (isZip) {
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': 'attachment; filename="stems.zip"',
          'Cache-Control': 'no-store',
        },
      });
    }

    const zipBuffer = await zipBuffers([
      { name: filenameFromUrl(output, 'stem-1.wav'), data: buffer },
    ]);
    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="stems.zip"',
        'Cache-Control': 'no-store',
      },
    });
  }

  const urls = collectOutputUrls(output);
  if (!urls.length) {
    return NextResponse.json({ error: 'Replicate výstup je neznámý formát.' }, { status: 500 });
  }

  const files = await Promise.all(
    urls.map(async (item) => {
      const { buffer } = await fetchBinary(item.url);
      return { name: item.name, data: buffer };
    })
  );

  const zipBuffer = await zipBuffers(files);
  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="stems.zip"',
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json().catch(() => ({}))) as RequestPayload;
    if (!payload.url) {
      return NextResponse.json({ error: 'Chybí URL souboru.' }, { status: 400 });
    }

    return await runReplicate(payload.url);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Neočekávaná chyba při zpracování.' },
      { status: 500 }
    );
  }
}
