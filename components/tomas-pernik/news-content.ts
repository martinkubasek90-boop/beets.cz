export type ImportedNewsItem = {
  id: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceDate: string;
  sourceExcerpt: string;
  imageUrl: string;
  rewrittenTitle: string;
  rewrittenExcerpt: string;
  rewrittenBody: string;
  status: "draft" | "published";
};

export type NewsContent = {
  items: ImportedNewsItem[];
};

export const NEWS_STORAGE_KEY = "tomas-pernik-news-v1";

export const defaultNewsContent: NewsContent = {
  items: [],
};

export function cloneDefaultNewsContent() {
  return JSON.parse(JSON.stringify(defaultNewsContent)) as NewsContent;
}

export function loadNewsContent() {
  if (typeof window === "undefined") {
    return cloneDefaultNewsContent();
  }

  try {
    const raw = window.localStorage.getItem(NEWS_STORAGE_KEY);
    if (!raw) {
      return cloneDefaultNewsContent();
    }
    const parsed = JSON.parse(raw) as NewsContent;
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
    };
  } catch {
    return cloneDefaultNewsContent();
  }
}

export function saveNewsContent(content: NewsContent) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NEWS_STORAGE_KEY, JSON.stringify(content));
}
