import { NextResponse } from "next/server";
import { discoverUrlsFromSitemap, ingestKnowledgeItems, type KnowledgeItem } from "@/lib/bess-knowledge";

export const runtime = "nodejs";

type IngestPayload = {
  sitemapUrl?: string;
  discoverOnly?: boolean;
  startIndex?: number;
  batchSize?: number;
  maxUrls?: number;
  items?: KnowledgeItem[];
};

function isAuthorized(request: Request) {
  const expected = process.env.MEMODO_ADMIN_TOKEN || process.env.MEMODO_AI_ADMIN_TOKEN;
  if (!expected) return true;
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token === expected;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as IngestPayload;
  const namespace = "memodo";

  try {
    if (payload.sitemapUrl?.trim()) {
      const startIndex = Math.max(0, Math.floor(payload.startIndex ?? 0));
      const batchSize = Math.min(200, Math.max(10, Math.floor(payload.batchSize ?? 60)));
      const maxUrls = Math.min(1500, Math.max(1, Math.floor(payload.maxUrls ?? 1500)));

      const discovery = await discoverUrlsFromSitemap(payload.sitemapUrl.trim(), {
        maxUrls,
        allowedHosts: ["memodo.cz", "www.memodo.cz"],
      });
      const totalUrls = discovery.urls.length;

      if (payload.discoverOnly) {
        return NextResponse.json({
          ok: true,
          namespace,
          mode: "sitemap-discovery",
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
          mode: "sitemap",
          totalUrls,
          processed: 0,
          nextStartIndex: null,
          done: true,
          summary: [],
        });
      }

      const items: KnowledgeItem[] = batchUrls.map((url) => ({ type: "url", url, label: url }));
      const summary = await ingestKnowledgeItems(namespace, items);
      const nextStartIndex = startIndex + batchUrls.length;
      const done = nextStartIndex >= totalUrls;

      return NextResponse.json({
        ok: true,
        namespace,
        mode: "sitemap",
        totalUrls,
        processed: batchUrls.length,
        nextStartIndex: done ? null : nextStartIndex,
        done,
        summary,
      });
    }

    const items = payload.items || [];
    if (!items.length) {
      return NextResponse.json(
        { error: "Missing ingestion items. Provide sitemapUrl or items[]" },
        { status: 400 },
      );
    }

    const summary = await ingestKnowledgeItems(namespace, items);
    return NextResponse.json({ ok: true, namespace, mode: "items", processed: items.length, summary });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Ingestion failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

