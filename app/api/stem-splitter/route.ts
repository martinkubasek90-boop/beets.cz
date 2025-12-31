import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type RequestPayload = {
  url?: string;
};

export async function POST(request: Request) {
  try {
    const token = process.env.HUGGINGFACE_API_KEY;
    if (!token) {
      return NextResponse.json(
        { error: 'Chybí HUGGINGFACE_API_KEY. Doplň ho do env.' },
        { status: 500 }
      );
    }

    const payload = (await request.json().catch(() => ({}))) as RequestPayload;
    if (!payload.url) {
      return NextResponse.json({ error: 'Chybí URL souboru.' }, { status: 400 });
    }

    const sourceResponse = await fetch(payload.url);
    if (!sourceResponse.ok) {
      const text = await sourceResponse.text();
      return NextResponse.json(
        { error: `Nepodařilo se stáhnout soubor: ${sourceResponse.status} ${text}` },
        { status: 400 }
      );
    }

    const contentLength = Number(sourceResponse.headers.get('content-length') || 0);
    const maxBytes = 25 * 1024 * 1024;
    if (contentLength && contentLength > maxBytes) {
      return NextResponse.json(
        { error: 'Soubor je moc velký pro free HF (max ~25 MB). Zkus kratší/export MP3.' },
        { status: 413 }
      );
    }

    const arrayBuffer = await sourceResponse.arrayBuffer();
    const contentType = sourceResponse.headers.get('content-type') || 'application/octet-stream';

    const model = process.env.HF_DEMUCS_MODEL || 'facebook/demucs';
    const modelId = encodeURIComponent(model);
    const response = await fetch(`https://router.huggingface.co/hf-inference/models/${modelId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': contentType,
        Accept: 'application/zip',
      },
      body: arrayBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `HF chyba: ${response.status} ${errorText || 'Bez detailu'}` },
        { status: response.status }
      );
    }

    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="stems.zip"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Neočekávaná chyba při zpracování.' },
      { status: 500 }
    );
  }
}
