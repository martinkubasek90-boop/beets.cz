'use client';

import { useEffect, useState, FormEvent, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import { translate } from '../lib/i18n';
import { useLanguage } from '../lib/useLanguage';
import { useGlobalPlayer } from './global-player-provider';

type PublicProfile = {
  display_name: string;
  hardware: string;
  bio: string;
  avatar_url: string | null;
  banner_url: string | null;
  last_seen_at?: string | null;
  seeking_signals?: string[] | null;
  offering_signals?: string[] | null;
  seeking_custom?: string | null;
  offering_custom?: string | null;
};

type InitialProfile = Partial<PublicProfile>;

type Beat = {
  id: number;
  title: string;
  bpm: number | null;
  mood: string | null;
  audio_url: string | null;
  cover_url?: string | null;
};

type ProjectTrack = {
  name: string;
  url?: string | null;
  path?: string | null;
};

type Project = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  access_mode?: 'public' | 'request' | 'private' | null;
  project_url: string | null;
  tracks_json?: ProjectTrack[] | Record<string, ProjectTrack> | string;
};

const isProjectTrack = (value: unknown): value is ProjectTrack =>
  !!value &&
  typeof value === 'object' &&
  ('name' in (value as Record<string, unknown>) || 'url' in (value as Record<string, unknown>));

const normalizeProjectTracks = (raw?: Project['tracks_json']): ProjectTrack[] => {
  if (!raw) {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw.filter(isProjectTrack);
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(isProjectTrack);
      }
      if (parsed && typeof parsed === 'object') {
        return Object.values(parsed).filter(isProjectTrack);
      }
    } catch {
      return [];
    }
  }
  if (typeof raw === 'object') {
    return Object.values(raw).filter(isProjectTrack);
  }
  return [];
};

function buildCollabLabel(names?: string[]) {
  const filtered = (names ?? []).filter(Boolean);
  const uniqueNames = Array.from(new Set(filtered));
  if (uniqueNames.length === 0) return 'Spolupráce';
  if (uniqueNames.length === 1) return `Spolupráce ${uniqueNames[0]}`;
  if (uniqueNames.length === 2) return `Spolupráce ${uniqueNames[0]} a ${uniqueNames[1]}`;
  const last = uniqueNames.pop();
  return `Spolupráce ${uniqueNames.join(', ')} a ${last}`;
}

type Collaboration = {
  id: string;
  title: string;
  status?: string | null;
  bpm: number | null;
  mood: string | null;
  audio_url: string | null;
  cover_url?: string | null;
  partners: string[];
  updated_at?: string | null;
};

type CurrentTrack = {
  id: string;
  title: string;
  source: 'beat' | 'project' | 'collab';
  url: string;
  cover_url?: string | null;
  subtitle?: string | null;
};

export default function PublicProfileClient({ profileId, initialProfile }: { profileId: string; initialProfile?: InitialProfile | null }) {
  const supabase = createClient();
  const router = useRouter();
  const { lang } = useLanguage('cs');
  const t = (key: string, fallback: string) => translate(lang as 'cs' | 'en', key, fallback);

  const [profile, setProfile] = useState<PublicProfile | null>(
    initialProfile
      ? {
          display_name: initialProfile.display_name ?? 'Uživatel',
          hardware: initialProfile.hardware ?? '',
          bio: initialProfile.bio ?? '',
          avatar_url: initialProfile.avatar_url ?? null,
          banner_url: initialProfile.banner_url ?? null,
          last_seen_at: initialProfile.last_seen_at ?? null,
          seeking_signals: initialProfile.seeking_signals ?? null,
          offering_signals: initialProfile.offering_signals ?? null,
          seeking_custom: initialProfile.seeking_custom ?? null,
          offering_custom: initialProfile.offering_custom ?? null,
        }
      : null
  );
  const [profileError, setProfileError] = useState<string | null>(null);

  const [beats, setBeats] = useState<Beat[]>([]);
  const [beatsError, setBeatsError] = useState<string | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({});

  const [collabs, setCollabs] = useState<Collaboration[]>([]);
  const [collabsError, setCollabsError] = useState<string | null>(null);

  const [messageBody, setMessageBody] = useState('');
  const [messageError, setMessageError] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [startingCall, setStartingCall] = useState(false);
  const { play, toggle, current: currentTrack, isPlaying, currentTime, duration, seek } =
    useGlobalPlayer();
  const [playerError, setPlayerError] = useState<string | null>(null);

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, title, description, cover_url, project_url, tracks_json, access_mode')
      .eq('user_id', profileId)
      .order('id', { ascending: false })
      .limit(6);
    if (error) {
      const message =
        error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string'
          ? (error as any).message
          : 'Neznámá chyba';
      console.error('Chyba načítání projektů:', error);
      setProjectsError('Nepodařilo se načíst projekty: ' + message);
      return;
    }
    const visible = (data as Project[])?.filter((p) => p.access_mode !== 'private') ?? [];
    setProjects(visible);
    setProjectsError(null);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('display_name, hardware, bio, avatar_url, banner_url, last_seen_at')
          .eq('id', profileId)
          .maybeSingle();

        if (profileErr) throw profileErr;
        if (profileData) {
          setProfile({
            display_name: profileData.display_name ?? 'Uživatel',
            hardware: profileData.hardware ?? '',
            bio: profileData.bio ?? '',
            avatar_url: profileData.avatar_url ?? null,
            banner_url: (profileData as any).banner_url ?? null,
            last_seen_at: (profileData as any).last_seen_at ?? null,
          });
        } else {
          setProfile(null);
          setProfileError('Profil nenalezen.');
        }
      } catch (err) {
        const message =
          err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string'
            ? (err as any).message
            : 'Neznámá chyba';
        console.error('Chyba při načítání profilu:', err);
        setProfileError('Nepodařilo se načíst profil. ' + message);
      }
    };

    const loadBeats = async () => {
        const { data, error } = await supabase
          .from('beats')
          .select('id, title, bpm, mood, audio_url, cover_url')
          .eq('user_id', profileId)
          .order('id', { ascending: false })
          .limit(10);
      if (error) {
        console.error('Chyba načítání beatů:', error);
        setBeatsError('Nepodařilo se načíst beaty.');
      } else {
        setBeats((data as Beat[]) ?? []);
        setBeatsError(null);
      }
    };

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;
      setSessionUserId(uid);
      setIsLoggedIn(!!uid);
      if (uid && uid === profileId) {
        router.push('/profile');
      }
    };

    loadSession();
    loadData();
    loadBeats();
    loadProjects();
  }, [profileId, supabase, router]);

  const fetchCollabs = useCallback(async () => {
    const collaboratorSelect = `
      id,
      title,
      status,
      result_audio_url,
      result_cover_url,
      updated_at,
      collab_participants!inner(user_id, profiles(display_name))
    `;

    try {
      const [byCreator, byParticipant] = await Promise.all([
        supabase
          .from('collab_threads')
          .select(collaboratorSelect)
          .eq('created_by', profileId)
          .order('updated_at', { ascending: false }),
        supabase
          .from('collab_threads')
          .select(collaboratorSelect)
          .eq('collab_participants.user_id', profileId)
          .order('updated_at', { ascending: false }),
      ]);

      if (byCreator.error) throw byCreator.error;
      if (byParticipant.error) throw byParticipant.error;

      const mapThread = (thread: any): Collaboration => {
        const participantsRaw = Array.isArray(thread.collab_participants)
          ? thread.collab_participants.map((p: any) => p.profiles?.display_name || p.user_id)
          : [];
        const participants = Array.from(
          new Set(
            participantsRaw.filter((p): p is string => typeof p === 'string' && p.trim().length > 0)
          )
        );
        return {
          id: thread.id,
          title: buildCollabLabel(participants),
          status: thread.status ?? null,
          bpm: null,
          mood: null,
          audio_url: thread.result_audio_url ?? null,
          cover_url: thread.result_cover_url ?? null,
          partners: participants,
          updated_at: thread.updated_at ?? null,
        };
      };

      const merged = new Map<string, Collaboration>();
      (byCreator.data ?? []).forEach((thread: any) => merged.set(thread.id, mapThread(thread)));
      (byParticipant.data ?? []).forEach((thread: any) => merged.set(thread.id, mapThread(thread)));

      setCollabs(Array.from(merged.values()));
      setCollabsError(null);
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string'
          ? (err as any).message
          : 'Neznámá chyba';
      console.error('Chyba načítání spoluprací:', err);
      setCollabsError('Nepodařilo se načíst spolupráce: ' + message);
    }
  }, [profileId, supabase]);

  useEffect(() => {
    if (!sessionUserId || sessionUserId !== profileId) {
      setCollabs([]);
      setCollabsError(null);
      return;
    }
    void fetchCollabs();
  }, [fetchCollabs, profileId, sessionUserId]);

  async function handleSendMessage(e: FormEvent) {
    e.preventDefault();
    setMessageError(null);
    if (!messageBody.trim()) {
      setMessageError('Zpráva je prázdná.');
      return;
    }
    try {
      setSendingMessage(true);
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        setMessageError('Musíš být přihlášen.');
        return;
      }
      const payload = {
        user_id: userData.user.id,
        to_user_id: profileId,
        from_name: userData.user.email ?? 'Uživatel',
        to_name: profile?.display_name ?? 'Uživatel',
        body: messageBody.trim(),
      };
      const { error } = await supabase.from('messages').insert(payload);
      if (error) throw error;
      setMessageBody('');
    } catch (err) {
      console.error('Chyba při odeslání zprávy:', err);
      setMessageError('Nepodařilo se odeslat zprávu.');
    } finally {
      setSendingMessage(false);
    }
  }

  function handlePlayTrack(item: { id: string; title: string; url: string; source: CurrentTrack['source']; cover_url?: string | null; subtitle?: string | null }) {
    if (!item.url) {
      setPlayerError('Tento záznam nemá audio soubor.');
      return;
    }
    setPlayerError(null);
    play({
      id: item.id,
      title: item.title,
      artist: item.subtitle || profile?.display_name || 'Profil',
      url: item.url,
      cover_url: item.cover_url,
      item_type: item.source,
    });
  }

  function seekInCurrent(clientX: number, width: number) {
    if (!duration) return;
    const ratio = Math.min(Math.max(clientX / width, 0), 1);
    seek(ratio);
  }

  function formatTime(sec: number) {
    if (!sec || Number.isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, '0');
    return `${m}:${s}`;
  }

  const heroName = profile?.display_name || 'Profil';
  const currentCover = currentTrack?.cover_url || null;
  const currentSubtitle = currentTrack?.subtitle || profile?.display_name || null;
  const progressRatio = duration ? Math.min(currentTime / duration, 1) : 0;
  const lastSeenMs = profile?.last_seen_at ? new Date(profile.last_seen_at).getTime() : 0;
  const isOnline = lastSeenMs && Date.now() - lastSeenMs < 5 * 60 * 1000;
  const statusColor = isOnline ? 'bg-emerald-500' : 'bg-red-500';
  const statusLabel = isOnline ? 'Online' : 'Offline';

  const handleStartCall = async () => {
    if (!isLoggedIn || !sessionUserId) {
      setMessageError('Musíš být přihlášen pro volání.');
      return;
    }
    if (profileId === sessionUserId) {
      setMessageError('Nemůžeš volat sám sobě.');
      return;
    }
    setMessageError(null);
    setStartingCall(true);
    try {
      const roomName = `beets-call-${crypto.randomUUID()}`;
      const { data, error } = await supabase
        .from('calls')
        .insert({
          caller_id: sessionUserId,
          callee_id: profileId,
          room_name: roomName,
          status: 'ringing',
        })
        .select('id')
        .single();
      if (error) throw error;
      if (!data?.id) throw new Error('Hovor se nepodařilo založit.');
      router.push(`/call/${data.id}?room=${encodeURIComponent(roomName)}&caller=${sessionUserId}&callee=${profileId}`);
    } catch (err) {
      console.error('Chyba při startu hovoru:', err);
      setMessageError('Nepodařilo se zahájit hovor.');
    } finally {
      setStartingCall(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0c0f16] text-[var(--mpc-light)]">
      {playerError && (
        <div className="fixed top-3 right-3 z-50 rounded-md border border-red-700/50 bg-red-900/30 px-3 py-2 text-sm text-red-100 shadow-lg">
          {playerError}
        </div>
      )}
      <section
        className="relative overflow-hidden border-b border-[var(--mpc-dark)]"
        style={{
          backgroundImage: profile?.banner_url ? `url(${profile.banner_url})` : 'url("/mpc-hero.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/35 to-black/25" />
        <div className="absolute inset-0 opacity-25 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.18),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.15),transparent_30%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-10 md:py-12">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative h-24 w-24 overflow-hidden rounded-full border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] shadow-[0_10px_30px_rgba(0,0,0,0.35)] md:h-28 md:w-28">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt="Profilová fotka"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-black text-[var(--mpc-light)]">
                    {heroName ? heroName.charAt(0).toUpperCase() : 'MPC'}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex flex-col gap-2">
                  <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-black/70 bg-black/75 px-4 py-2 text-white shadow-[0_8px_18px_rgba(0,0,0,0.35)] backdrop-blur">
                    <span className="text-2xl font-black uppercase tracking-[0.12em] md:text-3xl">
                      {heroName}
                    </span>
                    <div className="flex items-center gap-1 text-[12px] text-white/90">
                      <span className={`inline-flex h-3 w-3 rounded-full ${statusColor}`} aria-hidden />
                      <span>{statusLabel}</span>
                    </div>
                  </div>
                  <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-black/70 bg-black/70 px-4 py-1.5 text-white shadow-[0_6px_14px_rgba(0,0,0,0.35)] backdrop-blur">
                    <span className="text-[13px] font-semibold tracking-[0.08em]">
                      {t('profile.hardware', 'Hardware')}:
                    </span>
                    <span className="text-[13px] font-medium tracking-[0.06em] text-white/90">
                      {profile?.hardware || t('profile.noHardware', 'Profil uživatele platformy.')}
                    </span>
                  </div>
                  <div className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-black/70 bg-black/70 px-4 py-1.5 text-white shadow-[0_6px_14px_rgba(0,0,0,0.35)] backdrop-blur">
                    <span className="text-[13px] font-semibold tracking-[0.08em]">
                      {t('profile.bioLabel', 'Bio')}:
                    </span>
                    <span className="text-[13px] font-medium tracking-[0.06em] text-white/90">
                      {profile?.bio || t('profile.noBio', 'Profil zatím nemá popis.')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Krátké info už je nahoře vedle hardware */}
          {profileError && (
            <p className="mt-2 text-sm text-red-300">{profileError}</p>
          )}
        </div>
      </section>

      
      <section className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="mb-4 flex flex-wrap items-center gap-6 text-sm uppercase tracking-[0.15em] text-[var(--mpc-muted)] border-b border-[var(--mpc-dark)] pb-3">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-black/60 bg-black/80 px-3 py-1.5 text-[12px] font-semibold text-white shadow-[0_6px_16px_rgba(0,0,0,0.35)] backdrop-blur hover:bg-black"
            >
              <span className="text-[14px]">←</span>
              <span>Zpět</span>
            </Link>
            <a href="#beats-section" className="font-semibold text-white relative pb-2">
              {t('publicProfile.nav.all', 'Vše')}
              <span className="absolute left-0 right-0 -bottom-1 h-[2px] bg-[var(--mpc-accent)]" />
            </a>
            <a href="#beats-section" className="hover:text-[var(--mpc-light)]">
              {t('publicProfile.nav.beats', 'Beaty')}
            </a>
            <a href="#projects-section" className="hover:text-[var(--mpc-light)]">
              {t('publicProfile.nav.projects', 'Projekty')}
            </a>
            <a href="#collabs-section" className="hover:text-[var(--mpc-light)]">
              {t('publicProfile.nav.collabs', 'Spolupráce')}
            </a>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {isLoggedIn && sessionUserId !== profileId && (
              <button
                onClick={handleStartCall}
                disabled={startingCall}
                className="inline-flex h-10 items-center rounded-full border border-[var(--mpc-accent)] bg-black/50 px-4 text-[12px] font-bold uppercase tracking-[0.16em] text-[var(--mpc-accent)] shadow-[0_10px_20px_rgba(0,0,0,0.35)] hover:bg-[var(--mpc-accent)] hover:text-black disabled:opacity-60"
              >
                {startingCall ? 'Vytvářím hovor…' : 'Zahájit hovor'}
              </button>
            )}
            <a
              href="#message-form"
              className="inline-flex h-10 items-center rounded-full bg-[var(--mpc-accent)] px-5 text-[12px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_10px_30px_rgba(255,75,129,0.35)] hover:translate-y-[1px]"
            >
              {t('publicProfile.sendMessage', 'Poslat zprávu')}
            </a>
          </div>
        </div>

        {/* Beaty */}
        <div id="beats-section" className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--mpc-light)]">{t('publicProfile.beats.title', 'Beaty')}</h2>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">{beats.length} {t('profile.items', 'položek')}</p>
            </div>
          </div>
          {beatsError && (
            <div className="mb-2 rounded-md border border-yellow-700/50 bg-yellow-900/20 px-3 py-2 text-xs text-yellow-200">
              {beatsError}
            </div>
          )}
          {beats.length === 0 ? (
            <p className="text-sm text-[var(--mpc-muted)]">Žádné beaty k zobrazení.</p>
          ) : (
            <div className="space-y-3">
              {beats.map((beat) => {
                const isCurrent = currentTrack?.id === `beat-${beat.id}`;
                const progressPct = isCurrent && duration ? `${Math.min((currentTime / duration) * 100, 100)}%` : '0%';
                return (
                  <div
                    key={beat.id}
                    className="rounded-2xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-4 py-4 text-sm text-[var(--mpc-light)]"
                  >
                    <div
                      className="relative overflow-hidden rounded-xl border border-white/5 p-4"
                      style={{
                        background: 'linear-gradient(135deg, #000409 0%, #0a704e 55%, #fb8b00 100%)',
                      }}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-lg border border-white/10 bg-black/40 text-[11px] uppercase tracking-[0.1em] text-white">
                            {beat.cover_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={beat.cover_url} alt={beat.title} className="h-full w-full object-cover" />
                            ) : (
                              <span>{beat.title.slice(0, 2)}</span>
                            )}
                          </div>
                          <div>
                            <p className="text-base font-semibold text-white">{beat.title}</p>
                            <p className="text-[12px] text-[var(--mpc-muted)]">
                              {beat.bpm ? `${beat.bpm} BPM` : '—'} · {beat.mood || '—'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            handlePlayTrack({
                              id: `beat-${beat.id}`,
                              title: beat.title,
                              url: beat.audio_url || '',
                              source: 'beat',
                              cover_url: beat.cover_url,
                              subtitle: profile?.display_name || null,
                            })
                          }
                          disabled={!beat.audio_url}
                          className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_8px_18px_rgba(243,116,51,0.35)] hover:translate-y-[1px] disabled:opacity-40 disabled:hover:translate-y-0"
                        >
                          {isCurrent && isPlaying ? '▮▮ Pauza' : '► Přehrát'}
                        </button>
                      </div>
                      <div
                        className="mt-3 h-2 cursor-pointer overflow-hidden rounded-full bg-white/10"
                        onClick={(e) => {
                          if (!isCurrent) return;
                          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                          seekInCurrent(e.clientX - rect.left, rect.width);
                        }}
                      >
                        <div
                          className="h-full rounded-full bg-[var(--mpc-accent)] shadow-[0_6px_16px_rgba(255,75,129,0.35)]"
                          style={{ width: progressPct }}
                        />
                      </div>
                      {isCurrent && (
                        <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--mpc-muted)]">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Projekty */}
        <div id="projects-section" className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--mpc-light)]">{t('publicProfile.projects.title', 'Projekty')}</h2>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">{projects.length} {t('profile.items', 'položek')}</p>
            </div>
          </div>
          {projectsError && (
            <div className="mb-2 rounded-md border border-yellow-700/50 bg-yellow-900/20 px-3 py-2 text-xs text-yellow-200">
              {projectsError}
            </div>
          )}
          {projects.length === 0 ? (
            <p className="text-sm text-[var(--mpc-muted)]">Žádné projekty k zobrazení.</p>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => {
                const tracks = normalizeProjectTracks(project.tracks_json);
                return (
                  <div
                    key={project.id}
                    className="rounded-2xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-4 py-4 text-sm text-[var(--mpc-light)]"
                  >
                  {/** přístupový režim projektu */}
                  {project.access_mode && project.access_mode !== 'public' && (
                    <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-yellow-200">
                      Zamčeno · {project.access_mode === 'request' ? 'Na žádost' : 'Soukromé'}
                    </div>
                  )}
                  <div
                    className="relative overflow-hidden rounded-xl border border-white/5 bg-black/40 p-6"
                    style={
                      project.cover_url
                        ? {
                            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.72), rgba(0,0,0,0.88)), url(${project.cover_url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                          }
                        : {
                            background: 'linear-gradient(135deg, #000409 0%, #0a704e 55%, #fb8b00 100%)',
                          }
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
                        <p className="text-lg font-semibold text-white">{project.title}</p>
                        <p className="text-[12px] text-[var(--mpc-muted)]">
                          {project.description || t('publicProfile.projects.defaultDescription', 'Projekt')}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col items-center gap-2">
                      <button
                        onClick={() =>
                          setExpandedProjects((prev) => ({ ...prev, [project.id]: !prev[project.id] }))
                        }
                        className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--mpc-accent)] text-white shadow-[0_8px_18px_rgba(243,116,51,0.35)] transition hover:translate-y-[1px]"
                        aria-label="Zobrazit tracklist"
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
                        <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">Tracklist</p>
                        {project.access_mode && project.access_mode !== 'public' ? (
                          <div className="space-y-2 rounded border border-[var(--mpc-dark)] bg-black/50 p-3 text-[13px] text-[var(--mpc-light)]">
                            <p>Projekt je uzamčený.</p>
                            <p className="text-[12px] text-[var(--mpc-muted)]">
                              {project.access_mode === 'request'
                                ? 'Požádej o přístup z detailu projektu.'
                                : 'Přístup mají jen schválení uživatelé.'}
                            </p>
                            {!isLoggedIn && (
                              <Link href="/auth/login" className="text-[var(--mpc-accent)] underline">
                                Přihlas se a zažádej o přístup.
                              </Link>
                            )}
                          </div>
                        ) : tracks.length > 0 ? (
                          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                            {tracks.map((t, idx) => {
                              const trackId = `project-${project.id}-${idx}`;
                              const isCurrent = currentTrack?.id === trackId;
                              const progressPct = isCurrent && duration ? `${Math.min((currentTime / duration) * 100, 100)}%` : '0%';
                              return (
                                <div
                                  key={trackId}
                                  className="rounded border border-white/10 bg-black/40 px-3 py-2 transition hover:border-[var(--mpc-accent)]/60"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                      <span className="w-5 text-[11px] text-[var(--mpc-muted)]">{idx + 1}.</span>
                                      <span>{t.name || `Track ${idx + 1}`}</span>
                                    </div>
                                    <button
                                      onClick={() =>
                                        handlePlayTrack({
                                          id: trackId,
                                          title: t.name || `Track ${idx + 1}`,
                                          url: t.url || '',
                                          source: 'project',
                                          cover_url: project.cover_url,
                                          subtitle: profile?.display_name || null,
                                        })
                                      }
                                      disabled={!t.url}
                                      className="rounded-full border border-[var(--mpc-accent)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-white disabled:opacity-40"
                                    >
                                      {isCurrent && isPlaying ? '▮▮' : '►'}
                                    </button>
                                  </div>
                                  <div
                                    className="mt-2 h-2 cursor-pointer overflow-hidden rounded-full bg-white/10"
                                    onClick={(e) => {
                                      if (!isCurrent) return;
                                      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                                      seekInCurrent(e.clientX - rect.left, rect.width);
                                    }}
                                  >
                                    <div
                                      className="h-full rounded-full bg-[var(--mpc-accent)] shadow-[0_6px_16px_rgba(255,75,129,0.35)]"
                                      style={{ width: progressPct }}
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
                        ) : project.project_url ? (
                          <div className="flex items-center justify-between rounded border border-white/5 bg-black/30 px-3 py-2">
                            <span>{project.title || 'Ukázka projektu'}</span>
                            <button
                              onClick={() =>
                                handlePlayTrack({
                                  id: `project-${project.id}`,
                                  title: project.title,
                                  url: project.project_url || '',
                                  source: 'project',
                                  cover_url: project.cover_url,
                                  subtitle: profile?.display_name || null,
                                })
                              }
                              className="text-[11px] text-[var(--mpc-accent)] hover:text-white"
                            >
                              {currentTrack?.id === `project-${project.id}` && isPlaying ? '▮▮' : '►'}
                            </button>
                          </div>
                        ) : (
                          <p className="text-[12px] text-[var(--mpc-muted)]">Tracklist není k dispozici.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            </div>
          )}
        </div>

        {/* Spolupráce */}
        <div id="collabs-section" className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--mpc-light)]">{t('publicProfile.collabs.title', 'Spolupráce')}</h2>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">{collabs.length} {t('profile.collabs.count', 'spoluprací')}</p>
            </div>
          </div>
          {collabsError && (
            <div className="mb-2 rounded-md border border-yellow-700/50 bg-yellow-900/20 px-3 py-2 text-xs text-yellow-200">
              {collabsError}
            </div>
          )}
          {collabs.length === 0 ? (
            <p className="text-sm text-[var(--mpc-muted)]">Žádné spolupráce k zobrazení.</p>
          ) : (
            <div className="space-y-3">
              {collabs.map((col) => (
                <div
                  key={col.id}
                  className="rounded-lg border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-4 py-3 text-sm text-[var(--mpc-light)] transition hover:border-[var(--mpc-accent)]"
                  style={
                    col.cover_url
                      ? {
                          backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.85)), url(${col.cover_url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-[var(--mpc-light)]">{col.title}</p>
                      <p className="text-[12px] text-[var(--mpc-muted)]">
                        {col.bpm ? `${col.bpm} BPM` : '—'} · {col.mood || '—'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--mpc-muted)]">
                      {col.partners.map((p, idx) => (
                        <span
                          key={p + idx}
                          className="rounded-full border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-2 py-[2px]"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                    <div className="mt-3 flex items-center gap-2 text-[11px]">
                      <button
                        onClick={() =>
                          handlePlayTrack({
                            id: `collab-${col.id}`,
                            title: col.title,
                            url: col.audio_url || '',
                            source: 'collab',
                            cover_url: col.cover_url,
                            subtitle: col.partners.join(' • ') || profile?.display_name || null,
                          })
                        }
                        disabled={!col.audio_url}
                        className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-white shadow-[0_8px_18px_rgba(243,116,51,0.35)] hover:translate-y-[1px] disabled:opacity-40 disabled:hover:translate-y-0"
                      >
                        {currentTrack?.id === `collab-${col.id}` && isPlaying ? '▮▮ Pauza' : '► Přehrát'}
                      </button>
                    </div>
                    {col.audio_url && (
                      <div
                        className="mt-3 h-[70px] cursor-pointer overflow-hidden rounded-md border border-[var(--mpc-dark)] bg-[var(--mpc-deck)]"
                        onClick={(e) => {
                        const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                        seekInCurrent(e.clientX - rect.left, rect.width);
                      }}
                    >
                      <div
                        className="h-full"
                        style={{
                          width:
                            currentTrack?.id === `collab-${col.id}` && duration
                              ? `${Math.min((currentTime / duration) * 100, 100)}%`
                              : '0%',
                          background:
                            'repeating-linear-gradient(to right, rgba(0,86,63,0.95) 0, rgba(0,86,63,0.95) 6px, rgba(255,255,255,0.18) 6px, rgba(255,255,255,0.18) 12px)',
                          boxShadow: currentTrack?.id === `collab-${col.id}` ? '0 4px 12px rgba(0,224,150,0.35)' : 'none',
                          transition: 'width 0.1s linear',
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Poslat zprávu */}
        <div id="message-form" className="rounded-xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] p-5 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--mpc-light)]">{t('publicProfile.message.title', 'Poslat zprávu')}</h2>
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">{t('publicProfile.message.subtitle', 'Přímo autorovi profilu')}</p>
            </div>
            {!isLoggedIn && (
              <Link href="/auth/login" className="text-[11px] uppercase tracking-[0.15em] text-[var(--mpc-accent)]">
                {t('nav.login', 'Přihlásit se')}
              </Link>
            )}
          </div>
          <form onSubmit={handleSendMessage} className="space-y-3">
            <div>
              <label
                htmlFor="public-profile-message"
                className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-muted)]"
              >
                {t('publicProfile.message.label', 'Zpráva')}
              </label>
              <textarea
                id="public-profile-message"
                name="public-profile-message"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                className="mt-1 w-full rounded border border-[var(--mpc-dark)] bg-[var(--mpc-deck)] px-3 py-2 text-sm text-[var(--mpc-light)] outline-none focus:border-[var(--mpc-accent)]"
                rows={3}
                placeholder="Napiš detail spolupráce, tempo, mood, deadline…"
              />
            </div>
              {messageError && <p className="text-sm text-red-300">{messageError}</p>}
              <button
                type="submit"
                disabled={sendingMessage}
                className="rounded-full bg-[var(--mpc-accent)] px-4 py-2 text-[12px] font-bold uppercase tracking-[0.2em] text-white disabled:opacity-60"
              >
                {sendingMessage ? t('publicProfile.message.sending', 'Odesílám…') : t('publicProfile.message.send', 'Odeslat zprávu')}
              </button>
            </form>
            {!isLoggedIn && (
              <p className="mt-2 text-[11px] text-[var(--mpc-muted)]">{t('publicProfile.message.loginNote', 'Pro odeslání zprávy se přihlas.')}</p>
            )}
        </div>
      </section>

      {currentTrack && (
        <div className="fixed inset-x-0 bottom-0 z-40 bg-[#04080f]/85 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center gap-4 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 overflow-hidden rounded-lg border border-white/10 bg-black/60">
                {currentCover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={currentCover} alt={currentTrack.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-[11px] uppercase tracking-[0.1em] text-white">
                    {heroName.slice(0, 2)}
                  </div>
                )}
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">Právě hraje</p>
                <p className="text-sm font-semibold text-white">{currentTrack.title}</p>
                {currentSubtitle ? (
                  <p className="text-[11px] text-[var(--mpc-muted)]">
                    {profileId ? (
                      <Link href={`/u/${profileId}`} className="hover:text-[var(--mpc-accent)]">
                        {currentSubtitle}
                      </Link>
                    ) : (
                      currentSubtitle
                    )}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex-1">
              <div
                className="h-2 cursor-pointer overflow-hidden rounded-full bg-white/10"
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                  seekInCurrent(e.clientX - rect.left, rect.width);
                }}
              >
                <div
                  className="h-full rounded-full bg-[var(--mpc-accent)] shadow-[0_6px_16px_rgba(255,75,129,0.35)]"
                  style={{ width: `${progressRatio * 100}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--mpc-muted)]">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
            <button
              onClick={() => setIsPlaying((prev) => !prev)}
              className="grid h-12 w-12 place-items-center rounded-full bg-[var(--mpc-accent)] text-lg text-white shadow-[0_10px_30px_rgba(255,75,129,0.35)]"
            >
              {isPlaying ? '▮▮' : '►'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
