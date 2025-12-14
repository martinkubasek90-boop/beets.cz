"use client";

import { useState } from "react";

export function ShareButton({ itemType, itemId }: { itemType: 'beat' | 'project'; itemId: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleShare = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_type: itemType, item_id: itemId, expires_in_hours: 72 }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      if (json?.url && navigator?.clipboard) {
        await navigator.clipboard.writeText(json.url);
        setMsg('Odkaz zkopírován do schránky.');
      } else if (json?.url) {
        setMsg(json.url);
      }
    } catch (err) {
      console.error(err);
      setMsg('Nepodařilo se vytvořit odkaz.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => void handleShare()}
        disabled={loading}
        className="inline-flex items-center justify-center rounded-full border border-[var(--mpc-accent)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-black disabled:opacity-60"
      >
        {loading ? 'Vytvářím…' : 'Sdílet'}
      </button>
      {msg && <span className="text-[11px] text-[var(--mpc-muted)]">{msg}</span>}
    </div>
  );
}
