"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  title: string | null;
  body: string | null;
  read: boolean;
  created_at: string | null;
  item_type?: string | null;
  item_id?: string | null;
  source?: 'notifications' | 'message' | 'request' | 'call';
};

function relativeTime(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "právě teď";
  if (minutes === 1) return "před minutou";
  if (minutes < 60) return `před ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "před hodinou";
  if (hours < 24) return `před ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "včera";
  if (days < 7) return `před ${days} dny`;
  return date.toLocaleDateString("cs-CZ");
}

export function NotificationBell({ className }: { className?: string }) {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Notification[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [lastReadAt, setLastReadAt] = useState<number | null>(null);

  const unread = useMemo(() => items.filter((n) => !n.read).length, [items]);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("beets-last-read") : null;
    if (stored) setLastReadAt(Number(stored));
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        setItems([]);
        setUserId(null);
        return;
      }
      setUserId(authData.user.id);
      const { data, error: err } = await supabase
        .from("notifications")
        .select("id,title,body,read,created_at,item_type,item_id")
        .eq("user_id", authData.user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (err) throw err;

      const base = ((data as Notification[]) ?? []).map((n) => ({ ...n, source: "notifications" as const }));

      const extras: Notification[] = [];

      // fallback: nepřečtené přímé zprávy (kdyby notifikace chyběla)
      const { data: messages } = await supabase
        .from("messages")
        .select("id,from_name,body,created_at,unread")
        .eq("to_user_id", authData.user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      (messages ?? []).forEach((m: any) => {
        extras.push({
          id: `msg-${m.id}`,
          title: m.from_name || "Nová zpráva",
          body: m.body || null,
          read: m.unread === false,
          created_at: m.created_at,
          item_type: "message",
          item_id: String(m.id),
          source: "message",
        });
      });

      // žádosti o přístup k projektům, které patří uživateli
      const { data: ownedProjects } = await supabase.from("projects").select("id,title").eq("user_id", authData.user.id);
      const ownedIds = (ownedProjects ?? []).map((p: any) => p.id);
      if (ownedIds.length) {
        const { data: reqs } = await supabase
          .from("project_access_requests")
          .select("id,project_id,requester_id,created_at,status")
          .in("project_id", ownedIds)
          .order("created_at", { ascending: false })
          .limit(50);
        const requesterIds = Array.from(new Set((reqs ?? []).map((r: any) => r.requester_id).filter(Boolean)));
        let requesterNames: Record<string, string> = {};
        if (requesterIds.length) {
          const { data: profs } = await supabase.from("profiles").select("id,display_name").in("id", requesterIds);
          requesterNames = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.display_name || "Uživatel"]));
        }
        const projectNames = Object.fromEntries((ownedProjects ?? []).map((p: any) => [p.id, p.title || "Projekt"]));
        (reqs ?? []).forEach((r: any) => {
          extras.push({
            id: `req-${r.id}`,
            title: "Žádost o přístup",
            body: `${requesterNames[r.requester_id] || "Uživatel"} žádá o přístup k ${projectNames[r.project_id] || "projektu"}`,
            read: r.status && r.status !== "pending" ? true : false,
            created_at: r.created_at,
            item_type: "project",
            item_id: String(r.project_id),
            source: "request",
          });
        });
      }

      // hovory – zobrazíme záznamy, kde je uživatel volaný nebo volající a stav není accepted
      const { data: calls } = await supabase
        .from("calls")
        .select("id,caller_id,callee_id,status,created_at")
        .or(`caller_id.eq.${authData.user.id},callee_id.eq.${authData.user.id}`)
        .order("created_at", { ascending: false })
        .limit(20);
      (calls ?? [])
        .filter((c: any) => c.status && c.status !== "accepted")
        .forEach((c: any) => {
          const isCaller = c.caller_id === authData.user.id;
          extras.push({
            id: `call-${c.id}`,
            title: c.status === "missed" ? "Zmeškaný hovor" : "Příchozí hovor",
            body: isCaller ? "Druhá strana nereaguje" : "Někdo ti volá",
            read: c.status === "accepted",
            created_at: c.created_at,
            item_type: "call",
            item_id: String(c.id),
            source: "call",
          });
        });

      const mergedMap = new Map<string, Notification>();
      [...extras, ...base].forEach((n) => {
        const existing = mergedMap.get(n.id);
        if (!existing || (existing.created_at || "") < (n.created_at || "")) {
          mergedMap.set(n.id, n);
        }
      });
      const merged = Array.from(mergedMap.values()).sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      });

      const nowReadThreshold = lastReadAt;
      const mapped = merged.slice(0, 40).map((n) => {
        const created = n.created_at ? new Date(n.created_at).getTime() : 0;
        const derivedRead = nowReadThreshold ? created <= nowReadThreshold : false;
        return { ...n, read: n.read || derivedRead };
      });

      setItems(mapped);
    } catch (err: any) {
      console.error("Chyba načítání notifikací:", err);
      setError("Nepodařilo se načíst notifikace.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchNotifications();
    const t = setInterval(fetchNotifications, 30000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (!payload.new) return;
          const newItem: Notification = {
            id: payload.new.id,
            title: payload.new.title ?? null,
            body: payload.new.body ?? null,
            read: payload.new.read ?? false,
            created_at: payload.new.created_at ?? null,
            item_type: payload.new.item_type ?? null,
            item_id: payload.new.item_id ?? null,
          };
          setItems((prev) => [newItem, ...prev.filter((n) => n.id !== newItem.id)].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [supabase, userId]);

  useEffect(() => {
    if (open) void fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const markAllRead = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      const unreadNotificationIds = items
        .filter((n) => !n.read && n.source === "notifications")
        .map((n) => n.id);

      if (unreadNotificationIds.length > 0) {
        const { error: err } = await supabase
          .from("notifications")
          .update({ read: true })
          .in("id", unreadNotificationIds)
          .eq("user_id", authData.user.id);
        if (err) throw err;
      }

      // označ i zprávy jako přečtené v DB
      await supabase.from("messages").update({ unread: false }).eq("to_user_id", authData.user.id);

      // Označ jako přečtené i lokální extra položky (messages / requests / calls),
      // které nejsou v tabulce notifications.
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      const ts = Date.now();
      setLastReadAt(ts);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("beets-last-read", String(ts));
      }
    } catch (err: any) {
      console.error("Chyba při označení přečtených:", err);
      setError("Nepodařilo se označit jako přečtené.");
    }
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white hover:border-[var(--mpc-accent)]"
        title="Notifikace"
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--mpc-accent)] px-1 text-[11px] font-semibold text-black">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-white/10 bg-[var(--mpc-panel,#0b0f15)] p-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
          <div className="mb-2 flex items-center justify-between text-sm text-[var(--mpc-light)]">
            <span>Notifikace</span>
            <div className="flex items-center gap-2 text-[11px] text-[var(--mpc-muted)]">
              {loading ? <span>Načítám…</span> : null}
              {unread > 0 && (
                <button onClick={markAllRead} className="underline hover:text-white">
                  Označit jako přečtené
                </button>
              )}
            </div>
          </div>
          {error && <p className="mb-2 text-[12px] text-red-400">{error}</p>}
          {items.length === 0 ? (
            <p className="text-[12px] text-[var(--mpc-muted)]">Žádné notifikace.</p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {items.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-[12px]",
                    n.read ? "border-[var(--mpc-dark)] bg-[var(--mpc-panel)]" : "border-[var(--mpc-accent)] bg-[var(--mpc-accent)]/10"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[var(--mpc-light)]">{n.title || "Notifikace"}</span>
                    <span className="text-[11px] text-[var(--mpc-muted)]">{relativeTime(n.created_at)}</span>
                  </div>
                  {n.body && <p className="mt-1 text-[var(--mpc-muted)]">{n.body}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
