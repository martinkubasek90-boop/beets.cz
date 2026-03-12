import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type RequestPayload = {
  imageDataUrl?: string;
  stylePrompt?: string;
  frameColor?: string;
  note?: string;
};

function dataUrlToBlob(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error('Invalid image format.');
  const mimeType = match[1];
  const base64 = match[2];
  const bytes = Buffer.from(base64, 'base64');
  return new Blob([bytes], { type: mimeType });
}

function sanitizeText(value: string, max = 600) {
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.LLM_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing OPENAI_API_KEY (or LLM_API_KEY) in environment.' },
      { status: 500 }
    );
  }

  const payload = (await request.json().catch(() => ({}))) as RequestPayload;
  if (!payload.imageDataUrl) {
    return NextResponse.json({ error: 'Missing source image.' }, { status: 400 });
  }

  try {
    const imageBlob = dataUrlToBlob(payload.imageDataUrl);
    const stylePrompt = sanitizeText(payload.stylePrompt || '');
    const frameColor = sanitizeText(payload.frameColor || 'Antracit');
    const note = sanitizeText(payload.note || '', 400);

    const prompt = [
      'Photorealistic architectural visualization edit.',
      'Keep the same house geometry, perspective, roof, walls, and lighting.',
      'Replace existing windows with premium modern windows from Nanookna portfolio.',
      `Window style guidance: ${stylePrompt || 'Minimalist flush frame windows with clean modern proportions.'}`,
      `Frame color: ${frameColor}.`,
      note ? `Additional client note: ${note}.` : '',
      'Result must look realistic, natural shadows and reflections, no text, no watermark.',
    ]
      .filter(Boolean)
      .join(' ');

    const formData = new FormData();
    formData.append('model', process.env.DESIGNER_IMAGE_MODEL || 'gpt-image-1');
    formData.append('prompt', prompt);
    formData.append('size', '1536x1024');
    formData.append('image', imageBlob, 'house.png');

    const response = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `OpenAI image edit failed: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }

    const result = (await response.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };

    const image = result.data?.[0];
    if (!image?.b64_json && !image?.url) {
      return NextResponse.json({ error: 'No image returned by model.' }, { status: 500 });
    }

    if (image.url) {
      return NextResponse.json({ imageUrl: image.url });
    }

    return NextResponse.json({ imageDataUrl: `data:image/png;base64,${image.b64_json}` });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Generation failed.' }, { status: 500 });
  }
}
