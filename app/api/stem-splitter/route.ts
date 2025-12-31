import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const token = process.env.HUGGINGFACE_API_KEY;
    if (!token) {
      return NextResponse.json(
        { error: 'Chybí HUGGINGFACE_API_KEY. Doplň ho do env.' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'Chybí audio soubor.' }, { status: 400 });
    }

    const maxBytes = 25 * 1024 * 1024;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: 'Soubor je moc velký pro free HF (max ~25 MB). Zkus kratší/export MP3.' },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const contentType = file.type || 'application/octet-stream';

    const response = await fetch('https://router.huggingface.co/hf-inference/models/facebook/demucs', {
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
