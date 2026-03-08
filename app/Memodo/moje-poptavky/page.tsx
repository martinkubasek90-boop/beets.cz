"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock3, Trash2 } from "lucide-react";
import { MemodoViewTracker } from "@/components/memodo/mobile-ux";

type InquiryItem = {
  id: number;
  created_at: string;
  email: string;
  contact_name: string;
  company: string | null;
  phone: string | null;
  product_interest: string | null;
  message: string;
  estimated_quantity: number | null;
  product_id: string | null;
  battery_id: string | null;
  hubspot_contact_id: string | null;
  hubspot_deal_id: string | null;
};

type InquiriesResponse = {
  ok: boolean;
  email?: string;
  total?: number;
  items?: InquiryItem[];
  error?: string;
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
  const [items, setItems] = useState<InquiryItem[]>([]);
  const [error, setError] = useState("");

  const loadHistory = async () => {
    setError("");
    try {
      const response = await fetch("/api/memodo/inquiries?limit=50", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as InquiriesResponse | null;
      if (!response.ok || !payload?.ok) {
        setError(payload?.error || "Historii poptávek se nepodařilo načíst.");
        setItems([]);
        setEmail("");
        return;
      }
      setEmail(payload.email || "");
      setItems(payload.items || []);
    } catch {
      setError("Historii poptávek se nepodařilo načíst.");
      setItems([]);
      setEmail("");
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const hasItems = useMemo(() => items.length > 0, [items]);

  return (
    <div className="space-y-4 px-4 py-6">
      <MemodoViewTracker page="inquiry_history" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Moje poptávky</h1>
          <p className="mt-1 text-sm text-gray-500">Historie poptávek svázaná s vaším e-mailem.</p>
          {email ? <p className="mt-1 text-xs font-semibold text-gray-600">{email}</p> : null}
        </div>
        {hasItems && email ? (
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/memodo/inquiries", { method: "DELETE" });
              await loadHistory();
            }}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700"
          >
            <Trash2 className="h-4 w-4" />
            Vymazat
          </button>
        ) : null}
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">{error}</div> : null}

      {!error && !email ? (
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
                <p className="text-sm font-bold text-gray-900">{item.contact_name || "Poptávka"}</p>
                <p className="text-[11px] font-semibold text-gray-500">{formatDate(item.created_at)}</p>
              </div>
              {item.company ? <p className="mt-1 text-xs text-gray-600">{item.company}</p> : null}
              <p className="mt-2 text-xs text-gray-600">{item.message}</p>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-500">
                {item.product_interest ? (
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1">{item.product_interest}</span>
                ) : null}
                {item.product_id ? (
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1">Produkt: {item.product_id}</span>
                ) : null}
                {item.battery_id ? (
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1">Set: {item.battery_id}</span>
                ) : null}
                {item.hubspot_deal_id ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-emerald-700">
                    HubSpot deal: {item.hubspot_deal_id}
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
