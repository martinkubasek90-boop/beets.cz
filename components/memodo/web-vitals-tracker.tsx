"use client";

import { useEffect } from "react";
import { trackMemodoEvent } from "@/lib/memodo-analytics";

const budgets = {
  lcp: 2500,
  cls: 0.1,
};

export function MemodoWebVitalsTracker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("PerformanceObserver" in window)) return;

    let clsValue = 0;
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (!last) return;
      const lcp = Math.round(last.startTime);
      if (lcp > budgets.lcp) {
        trackMemodoEvent("memodo_perf_budget_exceeded", { metric: "LCP", value: lcp, budget: budgets.lcp });
      }
    });

    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as Array<PerformanceEntry & { value?: number; hadRecentInput?: boolean }>) {
        if (!entry.hadRecentInput) clsValue += entry.value || 0;
      }
      if (clsValue > budgets.cls) {
        trackMemodoEvent("memodo_perf_budget_exceeded", {
          metric: "CLS",
          value: Number(clsValue.toFixed(3)),
          budget: budgets.cls,
        });
      }
    });

    try {
      lcpObserver.observe({ type: "largest-contentful-paint", buffered: true });
      clsObserver.observe({ type: "layout-shift", buffered: true });
    } catch {
      // Ignore unsupported metrics.
    }

    return () => {
      lcpObserver.disconnect();
      clsObserver.disconnect();
    };
  }, []);

  return null;
}
