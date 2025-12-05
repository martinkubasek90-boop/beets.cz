"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type FireButtonProps = {
  itemType: "beat" | "project";
  itemId: string;
  className?: string;
};

const weekStartIso = () => {
  const now = new Date();
  const day = now.getUTCDay(); // 0-6, Sunday = 0
  const diff = (day + 6) % 7; // shift so Monday is start
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
  return monday.toISOString().slice(0, 10);
};

export function FireButton({ itemType, itemId, className }: FireButtonProps) {
  const supabase = createClient();
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [usedThisWeek, setUsedThisWeek] = useState<number>(0);

  const flameSize = useMemo(() => {
    if (count >= 10) return "h-12 w-12";
    if (count >= 5) return "h-10 w-10";
    if (count >= 2) return "h-8 w-8";
    return "h-7 w-7";
  }, [count]);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id || null;

        const { data: total, error: totalErr } = await supabase
          .from("fires")
          .select("id", { count: "exact" })
          .eq("item_type", itemType)
          .eq("item_id", itemId);
        if (totalErr) throw totalErr;
        setCount(total?.length ?? 0);

        if (userId) {
          const week = weekStartIso();
          const { data: weekly, error: weeklyErr } = await supabase
            .from("fires")
            .select("id", { count: "exact" })
            .eq("user_id", userId)
            .eq("week_start", week);
          if (weeklyErr) throw weeklyErr;
          setUsedThisWeek(weekly?.length ?? 0);
        }
      } catch (err: any) {
        console.error("Chyba načítání ohňů:", err);
        setError("Nepodařilo se načíst ohně.");
      }
    };
    void load();
  }, [supabase, itemId, itemType]);

  const handleClick = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();
      if (userErr) throw userErr;
      if (!user) {
        setError("Pro přidání ohně se přihlas.");
        return;
      }

      // Limit 10 ohňů týdně
      const week = weekStartIso();
      const { data: weekly, error: weeklyErr } = await supabase
        .from("fires")
        .select("id", { count: "exact" })
        .eq("user_id", user.id)
        .eq("week_start", week);
      if (weeklyErr) throw weeklyErr;
      const already = weekly?.length ?? 0;
      if (already >= 10) {
        setError("Vyčerpal(a) jsi limit 10 ohňů pro tento týden.");
        return;
      }

      const { error: insertErr } = await supabase.from("fires").insert({
        user_id: user.id,
        item_type: itemType,
        item_id: itemId,
      });
      if (insertErr) throw insertErr;

      setCount((c) => c + 1);
      setUsedThisWeek(already + 1);
      setSuccess("Přidán oheň!");
    } catch (err: any) {
      console.error("Chyba při přidání ohně:", err);
      setError(err?.message || "Nepodařilo se přidat oheň.");
    } finally {
      setLoading(false);
      setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 2000);
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-1 text-center", className)}>
      <button
        onClick={handleClick}
        disabled={loading || usedThisWeek >= 10}
        className={cn(
          "flex items-center justify-center rounded-full border border-white/10 bg-white/5 text-orange-400 transition hover:bg-orange-500/20 disabled:opacity-50",
          flameSize
        )}
        title="Přidat oheň"
      >
        🔥
      </button>
      <div className="h-2 w-2 rounded-full bg-orange-500" style={{ transform: `scale(${1 + Math.min(count, 10) / 10})` }} />
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      {success && <p className="text-[11px] text-green-400">{success}</p>}
    </div>
  );
}
