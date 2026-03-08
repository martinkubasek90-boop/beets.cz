export type MemodoInquiryHistoryItem = {
  id: string;
  createdAt: string;
  email: string;
  contactName: string;
  company?: string;
  phone?: string;
  productInterest?: string;
  productId?: string;
  batteryId?: string;
  estimatedQuantity?: number;
  message: string;
};

const HISTORY_KEY_PREFIX = "memodo_inquiry_history_v1:";
const MAX_HISTORY_ITEMS = 40;

export function normalizeMemodoEmail(value: string) {
  return value.trim().toLowerCase();
}

function keyForEmail(email: string) {
  return `${HISTORY_KEY_PREFIX}${normalizeMemodoEmail(email)}`;
}

export function getMemodoInquiryHistory(email: string): MemodoInquiryHistoryItem[] {
  if (typeof window === "undefined") return [];
  const normalizedEmail = normalizeMemodoEmail(email);
  if (!normalizedEmail) return [];

  const raw = window.localStorage.getItem(keyForEmail(normalizedEmail));
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as MemodoInquiryHistoryItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => Boolean(item?.id && item?.message && item?.createdAt))
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  } catch {
    return [];
  }
}

export function addMemodoInquiryHistoryItem(email: string, item: MemodoInquiryHistoryItem) {
  if (typeof window === "undefined") return;
  const normalizedEmail = normalizeMemodoEmail(email);
  if (!normalizedEmail) return;

  const current = getMemodoInquiryHistory(normalizedEmail);
  const next = [item, ...current].slice(0, MAX_HISTORY_ITEMS);
  window.localStorage.setItem(keyForEmail(normalizedEmail), JSON.stringify(next));
}

export function clearMemodoInquiryHistory(email: string) {
  if (typeof window === "undefined") return;
  const normalizedEmail = normalizeMemodoEmail(email);
  if (!normalizedEmail) return;
  window.localStorage.removeItem(keyForEmail(normalizedEmail));
}
