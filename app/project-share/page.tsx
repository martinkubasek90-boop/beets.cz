'use client';

import { useEffect, useState } from 'react';
import { MainNav } from '@/components/main-nav';
import { createClient } from '@/lib/supabase/client';

type ProjectRow = {
  id: string;
  title: string | null;
  cover_url?: string | null;
};

export default function ProjectSharePage() {
  const supabase = createClient();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const [expiresHours, setExpiresHours] = useState('72');
  const [allowDownload, setAllowDownload] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      setAuthReady(true);
    });
    return () => {
      alive = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;
    const loadProjects = async () => {
      const { data, error: loadError } = await supabase
        .from('projects')
        .select('id,title,cover_url')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (loadError) {
        setError('Nepodařilo se načíst projekty.');
        return;
      }
      setProjects(data || []);
      if (data && data.length && !projectId) {
        setProjectId(data[0].id);
      }
    };
    loadProjects();
  }, [supabase, userId, projectId]);

  const handleCreate = async () => {
    if (!projectId) {
      setError('Vyber projekt.');
      return;
    }
    setError(null);
    setShareUrl(null);
    setLoading(true);
    try {
      const expires = Math.max(1, Number(expiresHours || 72));
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: 'project',
          item_id: projectId,
          allow_download: allowDownload,
          expires_in_hours: expires,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Nepodařilo se vytvořit odkaz.');
      }
      const json = await res.json();
      setShareUrl(json.url);
      if (json?.url && navigator?.clipboard) {
        await navigator.clipboard.writeText(json.url);
      }
    } catch (err: any) {
      setError(err?.message || 'Nepodařilo se vytvořit odkaz.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--mpc-deck,#050505)] text-white">
      <MainNav />
      <section className="mx-auto max-w-5xl px-4 pb-16 pt-10">
        <div className="rounded-3xl border border-white/10 bg-[var(--mpc-panel)] p-8 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.8)]">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.45em] text-[var(--mpc-muted)]">Private Share</p>
              <h1 className="text-3xl font-semibold uppercase tracking-[0.18em]">Privátní odkaz na projekt</h1>
              <p className="text-sm text-[var(--mpc-muted)]">
                Vytvoř dočasný odkaz na projekt pro klienta nebo spolupráci.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6 space-y-4">
              <label className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Projekt</label>
              <select
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                className="w-full rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm"
                disabled={!userId}
              >
                {projects.length === 0 && <option value="">Nemáš žádné projekty</option>}
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title || 'Bez názvu'}
                  </option>
                ))}
              </select>

              <label className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Platnost (hodiny)</label>
              <input
                value={expiresHours}
                onChange={(event) => setExpiresHours(event.target.value)}
                type="number"
                min={1}
                className="w-full rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm"
              />

              <label className="flex items-center gap-3 text-sm text-[var(--mpc-muted)]">
                <input
                  type="checkbox"
                  checked={allowDownload}
                  onChange={(event) => setAllowDownload(event.target.checked)}
                />
                Povolit stažení audio souboru
              </label>

              <button
                onClick={handleCreate}
                disabled={!userId || loading}
                className="rounded-full bg-[var(--mpc-accent)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black disabled:opacity-60"
              >
                {loading ? 'Vytvářím…' : 'Vytvořit odkaz'}
              </button>

              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Výstup</p>
              {!authReady ? (
                <p className="mt-3 text-sm text-[var(--mpc-muted)]">Načítám účet…</p>
              ) : !userId ? (
                <p className="mt-3 text-sm text-[var(--mpc-muted)]">Přihlas se pro vytváření odkazů.</p>
              ) : shareUrl ? (
                <div className="mt-4 space-y-3">
                  <p className="text-sm">Odkaz byl zkopírován do schránky.</p>
                  <div className="break-all rounded-xl border border-white/10 bg-black/30 p-3 text-xs">
                    {shareUrl}
                  </div>
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center rounded-full border border-[var(--mpc-accent)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-accent)]"
                  >
                    Otevřít odkaz
                  </a>
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--mpc-muted)]">Zatím žádný odkaz.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
