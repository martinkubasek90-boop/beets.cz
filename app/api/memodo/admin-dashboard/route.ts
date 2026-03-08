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
  analytics?: {
    eventsTracked: boolean;
    periodDays: number;
    funnel: {
      views: number;
      searches: number;
      productDetailOpens: number;
      inquiryAttempts: number;
      inquirySuccess: number;
      aiMessages: number;
    };
    topSearches: Array<{ query: string; count: number }>;
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

  const sinceIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: eventRows, error: eventsError } = await supabase
    .from("memodo_events")
    .select("event_name,payload,created_at")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(5000);

  let analytics: DashboardPayload["analytics"] | undefined;
  if (!eventsError && Array.isArray(eventRows)) {
    let views = 0;
    let searches = 0;
    let detail = 0;
    let attempt = 0;
    let success = 0;
    let aiMessages = 0;
    const searchCounts = new Map<string, number>();

    for (const row of eventRows as Array<{ event_name: string; payload: Record<string, unknown> | null }>) {
      const eventName = row.event_name;
      const payload = row.payload || {};
      if (eventName === "memodo_view_page") views += 1;
      if (eventName === "memodo_funnel_search") {
        searches += 1;
        const queryValue = typeof payload.query === "string" ? payload.query.trim().toLowerCase() : "";
        if (queryValue) searchCounts.set(queryValue, (searchCounts.get(queryValue) || 0) + 1);
      }
      if (eventName === "memodo_open_product_detail") detail += 1;
      if (eventName === "memodo_submit_inquiry_attempt") attempt += 1;
      if (eventName === "memodo_submit_inquiry_success") success += 1;
      if (eventName === "memodo_ai_message_sent") aiMessages += 1;
    }

    const topSearches = [...searchCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([query, count]) => ({ query, count }));

    analytics = {
      eventsTracked: true,
      periodDays: 30,
      funnel: {
        views,
        searches,
        productDetailOpens: detail,
        inquiryAttempts: attempt,
        inquirySuccess: success,
        aiMessages,
      },
      topSearches,
    };
  } else {
    analytics = {
      eventsTracked: false,
      periodDays: 30,
      funnel: {
        views: 0,
        searches: 0,
        productDetailOpens: 0,
        inquiryAttempts: 0,
        inquirySuccess: 0,
        aiMessages: 0,
      },
      topSearches: [],
    };
  }

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
    analytics,
  };

  return NextResponse.json({ ok: true, dashboard: payload });
}
