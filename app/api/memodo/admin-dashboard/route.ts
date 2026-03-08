import { NextResponse } from "next/server";
import { getMemodoServiceClient } from "@/lib/memodo-catalog";
import { getMemodoAdminConfig } from "@/lib/memodo-admin-config";

export const runtime = "nodejs";

type DashboardPayload = {
  productsActive: number;
  productsInStock: number;
  productsPromo: number;
  productsWithImage: number;
  kbSources: number;
  lastProductUpdate: string | null;
  checks: {
    hubspotToken: boolean;
    xmlFeedUrl: boolean;
    importTokenProtected: boolean;
  };
  ai: {
    enabled: boolean;
    shopping: boolean;
    technical: boolean;
  };
};

async function countWithFilter(
  table: string,
  apply?: (builder: any) => any,
) {
  const supabase = getMemodoServiceClient();
  if (!supabase) return 0;

  let query = supabase.from(table).select("external_id", { count: "exact", head: true });
  if (apply) query = apply(query);
  const { count } = await query;
  return count || 0;
}

export async function GET() {
  const supabase = getMemodoServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Missing Supabase service credentials for dashboard." },
      { status: 500 },
    );
  }

  const [config, productsActive, productsInStock, productsPromo, productsWithImage, kbSourcesResult, lastUpdate] =
    await Promise.all([
      getMemodoAdminConfig(),
      countWithFilter("memodo_products", (q) => q.eq("is_active", true)),
      countWithFilter("memodo_products", (q) => q.eq("is_active", true).eq("in_stock", true)),
      countWithFilter("memodo_products", (q) => q.eq("is_active", true).eq("is_promo", true)),
      countWithFilter("memodo_products", (q) => q.eq("is_active", true).not("image_url", "is", null)),
      supabase
        .from("bess_knowledge_sources")
        .select("id", { count: "exact", head: true })
        .eq("namespace", "memodo"),
      supabase
        .from("memodo_products")
        .select("updated_at")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const payload: DashboardPayload = {
    productsActive,
    productsInStock,
    productsPromo,
    productsWithImage,
    kbSources: kbSourcesResult.count || 0,
    lastProductUpdate: (lastUpdate.data as { updated_at?: string } | null)?.updated_at || null,
    checks: {
      hubspotToken: Boolean(process.env.HUBSPOT_PRIVATE_APP_TOKEN),
      xmlFeedUrl: Boolean(process.env.MEMODO_XML_FEED_URL),
      importTokenProtected: Boolean(process.env.MEMODO_FEED_IMPORT_TOKEN),
    },
    ai: {
      enabled: config.aiSearchEnabled,
      shopping: config.shoppingChatbotEnabled,
      technical: config.technicalAdvisorEnabled,
    },
  };

  return NextResponse.json({ ok: true, dashboard: payload });
}
