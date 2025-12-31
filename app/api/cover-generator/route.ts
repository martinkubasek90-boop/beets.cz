import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type RequestPayload = {
  prompt?: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
};

export async function POST(request: Request) {
  const token = process.env.HUGGINGFACE_API_KEY;
  if (!token) {
    return NextResponse.json(
      { error: 'Chybí HUGGINGFACE_API_KEY. Doplň ho do env.' },
      { status: 500 }
    );
  }

  const payload = (await request.json().catch(() => ({}))) as RequestPayload;
  const prompt = payload.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: 'Chybí prompt.' }, { status: 400 });
  }

  const width = Math.min(1024, Math.max(512, payload.width ?? 1024));
  const height = Math.min(1024, Math.max(512, payload.height ?? 1024));

  const response = await fetch(
    'https://router.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'image/png',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          width,
          height,
          negative_prompt: payload.negativePrompt,
        },
        options: { wait_for_model: true },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    return NextResponse.json(
      { error: `HF chyba: ${response.status} ${errorText}` },
      { status: response.status }
    );
  }

  const buffer = await response.arrayBuffer();
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
    },
  });
}
