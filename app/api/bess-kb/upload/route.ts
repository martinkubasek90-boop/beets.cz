import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { ingestKnowledgeItems, type KnowledgeItem } from '@/lib/bess-knowledge';

export const runtime = 'nodejs';

function isAuthorized(request: Request) {
  const expected = process.env.BESS_KB_ADMIN_TOKEN;
  if (!expected) return true;

  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return token === expected;
}

function decodeTextFile(buffer: Buffer) {
  return buffer.toString('utf-8').replace(/\u0000/g, '').trim();
}

async function extractPdfTextWithLlm(fileName: string, base64Data: string) {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error('PDF parsing requires LLM_API_KEY in environment.');
  }

  const client = new OpenAI({ apiKey, ...(process.env.LLM_API_URL ? { baseURL: process.env.LLM_API_URL } : {}) });
  const model = process.env.LLM_DOC_MODEL || process.env.LLM_MODEL || 'gpt-4.1-mini';

  const response = await client.responses.create({
    model,
    input: [
      {
        role: 'system',
        content:
          'Extract plain text from the provided PDF. Keep headings and bullet points. Return only extracted text in Czech or source language, no commentary.',
      },
      {
        role: 'user',
        content: [
          { type: 'input_text', text: 'Extract all meaningful textual content from this PDF.' },
          {
            type: 'input_file',
            filename: fileName,
            file_data: `data:application/pdf;base64,${base64Data}`,
          },
        ],
      },
    ],
  });

  const text = response.output_text?.trim();
  if (!text) throw new Error('PDF extraction returned empty text.');
  return text;
}

async function fileToKnowledgeItem(file: File): Promise<KnowledgeItem> {
  const fileName = file.name || `upload-${Date.now()}`;
  const lower = fileName.toLowerCase();
  const bytes = Buffer.from(await file.arrayBuffer());

  if (lower.endsWith('.pdf') || file.type === 'application/pdf') {
    const text = await extractPdfTextWithLlm(fileName, bytes.toString('base64'));
    return { type: 'text', label: fileName, text };
  }

  if (
    lower.endsWith('.txt') ||
    lower.endsWith('.md') ||
    lower.endsWith('.csv') ||
    lower.endsWith('.json') ||
    lower.endsWith('.xml') ||
    lower.endsWith('.html') ||
    lower.endsWith('.htm')
  ) {
    const text = decodeTextFile(bytes);
    if (!text) throw new Error(`File ${fileName} is empty.`);
    return { type: 'text', label: fileName, text };
  }

  throw new Error(`Unsupported file type for ${fileName}. Supported: pdf, txt, md, csv, json, xml, html.`);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const namespace = String(form.get('namespace') || 'bess').trim().toLowerCase();
    const entries = form.getAll('files').filter((item): item is File => item instanceof File);

    if (!entries.length) {
      return NextResponse.json({ error: 'No files uploaded.' }, { status: 400 });
    }

    const items: KnowledgeItem[] = [];
    for (const file of entries) {
      items.push(await fileToKnowledgeItem(file));
    }

    const summary = await ingestKnowledgeItems(namespace, items);
    return NextResponse.json({ ok: true, namespace, processed: items.length, summary });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'File ingest failed.' }, { status: 500 });
  }
}
