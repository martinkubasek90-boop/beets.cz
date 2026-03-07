import { NextResponse } from "next/server";
import { getMemodoServiceClient } from "@/lib/memodo-catalog";
import { parseMemodoProductsFromXml } from "@/lib/memodo-xml";

export const runtime = "nodejs";

type ImportPayload = {
  feedUrl?: string;
  xml?: string;
  dryRun?: boolean;
  deactivateMissing?: boolean;
  startIndex?: number;
  batchSize?: number;
  syncStartedAt?: string;
  finalize?: boolean;
};

function isAuthorized(request: Request) {
  const expected = process.env.MEMODO_FEED_IMPORT_TOKEN;
  if (!expected) return true;
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  return token === expected;
}

async function resolveXmlPayload(body: ImportPayload) {
  if (body.xml?.trim()) return body.xml;

  const feedUrl = body.feedUrl?.trim() || process.env.MEMODO_XML_FEED_URL;
  if (!feedUrl) {
    throw new Error("Missing XML payload. Provide xml body or MEMODO_XML_FEED_URL.");
  }

  const response = await fetch(feedUrl, {
    method: "GET",
    headers: {
      "User-Agent": "BEETS-Memodo-Importer/1.0",
      Accept: "application/xml,text/xml,text/plain;q=0.9,*/*;q=0.8",
    },
    signal: AbortSignal.timeout(25000),
  });

  if (!response.ok) {
    throw new Error(`Feed download failed (${response.status}).`);
  }

  return response.text();
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as ImportPayload;

  try {
    const xml = await resolveXmlPayload(body);
    const parsed = parseMemodoProductsFromXml(xml);
    if (!parsed.length) {
      return NextResponse.json(
        { error: "No products parsed from XML feed. Check feed structure mapping." },
        { status: 400 },
      );
    }

    if (body.dryRun) {
      const recommendedBatchSize = Math.min(1000, Math.max(200, Number(process.env.MEMODO_IMPORT_BATCH_SIZE || 800)));
      return NextResponse.json({
        ok: true,
        dryRun: true,
        parsedCount: parsed.length,
        recommendedBatchSize,
        estimatedBatches: Math.ceil(parsed.length / recommendedBatchSize),
        sample: parsed.slice(0, 5),
      });
    }

    const supabase = getMemodoServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Missing Supabase service role credentials for import." },
        { status: 500 },
      );
    }

    const syncStartedAt = body.syncStartedAt || new Date().toISOString();
    const startIndex = Math.max(0, Math.floor(body.startIndex || 0));
    const batchSize = Math.min(
      5000,
      Math.max(100, Math.floor(body.batchSize || Number(process.env.MEMODO_IMPORT_BATCH_SIZE || 800))),
    );
    const slice = parsed.slice(startIndex, startIndex + batchSize);
    const done = startIndex + slice.length >= parsed.length;

    const rows = slice.map((item) => ({
      external_id: item.id,
      name: item.name,
      category: item.category,
      brand: item.brand || null,
      price: item.price ?? null,
      price_with_vat: item.price_with_vat ?? null,
      image_url: item.image_url || null,
      description: item.description || null,
      specifications: item.specifications || {},
      art_number: item.art_number || null,
      in_stock: item.in_stock ?? true,
      is_promo: item.is_promo ?? false,
      promo_label: item.promo_label || null,
      original_price: item.original_price ?? null,
      is_active: true,
      raw_payload: item.raw,
      updated_at: syncStartedAt,
    }));

    const upsertChunkSize = Math.min(
      2000,
      Math.max(100, Math.floor(Number(process.env.MEMODO_IMPORT_UPSERT_CHUNK || 500))),
    );

    for (let i = 0; i < rows.length; i += upsertChunkSize) {
      const chunk = rows.slice(i, i + upsertChunkSize);
      const { error: upsertError } = await supabase.from("memodo_products").upsert(chunk, {
        onConflict: "external_id",
      });
      if (upsertError) {
        throw new Error(`Upsert failed: ${upsertError.message}`);
      }
    }

    let deactivatedCount = 0;
    const deactivateMissing = body.deactivateMissing !== false;
    const shouldFinalize = Boolean(body.finalize) || done;

    if (deactivateMissing && shouldFinalize) {
      const { data: staleRows, error: staleError } = await supabase
        .from("memodo_products")
        .select("external_id")
        .eq("is_active", true)
        .lt("updated_at", syncStartedAt);

      if (staleError) throw new Error(`Failed to load stale products: ${staleError.message}`);

      const staleIds = (staleRows || []).map((row) => row.external_id as string);
      for (let i = 0; i < staleIds.length; i += 500) {
        const batch = staleIds.slice(i, i + 500);
        if (!batch.length) continue;
        const { error: deactivateError } = await supabase
          .from("memodo_products")
          .update({ is_active: false })
          .in("external_id", batch);
        if (deactivateError) throw new Error(`Deactivate failed: ${deactivateError.message}`);
      }
      deactivatedCount = staleIds.length;
    }

    return NextResponse.json({
      ok: true,
      parsedCount: parsed.length,
      processedCount: rows.length,
      startIndex,
      batchSize,
      nextStartIndex: done ? null : startIndex + rows.length,
      done,
      syncStartedAt,
      finalized: shouldFinalize,
      deactivatedCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Import failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
