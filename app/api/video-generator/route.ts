import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type RequestPayload = {
  prompt?: string;
  duration?: number;
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

  const duration = payload.duration === 8 ? 8 : 4;
  const fps = 8;
  const numFrames = duration * fps;

  const response = await fetch(
    'https://router.huggingface.co/hf-inference/models/damo-vilab/text-to-video-ms-1.7b',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'video/mp4',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          num_frames: numFrames,
          fps,
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
      'Content-Type': 'video/mp4',
      'Cache-Control': 'no-store',
    },
  });
}
