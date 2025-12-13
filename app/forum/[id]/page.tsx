"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MainNav } from "@/components/main-nav";

type Thread = {
  id: string;
  title: string;
  author: string | null;
  body?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type Post = {
  id: string;
  author: string | null;
  body: string;
  created_at?: string | null;
};

export default function ForumThreadPage() {
  const supabase = createClient();
  const params = useParams();
  const threadId = params?.id as string;
  const [thread, setThread] = useState<Thread | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!threadId) return;
      setLoading(true);
      setError(null);
      try {
        const { data: th, error: thErr } = await supabase
          .from("forum_threads")
          .select("id, title, author, body, updated_at, created_at")
          .eq("id", threadId)
          .maybeSingle();
        if (thErr) throw thErr;
        setThread((th as any) || null);

        const { data: ps, error: pErr } = await supabase
          .from("forum_posts")
          .select("id, author, body, created_at")
          .eq("thread_id", threadId)
          .order("created_at", { ascending: true });
        if (pErr) throw pErr;
        setPosts((ps as any[]) || []);
      } catch (err: any) {
        console.error("Chyba načítání vlákna:", err);
        setError("Nepodařilo se načíst vlákno.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [supabase, threadId]);

  const handleReport = async () => {
    if (!threadId) return;
    setReporting(true);
    try {
      await supabase.from("forum_reports").insert({ thread_id: threadId, reason: "Uživatel nahlásil" });
      alert("Nahlášení odesláno moderátorům.");
    } catch (err) {
      console.error("Nahlášení selhalo:", err);
      alert("Nepodařilo se nahlásit příspěvek.");
    } finally {
      setReporting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--mpc-deck,#050505)] text-white">
      <MainNav />
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Fórum</p>
            <h1 className="text-2xl font-semibold">{thread?.title || "Vlákno"}</h1>
            {thread?.author && <p className="text-[12px] text-[var(--mpc-muted)]">Autor: {thread.author}</p>}
          </div>
          <Link
            href="/forum"
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[12px] uppercase tracking-[0.14em] text-white hover:border-[var(--mpc-accent)]"
          >
            Zpět na fórum
          </Link>
        </div>

        {error && <div className="rounded-md border border-red-700/50 bg-red-900/30 px-3 py-2 text-sm text-red-200">{error}</div>}
        {loading ? (
          <p className="text-sm text-[var(--mpc-muted)]">Načítám…</p>
        ) : thread ? (
          <>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
              <p className="whitespace-pre-line text-sm text-[var(--mpc-light)]">{thread.body || 'Bez obsahu.'}</p>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--mpc-muted)]">
                <span>Vytvořeno: {thread.created_at ? new Date(thread.created_at).toLocaleString('cs-CZ') : '—'}</span>
                {thread.updated_at && <span>· Aktualizováno: {new Date(thread.updated_at).toLocaleString('cs-CZ')}</span>}
                <button
                  onClick={() => void handleReport()}
                  disabled={reporting}
                  className="ml-auto rounded-full border border-red-400 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-red-200 hover:bg-red-500/10 disabled:opacity-60"
                >
                  {reporting ? 'Odesílám…' : 'Nahlásit'}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {posts.length === 0 ? (
                <p className="text-[12px] text-[var(--mpc-muted)]">Zatím žádné odpovědi.</p>
              ) : (
                posts.map((p) => (
                  <div key={p.id} className="rounded-lg border border-white/10 bg-black/40 px-4 py-3">
                    <div className="mb-1 flex items-center justify-between text-[11px] text-[var(--mpc-muted)]">
                      <span>{p.author || 'Anonym'}</span>
                      <span>{p.created_at ? new Date(p.created_at).toLocaleString('cs-CZ') : ''}</span>
                    </div>
                    <p className="whitespace-pre-line text-sm text-[var(--mpc-light)]">{p.body}</p>
                  </div>
                ))
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--mpc-muted)]">Vlákno nenalezeno.</p>
        )}
      </div>
    </main>
  );
}
