'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type SharePayload = {
  ok: boolean;
  item_type: 'beat' | 'project';
  item_id: string;
  allow_download: boolean;
  audio_url?: string | null;
  title?: string | null;
  cover_url?: string | null;
  author_slug?: string | null;
  author_name?: string | null;
  error?: string;
};

export default function ShareViewPage() {
  const params = useParams();
  const token = params?.token as string | undefined;
  const [data, setData] = useState<SharePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/share/${token}`);
        const json = (await res.json()) as SharePayload;
        if (!res.ok || !json?.ok) {
          throw new Error(json?.error || 'Odkaz není dostupný.');
        }
        setData(json);
      } catch (err: any) {
        setError(err?.message || 'Odkaz není dostupný.');
      }
    };
    load();
  }, [token]);

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border border-white/10 bg-black/60 p-6 text-center">
          <p className="text-sm uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Privátní odkaz</p>
          <p className="mt-3 text-white">{error}</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
        <div className="text-sm text-[var(--mpc-muted)]">Načítám…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--mpc-deck,#050505)] text-white">
      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-3xl border border-white/10 bg-[var(--mpc-panel)] p-6 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.7)]">
          {data.cover_url && (
            <div
              className="h-56 w-full rounded-2xl bg-cover bg-center"
              style={{ backgroundImage: `url(${data.cover_url})` }}
            />
          )}
          <div className="mt-4 space-y-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Privátní share</p>
            <h1 className="text-2xl font-bold">{data.title || 'Projekt'}</h1>
            {data.author_name && (
              <p className="text-sm text-[var(--mpc-muted)]">{data.author_name}</p>
            )}
          </div>
          <div className="mt-4">
            {data.audio_url ? (
              <audio controls className="w-full">
                <source src={data.audio_url} />
                Váš prohlížeč nepodporuje přehrávání.
              </audio>
            ) : (
              <p className="text-sm text-[var(--mpc-muted)]">Audio není k dispozici.</p>
            )}
          </div>
          {data.allow_download && data.audio_url && (
            <a
              href={data.audio_url}
              download
              className="mt-4 inline-flex items-center rounded-full border border-[var(--mpc-accent)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-accent)]"
            >
              Stáhnout audio
            </a>
          )}
        </div>
      </section>
    </main>
  );
}
