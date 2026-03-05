import { NextResponse } from 'next/server';
import { discoverUrlsFromSitemap, ingestKnowledgeItems, type KnowledgeItem } from '@/lib/bess-knowledge';

export const runtime = 'nodejs';

type IngestPayload = {
  namespace?: string;
  items?: KnowledgeItem[];
  sitemapUrl?: string;
  discoverOnly?: boolean;
  startIndex?: number;
  batchSize?: number;
  maxUrls?: number;
};

function isAuthorized(request: Request) {
  const expected = process.env.BESS_KB_ADMIN_TOKEN;
  if (!expected) return true;

  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return token === expected;
}

function validateNamespace(raw: string | undefined) {
  return (raw || 'bess').trim().toLowerCase();
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as IngestPayload;
  const namespace = validateNamespace(payload.namespace);

  try {
    if (payload.sitemapUrl?.trim()) {
      const startIndex = Math.max(0, Math.floor(payload.startIndex ?? 0));
      const batchSize = Math.min(150, Math.max(1, Math.floor(payload.batchSize ?? 50)));
      const maxUrls = Math.min(10000, Math.max(1, Math.floor(payload.maxUrls ?? 3000)));

      const discovery = await discoverUrlsFromSitemap(payload.sitemapUrl.trim(), { maxUrls });
      const totalUrls = discovery.urls.length;

      if (payload.discoverOnly) {
        return NextResponse.json({
          ok: true,
          namespace,
          mode: 'sitemap-discovery',
          sitemapSourceCount: discovery.sourceCount,
          totalUrls,
          urls: discovery.urls,
        });
      }

      const batchUrls = discovery.urls.slice(startIndex, startIndex + batchSize);

      if (!batchUrls.length) {
        return NextResponse.json({
          ok: true,
          namespace,
          mode: 'sitemap',
          totalUrls,
          processed: 0,
          nextStartIndex: null,
          done: true,
          summary: [],
        });
      }

      const items: KnowledgeItem[] = batchUrls.map((url) => ({ type: 'url', url, label: url }));
      const summary = await ingestKnowledgeItems(namespace, items);

      const nextStartIndex = startIndex + batchUrls.length;
      const done = nextStartIndex >= totalUrls;

      return NextResponse.json({
        ok: true,
        namespace,
        mode: 'sitemap',
        sitemapSourceCount: discovery.sourceCount,
        totalUrls,
        processed: batchUrls.length,
        nextStartIndex: done ? null : nextStartIndex,
        done,
        summary,
      });
    }

    const items = (payload.items || []).filter((item) => item.type === 'url');

    if (!items.length) {
      return NextResponse.json(
        {
          error:
            'Missing ingestion items. Supported mode: URL items only (or sitemapUrl for bulk import).',
        },
        { status: 400 },
      );
    }

    const summary = await ingestKnowledgeItems(namespace, items);
    return NextResponse.json({ ok: true, namespace, mode: 'urls', processed: items.length, summary });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Ingestion failed.' }, { status: 500 });
  }
}
