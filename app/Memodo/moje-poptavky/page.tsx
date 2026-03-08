"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock3, Trash2 } from "lucide-react";
import { MemodoViewTracker } from "@/components/memodo/mobile-ux";
import {
  clearMemodoInquiryHistory,
  getMemodoInquiryHistory,
  normalizeMemodoEmail,
  type MemodoInquiryHistoryItem,
} from "@/lib/memodo-inquiry-history";

type PriceAccessResponse = {
  ok: boolean;
  canSeePrices: boolean;
  email: string | null;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("cs-CZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MemodoInquiryHistoryPage() {
  const [email, setEmail] = useState("");
  const [items, setItems] = useState<MemodoInquiryHistoryItem[]>([]);

  useEffect(() => {
    fetch("/api/memodo/price-access", { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as PriceAccessResponse | null;
        if (!response.ok || !payload?.ok || !payload.email) return;
        const normalized = normalizeMemodoEmail(payload.email);
        setEmail(normalized);
        setItems(getMemodoInquiryHistory(normalized));
      })
      .catch(() => {
        // History page can still render without resolved email.
      });
  }, []);

  const hasItems = useMemo(() => items.length > 0, [items]);

  return (
    <div className="space-y-4 px-4 py-6">
      <MemodoViewTracker page="inquiry_history" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Moje poptávky</h1>
          <p className="mt-1 text-sm text-gray-500">Historie poptávek pro váš e-mail v této aplikaci.</p>
          {email ? <p className="mt-1 text-xs font-semibold text-gray-600">{email}</p> : null}
        </div>
        {hasItems && email ? (
          <button
            type="button"
            onClick={() => {
              clearMemodoInquiryHistory(email);
              setItems([]);
            }}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700"
          >
            <Trash2 className="h-4 w-4" />
            Vymazat
          </button>
        ) : null}
      </div>

      {!email ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
          Pro historii poptávek nejdřív zadejte e-mail nahoře v aplikaci.
        </div>
      ) : null}

      {email && !hasItems ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-8 text-center">
          <Clock3 className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-semibold text-gray-700">Zatím žádné poptávky</p>
          <p className="mt-1 text-xs text-gray-500">Po odeslání první poptávky ji uvidíte tady.</p>
          <Link
            href="/Memodo/poptavka"
            className="mt-4 inline-flex min-h-[44px] items-center rounded-xl bg-[#FFE500] px-4 py-2 text-sm font-black text-black"
          >
            Vytvořit poptávku
          </Link>
        </div>
      ) : null}

      {hasItems ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-gray-900">{item.contactName || "Poptávka"}</p>
                <p className="text-[11px] font-semibold text-gray-500">{formatDate(item.createdAt)}</p>
              </div>
              {item.company ? <p className="mt-1 text-xs text-gray-600">{item.company}</p> : null}
              <p className="mt-2 text-xs text-gray-600">{item.message}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500">
                {item.productInterest ? (
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1">{item.productInterest}</span>
                ) : null}
                {item.productId ? (
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1">Produkt: {item.productId}</span>
                ) : null}
                {item.batteryId ? (
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1">Set: {item.batteryId}</span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
