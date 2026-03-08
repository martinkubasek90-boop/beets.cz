type EventParams = Record<string, string | number | boolean | undefined>;
const MEMODO_VARIANT_KEY = "memodo_ab_variant_v1";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackMemodoEvent(event: string, params: EventParams = {}) {
  if (typeof window === "undefined") return;
  if (typeof window.gtag === "function") {
    window.gtag("event", event, {
      app_section: "memodo",
      ...params,
    });
  }

  const payload = JSON.stringify({ event, params: { app_section: "memodo", ...params } });
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/memodo/events", blob);
      return;
    }
  } catch {
    // Fall through to fetch.
  }

  void fetch("/api/memodo/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}

export function getMemodoExperimentVariant() {
  if (typeof window === "undefined") return "a";
  const existing = window.localStorage.getItem(MEMODO_VARIANT_KEY);
  if (existing === "a" || existing === "b") return existing;
  const next = Math.random() < 0.5 ? "a" : "b";
  window.localStorage.setItem(MEMODO_VARIANT_KEY, next);
  trackMemodoEvent("memodo_ab_variant_assigned", { variant: next });
  return next;
}
