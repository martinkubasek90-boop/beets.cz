'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

type ProjectTrack = {
  name: string;
  url?: string | null;
  path?: string | null;
};

type PublicProject = {
  id: string;
  title: string;
  description?: string | null;
  cover_url?: string | null;
  tracks_json?: ProjectTrack[] | Record<string, ProjectTrack> | string | null;
  release_formats?: string[] | null;
  purchase_url?: string | null;
  project_url?: string | null;
  access_mode?: 'public' | 'request' | 'private' | null;
};

type PublicProjectClientProps = {
  project: PublicProject;
  authorName: string;
  authorUrl: string | null;
  requiresPassword: boolean;
};

const RELEASE_FORMAT_LABELS: Record<string, string> = {
  vinyl: 'Vinyl',
  cassette: 'Kazeta',
  cd: 'CD',
  digital: 'Digital',
};

const normalizePurchaseUrl = (value?: string | null) => {
  if (!value) return null;
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};

const normalizeProjectTracks = (raw?: PublicProject['tracks_json']): ProjectTrack[] => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && typeof parsed === 'object') return Object.values(parsed);
    } catch {
      return [];
    }
  }
  if (raw && typeof raw === 'object') return Object.values(raw);
  return [];
};

const isMp3 = (url?: string | null) => {
  if (!url) return false;
  const base = url.split('?')[0];
  return base.toLowerCase().endsWith('.mp3');
};

export default function PublicProjectClient({
  project,
  authorName,
  authorUrl,
  requiresPassword,
}: PublicProjectClientProps) {
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);
  const [unlocked, setUnlocked] = useState(project.access_mode !== 'request' || !requiresPassword);

  const tracks = useMemo(() => normalizeProjectTracks(project.tracks_json), [project.tracks_json]);
  const playableTracks = tracks.filter((track) => track.url);
  const canAccess = project.access_mode !== 'request' || unlocked;
  const canDownload = project.access_mode === 'request' && unlocked;

  const handleUnlock = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!password.trim()) {
      setPasswordError('Zadej heslo.');
      return;
    }
    setUnlocking(true);
    setPasswordError(null);
    try {
      const res = await fetch('/api/projects/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, password }),
      });
      if (!res.ok) {
        throw new Error('Verify failed');
      }
      const data = await res.json();
      if (data?.ok) {
        setUnlocked(true);
      } else {
        setPasswordError('Heslo nesouhlasí.');
      }
    } catch (err) {
      console.error('Overeni hesla selhalo:', err);
      setPasswordError('Heslo se nepodarilo overit.');
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--mpc-deck,#050505)] text-white">
      <div className="mx-auto max-w-4xl px-4 py-10 space-y-6">
        <Link href="/projects" className="text-[12px] uppercase tracking-[0.16em] text-[var(--mpc-muted)] hover:text-[var(--mpc-accent)]">
          ← Zpet na projekty
        </Link>
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/50 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
          {project.cover_url && (
            <div
              className="h-56 w-full bg-cover bg-center"
              style={{
                backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.55), rgba(0,0,0,0.9)), url(${project.cover_url})`,
              }}
            />
          )}
          <div className="space-y-4 px-5 py-5">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--mpc-muted)]">Projekt</p>
            <h1 className="text-2xl font-bold">{project.title || 'Projekt'}</h1>
            {authorUrl ? (
              <Link href={authorUrl} className="text-[var(--mpc-accent)] underline underline-offset-4">
                {authorName}
              </Link>
            ) : (
              <p className="text-[var(--mpc-accent)]">{authorName}</p>
            )}
            {project.description && <p className="text-sm text-[var(--mpc-muted)]">{project.description}</p>}

            {project.access_mode === 'request' && requiresPassword && !unlocked && (
              <form onSubmit={handleUnlock} className="rounded-xl border border-white/10 bg-black/40 p-4">
                <p className="text-[12px] uppercase tracking-[0.18em] text-[var(--mpc-muted)]">Zadost</p>
                <p className="mt-1 text-sm text-white/80">Zadej heslo pro zobrazeni projektu.</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex-1 rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
                    placeholder="Heslo"
                  />
                  <button
                    type="submit"
                    disabled={unlocking}
                    className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-white disabled:opacity-60"
                  >
                    {unlocking ? 'Overuji...' : 'Odemknout'}
                  </button>
                </div>
                {passwordError && (
                  <p className="mt-2 text-[12px] text-red-300">{passwordError}</p>
                )}
              </form>
            )}

            {!canAccess && (
              <p className="text-[12px] text-[var(--mpc-muted)]">Projekt je uzamcen.</p>
            )}

            {canAccess && playableTracks.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-black/40 p-4">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Tracklist</p>
                <div className="mt-3 space-y-3">
                  {tracks.map((track, index) => {
                    if (!track.url) return null;
                    return (
                      <div key={`${track.name}-${index}`} className="rounded-lg border border-white/10 bg-black/60 px-3 py-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-sm font-semibold">{track.name || `Track ${index + 1}`}</span>
                          {canDownload && isMp3(track.url) && (
                            <a
                              href={track.url || undefined}
                              download
                              className="rounded-full border border-[var(--mpc-accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-white"
                            >
                              Stahnout MP3
                            </a>
                          )}
                        </div>
                        <audio controls className="mt-2 w-full">
                          <source src={track.url || ''} />
                          Vas prohlizec nepodporuje prehravani.
                        </audio>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {canAccess && playableTracks.length === 0 && (
              <p className="text-[12px] text-[var(--mpc-muted)]">Tracklist neni k dispozici.</p>
            )}

            {(project.release_formats?.length || project.purchase_url) && (
              <div className="flex flex-wrap items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                <span>Vydano na</span>
                {(project.release_formats || []).map((format) => (
                  <span
                    key={format}
                    className="rounded-full border border-white/15 bg-black/50 px-2 py-1 text-[10px] text-white"
                  >
                    {RELEASE_FORMAT_LABELS[format] || format}
                  </span>
                ))}
                {project.purchase_url && (
                  <a
                    href={normalizePurchaseUrl(project.purchase_url) || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-[var(--mpc-accent)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-white"
                  >
                    Koupit
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
