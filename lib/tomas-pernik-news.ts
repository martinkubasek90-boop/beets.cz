import { createClient } from "@supabase/supabase-js";
import {
  defaultNewsContent,
  type ImportedNewsItem,
  type NewsContent,
} from "@/components/tomas-pernik/news-content";

type NewsRow = {
  key: string;
  content: NewsContent;
  updated_at: string;
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function sanitizeNewsContent(raw: unknown): NewsContent {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const items = Array.isArray(source.items) ? source.items : [];

  const sanitizedItems: ImportedNewsItem[] = items
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"))
      .map((item, index) => ({
        id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : `news-${index + 1}`,
        sourceUrl: typeof item.sourceUrl === "string" ? item.sourceUrl.trim() : "",
        sourceTitle: typeof item.sourceTitle === "string" ? item.sourceTitle.trim() : "",
        sourceDate: typeof item.sourceDate === "string" ? item.sourceDate.trim() : "",
        sourceExcerpt: typeof item.sourceExcerpt === "string" ? item.sourceExcerpt.trim() : "",
        imageUrl: typeof item.imageUrl === "string" ? item.imageUrl.trim() : "",
        rewrittenTitle: typeof item.rewrittenTitle === "string" ? item.rewrittenTitle.trim() : "",
        rewrittenExcerpt: typeof item.rewrittenExcerpt === "string" ? item.rewrittenExcerpt.trim() : "",
        rewrittenBody: typeof item.rewrittenBody === "string" ? item.rewrittenBody.trim() : "",
        status: (item.status === "published" ? "published" : "draft") as ImportedNewsItem["status"],
      }))
      .filter((item) => item.sourceUrl && item.sourceTitle);

  return { items: sanitizedItems };
}

export async function getTomasPernikNewsContent(): Promise<NewsContent> {
  const supabase = getServiceClient();
  if (!supabase) return defaultNewsContent;

  const { data, error } = await supabase
    .from("tomas_pernik_news")
    .select("key,content,updated_at")
    .eq("key", "default")
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return defaultNewsContent;
  }

  return sanitizeNewsContent((data as NewsRow).content);
}

export async function saveTomasPernikNewsContent(input: NewsContent): Promise<NewsContent> {
  const supabase = getServiceClient();
  const payload = sanitizeNewsContent(input);

  if (!supabase) {
    return payload;
  }

  const { error } = await supabase.from("tomas_pernik_news").upsert(
    {
      key: "default",
      content: payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );

  if (error) {
    throw new Error(error.message);
  }

  return payload;
}
