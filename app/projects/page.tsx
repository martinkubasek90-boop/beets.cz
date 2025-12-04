'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client';

type Project = {
  id: number;
  title: string;
  description: string | null;
  cover_url: string | null;
  user_id?: string | null;
  author_name?: string | null;
  project_url?: string | null;
  access_mode?: 'public' | 'request' | 'private';
  tracks_json?: Array<{ name: string; url?: string; path?: string }>;
  // Fallback pro starší sloupec "tracks"
  tracks?: Array<{ name: string; url: string }>;
};

type RequestAccessProps = {
  projectId: number;
  status?: 'pending' | 'approved' | 'denied';
  onRequest: () => void;
  loading?: boolean;
};

function RequestAccessRow({ status, onRequest, loading }: RequestAccessProps) {
  if (status === 'pending') {
    return <p className="text-[11px] text-[var(--mpc-muted)]">Žádost odeslána – čeká na schválení.</p>;
  }
  if (status === 'denied') {
    return <p className="text-[11px] text-red-300">Žádost byla zamítnuta.</p>;
  }
  if (status === 'approved') {
    return <p className="text-[11px] text-[var(--mpc-muted)]">Přístup byl schválen, načti stránku znovu.</p>;
  }
  return (
    <button
      type="button"
      onClick={onRequest}
      disabled={loading}
      className="rounded-full border border-[var(--mpc-accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-white disabled:opacity-60"
    >
      {loading ? 'Odesílám…' : 'Požádat o přístup'}
    </button>
  );
}

export default function ProjectsPage() {
  const supabase = createClient();
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [authorFilter, setAuthorFilter] = useState<string>('all');
  const [userId, setUserId] = useState<string | null>(null);
  const [myRequests, setMyRequests] = useState<Record<number, 'pending' | 'approved' | 'denied'>>({});
  const [myGrants, setMyGrants] = useState<Set<number>>(new Set());
  const [requesting, setRequesting] = useState<Record<number, boolean>>({});
  const [currentTrack, setCurrentTrack] = useState<{ projectId: number; name: string; url: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [expandedProjects, setExpandedProjects] = useState<Record<number, boolean>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current && typeof window !== 'undefined') {
      audioRef.current = new Audio();
    }
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime || 0);
    const onMeta = () => setDuration(el.duration || 0);
    const onEnd = () => setIsPlaying(false);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('ended', onEnd);
    return () => {
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('ended', onEnd);
    };
  }, []);

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    };
    loadUser();
  }, [supabase]);

  const playTrack = (projectId: number, name: string, url?: string) => {
    if (!audioRef.current || !url) return;
    // Toggle if same track
    if (currentTrack && currentTrack.projectId === projectId && currentTrack.url === url) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
      return;
    }
    setCurrentTrack({ projectId, name, url });
    audioRef.current.src = url;
    audioRef.current.currentTime = 0;
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  };

  const progressPercent =
    currentTrack && duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  const trackProgress = (projectId: number, url?: string) => {
    if (!currentTrack || !url) return 0;
    if (currentTrack.projectId === projectId && currentTrack.url === url && duration > 0) {
      return progressPercent;
    }
    return 0;
  };

  const formatTime = (sec?: number) => {
    if (!sec || !Number.isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, '0');
    return `${m}:${s}`;
  };

  useEffect(() => {
    const resolveSignedUrl = async (path?: string | null) => {
      if (!path) return '';
      const { data, error } = await supabase.storage.from('projects').createSignedUrl(path, 3600);
      if (error) {
        console.warn('Nepodařilo se vytvořit signed URL pro projekt:', error);
        return '';
      }
      return data?.signedUrl || '';
    };

    const load = async () => {
      try {
        setLoading(true);
        let mapped: any[] = [];
        // Primární pokus se všemi sloupci
        try {
          const { data, error: projErr } = await supabase
            .from('projects')
            .select('id, title, description, cover_url, user_id, project_url, tracks_json, tracks, author_name, access_mode')
            .order('id', { ascending: false })
            .limit(12);
          if (projErr) throw projErr;
          mapped = (data as any[]) ?? [];
        } catch (innerErr) {
          try {
            // Fallback pro schéma bez některých sloupců – použijeme jen bezpečné pole
            console.warn('Fallback select projects bez tracks_json/author_name:', innerErr);
            const { data, error: projErr } = await supabase
              .from('projects')
              .select('id, title, description, cover_url, user_id, project_url, tracks, access_mode')
              .order('id', { ascending: false })
              .limit(12);
            if (projErr) throw projErr;
            mapped = (data as any[]) ?? [];
          } catch (innerErr2) {
            console.warn('Minimal fallback select projects:', innerErr2);
            const { data, error: projErr } = await supabase
              .from('projects')
              .select('id, title, description, cover_url, user_id, project_url, access_mode')
              .order('id', { ascending: false })
              .limit(12);
            if (projErr) throw projErr;
            mapped = (data as any[]) ?? [];
          }
        }

        // Grants pro aktuálního uživatele
        let grantsSet = new Set<number>();
        if (userId) {
          const { data: grantsData } = await supabase
            .from('project_access_grants')
            .select('project_id')
            .eq('user_id', userId);
          if (grantsData) {
            grantsSet = new Set((grantsData as any[]).map((g) => g.project_id as number));
            setMyGrants(grantsSet);
          } else {
            setMyGrants(new Set());
          }

          const { data: reqData } = await supabase
            .from('project_access_requests')
            .select('project_id, status')
            .eq('requester_id', userId)
            .order('created_at', { ascending: false });
          if (reqData) {
            const reqMap: Record<number, 'pending' | 'approved' | 'denied'> = {};
            (reqData as any[]).forEach((r) => {
              if (!reqMap[r.project_id]) {
                reqMap[r.project_id] = r.status;
              }
            });
            setMyRequests(reqMap);
          } else {
            setMyRequests({});
          }
        } else {
          setMyGrants(new Set());
          setMyRequests({});
        }

        mapped = await Promise.all(
          mapped.map(async (p) => {
            const rawJson = (p as any).tracks_json;
            const rawLegacy = (p as any).tracks;
            const projectUrl = (p as any).project_url || null;
            const accessMode = (p as any).access_mode || 'public';

            const parsedJson =
              Array.isArray(rawJson)
                ? rawJson
                : typeof rawJson === 'string'
                  ? (() => {
                      try {
                        const parsed = JSON.parse(rawJson);
                        return Array.isArray(parsed) ? parsed : null;
                      } catch {
                        return null;
                      }
                    })()
                  : null;

            const parsedLegacy =
              Array.isArray(rawLegacy)
                ? rawLegacy
                : typeof rawLegacy === 'string'
                  ? (() => {
                      try {
                        const parsed = JSON.parse(rawLegacy);
                        return Array.isArray(parsed) ? parsed : null;
                      } catch {
                        return null;
                      }
                    })()
                  : null;

            const tracksSource = parsedJson ?? parsedLegacy ?? [];
            const normalizedTracks = Array.isArray(tracksSource)
              ? tracksSource.map((t: any, idx: number) => ({
                  name: t?.name || t?.title || t?.track_name || `Track ${idx + 1}`,
                  url: t?.url || t?.audio_url || t?.file_url || '',
                  path: t?.path || null,
                }))
              : projectUrl
                ? [{ name: p.title || 'Ukázka projektu', url: projectUrl, path: null }]
                : [];

            const isOwner = userId && p.user_id === userId;
            const hasGrant = grantsSet.has(p.id);
            const hasAccess = accessMode === 'public' || Boolean(isOwner) || hasGrant;

            const tracksWithSigned = await Promise.all(
              normalizedTracks.map(async (t) => {
                // Pokud už má URL nebo přístup není povolen, jen vrať
                if (t.url) {
                  return t;
                }
                if (!hasAccess) {
                  return { ...t, url: '' };
                }
                const pathToUse = t.path || t.url;
                const signed = await resolveSignedUrl(pathToUse);
                return { ...t, url: signed };
              })
            );

            return {
              ...p,
              tracks_json: tracksWithSigned,
              project_url: hasAccess ? projectUrl : null,
              access_mode: accessMode,
            };
          })
        );

        const userIds = Array.from(
          new Set(mapped.map((p) => p.user_id).filter(Boolean) as string[]),
        );
        let profileNames: Record<string, string> = {};
        if (userIds.length) {
          const { data: profiles, error: profErr } = await supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', userIds);
          if (profErr) {
            console.warn('Chyba načítání profilů (ignorováno):', profErr);
          } else if (profiles) {
            profileNames = Object.fromEntries(
              (profiles as any[]).map((pr) => [pr.id, pr.display_name || ''])
            );
          }
        }

        const withNames = mapped.map((p: any) => ({
          ...p,
          author_name: p.user_id ? profileNames[p.user_id] || p.author_name || null : p.author_name || null,
        }));

        const visible = withNames.filter(
          (p: any) => !p.access_mode || p.access_mode === 'public' || p.access_mode === 'request'
        );
        setProjects(visible as Project[]);
        setError(null);
      } catch (err: any) {
        console.error('Chyba načítání projektů:', err);
        const message =
          err instanceof Error
            ? err.message
            : typeof err === 'object'
              ? JSON.stringify(err)
              : String(err);
        setError('Nepodařilo se načíst projekty. ' + message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [supabase, userId]);

  const authors = useMemo(() => {
    const names = Array.from(
      new Set(
        projects
          .map((p) => (p.author_name || '').trim())
          .filter(Boolean)
      )
    );
    return names;
  }, [projects]);

  const filtered = useMemo(() => {
    return projects.filter((p) => {
      const matchesTitle = p.title.toLowerCase().includes(search.toLowerCase());
      const matchesAuthor =
        authorFilter === 'all' ||
        (p.author_name || '').toLowerCase() === authorFilter.toLowerCase();
      return matchesTitle && matchesAuthor;
    });
  }, [projects, search, authorFilter]);

  const requestAccess = async (projectId: number) => {
    if (!userId) {
      setError('Pro odeslání žádosti se přihlas.');
      return;
    }
    setRequesting((prev) => ({ ...prev, [projectId]: true }));
    try {
      const message = prompt('Krátká zpráva pro autora (nepovinné):') ?? '';
      const { error: insertErr } = await supabase.from('project_access_requests').insert({
        project_id: projectId,
        requester_id: userId,
        message: message.trim() || null,
      });
      if (insertErr) throw insertErr;
      setMyRequests((prev) => ({ ...prev, [projectId]: 'pending' }));
      setError(null);
    } catch (err) {
      console.error('Chyba při odeslání žádosti o přístup:', err);
      setError('Nepodařilo se odeslat žádost.');
    } finally {
      setRequesting((prev) => ({ ...prev, [projectId]: false }));
    }
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold uppercase tracking-[0.18em]">Projekty</h1>
            <p className="text-[12px] text-[var(--mpc-muted)]">Všechny nahrané beat tapy a EP</p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-white hover:border-[var(--mpc-accent)]"
          >
            Zpět na homepage
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hledat projekt…"
            className="w-full max-w-xs rounded border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
          />
          <select
            value={authorFilter}
            onChange={(e) => setAuthorFilter(e.target.value)}
            className="rounded border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
          >
            <option value="all">Všichni autoři</option>
            {authors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {loading && <p className="text-[12px] text-[var(--mpc-muted)]">Načítám projekty…</p>}
        {error && (
          <div className="rounded-md border border-yellow-600/50 bg-yellow-900/30 px-3 py-2 text-sm text-yellow-100">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((project) => (
            <div
              key={project.id}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur transition hover:border-[var(--mpc-accent)]"
            >
                {(() => {
                  const mode: 'public' | 'request' | 'private' =
                    project.access_mode ?? 'public';
                  const isOwner = userId && project.user_id === userId;
                  const hasGrant = myGrants.has(project.id);
                  const hasAccess = mode === 'public' || Boolean(isOwner) || hasGrant;
                  const tracks =
                    hasAccess && project.tracks_json && project.tracks_json.length > 0
                      ? project.tracks_json
                      : hasAccess && project.project_url
                        ? [{ name: project.title || 'Ukázka projektu', url: project.project_url }]
                        : [];
                  return (
                    <div className="w-full rounded-2xl border border-white/10 bg-black/40 p-3">
                      {!hasAccess ? (
                        <div className="space-y-2 text-center text-sm text-[var(--mpc-muted)]">
                          <p>Projekt je uzamčený.</p>
                          {userId && (
                            <RequestAccessRow
                              projectId={project.id}
                              status={myRequests[project.id]}
                              onRequest={() => void requestAccess(project.id)}
                              loading={requesting[project.id]}
                            />
                          )}
                          {!userId && <p className="text-[11px]">Přihlas se, pokud chceš požádat o přístup.</p>}
                        </div>
                      ) : (
                        <div
                          className="relative overflow-hidden rounded-xl border border-white/5 bg-black/40 p-6"
                          style={
                            project.cover_url
                              ? {
                                  backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.72), rgba(0,0,0,0.88)), url(${project.cover_url})`,
                                  backgroundSize: 'cover',
                                  backgroundPosition: 'center',
                                }
                              : undefined
                          }
                        >
                          <div className="flex flex-col items-center gap-3 text-center">
                            <div className="grid h-40 w-40 place-items-center overflow-hidden rounded-lg border border-white/10 bg-black/40 text-[11px] uppercase tracking-[0.1em] text-white">
                              {project.cover_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={project.cover_url} alt={project.title} className="h-full w-full object-cover" />
                              ) : (
                                <span>{project.title.slice(0, 2)}</span>
                              )}
                            </div>
                            <div className="space-y-1">
                              {project.author_name && (
                                <p className="text-[12px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">
                                  Autor: {project.author_name}
                                </p>
                              )}
                              <p className="text-lg font-semibold text-white">{project.title}</p>
                              <p className="text-[12px] text-[var(--mpc-muted)]">
                                {project.description || 'Projekt'}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-col items-center gap-2">
                            <button
                              onClick={() =>
                                setExpandedProjects((prev) => ({ ...prev, [project.id]: !prev[project.id] }))
                              }
                              className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--mpc-accent)] text-white shadow-[0_8px_18px_rgba(243,116,51,0.35)] transition hover:translate-y-[1px]"
                            >
                              <span
                                className="text-lg font-bold transition-transform"
                                style={{ transform: expandedProjects[project.id] ? 'rotate(180deg)' : 'rotate(0deg)' }}
                              >
                                ▼
                              </span>
                            </button>
                            <span className="text-[12px] uppercase tracking-[0.18em] text-[var(--mpc-muted)] text-center">
                              Tracklist
                            </span>
                          </div>

                          {expandedProjects[project.id] && (
                            <div className="mt-4 rounded-lg border border-white/10 bg-black/40 p-2 text-sm text-[var(--mpc-light)]">
                              {tracks.length > 0 ? (
                                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                  {tracks.map((t, idx) => {
                                    const isCurrent =
                                      currentTrack?.projectId === project.id && currentTrack.url === t.url;
                                    const progress = trackProgress(project.id, t.url);
                                    return (
                                      <div
                                        key={`${project.id}-${idx}`}
                                        className="rounded border border-white/10 bg-black/40 px-3 py-2 transition hover:border-[var(--mpc-accent)]/60"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-3">
                                            <span className="w-5 text-[11px] text-[var(--mpc-muted)]">{idx + 1}.</span>
                                            <span>{t.name || `Track ${idx + 1}`}</span>
                                          </div>
                                          <button
                                            onClick={() => playTrack(project.id, t.name || `Track ${idx + 1}`, t.url)}
                                            disabled={!t.url}
                                            className="rounded-full border border-[var(--mpc-accent)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-white disabled:opacity-40"
                                          >
                                            {isCurrent && isPlaying ? '▮▮' : '►'}
                                          </button>
                                        </div>
                                        <div
                                          className="mt-2 h-2 cursor-pointer overflow-hidden rounded-full bg-white/10"
                                          onClick={(e) => {
                                            if (!isCurrent || !t.url) return;
                                            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                                            const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
                                            if (audioRef.current && duration > 0) {
                                              const next = ratio * duration;
                                              audioRef.current.currentTime = next;
                                              setCurrentTime(next);
                                            }
                                          }}
                                        >
                                          <div
                                            className="h-full rounded-full bg-[var(--mpc-accent)] shadow-[0_6px_16px_rgba(255,75,129,0.35)]"
                                            style={{ width: `${progress}%` }}
                                          />
                                        </div>
                                        {isCurrent && (
                                          <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--mpc-muted)]">
                                            <span>{formatTime(currentTime)}</span>
                                            <span>{formatTime(duration)}</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-[12px] text-[var(--mpc-muted)]">Tracklist není k dispozici.</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
          ))}
        </div>
      </div>
    </main>
  );
}
