import { NextResponse } from 'next/server';
import { ingestKnowledgeItems } from '@/lib/bess-knowledge';

export const runtime = 'nodejs';

type IngestPayload = {
  namespace?: string;
  items?: Array<{
    type: 'url' | 'text';
    label?: string;
    url?: string;
    text?: string;
  }>;
};

function isAuthorized(request: Request) {
  const expected = process.env.BESS_KB_ADMIN_TOKEN;
  if (!expected) return true;

  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return token === expected;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as IngestPayload;
  const namespace = (payload.namespace || 'bess').trim().toLowerCase();
  const items = payload.items || [];

  if (!items.length) {
    return NextResponse.json({ error: 'Missing ingestion items.' }, { status: 400 });
  }

  try {
    const summary = await ingestKnowledgeItems(namespace, items);
    return NextResponse.json({ ok: true, namespace, summary });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Ingestion failed.' }, { status: 500 });
  }
}
