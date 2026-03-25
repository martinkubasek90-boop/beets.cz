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

const CZECH_MONTHS: Record<string, number> = {
  ledna: 0,
  unora: 1,
  brezna: 2,
  dubna: 3,
  kvetna: 4,
  cervna: 5,
  cervence: 6,
  srpna: 7,
  zari: 8,
  rijna: 9,
  listopadu: 10,
  prosince: 11,
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

function normalizeCzechText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function parseCzechDateString(value: string) {
  const match = value
    .trim()
    .match(/^(\d{1,2})\.\s*([A-Za-zÁ-ž]+)\s+(\d{4})$/);

  if (!match) return 0;

  const day = Number(match[1]);
  const month = CZECH_MONTHS[normalizeCzechText(match[2])];
  const year = Number(match[3]);

  if (!Number.isFinite(day) || month === undefined || !Number.isFinite(year)) {
    return 0;
  }

  return new Date(year, month, day).getTime();
}

export function sortNewsItemsNewestFirst(items: ImportedNewsItem[]) {
  return [...items].sort((a, b) => {
    const byDate = parseCzechDateString(b.sourceDate) - parseCzechDateString(a.sourceDate);
    if (byDate !== 0) return byDate;
    return b.id.localeCompare(a.id);
  });
}
