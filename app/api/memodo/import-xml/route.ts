import { NextResponse } from "next/server";
import { getMemodoServiceClient } from "@/lib/memodo-catalog";
import { parseMemodoProductsFromXml } from "@/lib/memodo-xml";

export const runtime = "nodejs";

type ImportPayload = {
  feedUrl?: string;
  xml?: string;
  dryRun?: boolean;
  deactivateMissing?: boolean;
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
      return NextResponse.json({
        ok: true,
        dryRun: true,
        parsedCount: parsed.length,
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

    const now = new Date().toISOString();
    const rows = parsed.map((item) => ({
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
      updated_at: now,
    }));

    const { error: upsertError } = await supabase.from("memodo_products").upsert(rows, {
      onConflict: "external_id",
    });
    if (upsertError) {
      throw new Error(`Upsert failed: ${upsertError.message}`);
    }

    let deactivatedCount = 0;
    const deactivateMissing = body.deactivateMissing !== false;
    if (deactivateMissing) {
      const importedSet = new Set(parsed.map((item) => item.id));
      const { data: activeRows, error: activeError } = await supabase
        .from("memodo_products")
        .select("external_id")
        .eq("is_active", true);

      if (activeError) {
        throw new Error(`Failed to load current active products: ${activeError.message}`);
      }

      const toDeactivate = (activeRows || [])
        .map((row) => row.external_id as string)
        .filter((id) => !importedSet.has(id));

      for (let i = 0; i < toDeactivate.length; i += 200) {
        const batch = toDeactivate.slice(i, i + 200);
        if (!batch.length) continue;

        const { error: deactivateError } = await supabase
          .from("memodo_products")
          .update({ is_active: false, updated_at: now })
          .in("external_id", batch);

        if (deactivateError) {
          throw new Error(`Deactivate failed: ${deactivateError.message}`);
        }
      }
      deactivatedCount = toDeactivate.length;
    }

    return NextResponse.json({
      ok: true,
      importedCount: parsed.length,
      deactivatedCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Import failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

