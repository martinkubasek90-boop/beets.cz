'use client';

import { useEffect, useState, FormEvent, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';
import { translate } from '../lib/i18n';
import { useLanguage } from '../lib/useLanguage';

type PublicProfile = {
  display_name: string;
  hardware: string;
  bio: string;
  avatar_url: string | null;
  banner_url: string | null;
};

type Beat = {
  id: number;
  title: string;
  bpm: number | null;
  mood: string | null;
  audio_url: string | null;
  cover_url?: string | null;
};

type Project = {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  user_id?: string | null;
  access_mode?: 'public' | 'request' | 'private' | null;
  project_url: string | null;
  tracks_json?: Array<{ name: string; url?: string | null; path?: string | null }>;
};

type Collaboration = {
  id: number;
  title: string;
  bpm: number | null;
  mood: string | null;
  audio_url: string | null;
  cover_url?: string | null;
  partners: string[];
};

type CurrentTrack = {
  id: string;
  title: string;
  source: 'beat' | 'project' | 'collab';
  url: string;
  cover_url?: string | null;
  subtitle?: string | null;
};

export default function PublicProfileClient({ profileId }: { profileId: string }) {
  const supabase = createClient();
  const router = useRouter();
  const { lang } = useLanguage('cs');
  const t = (key: string, fallback: string) => translate(lang as 'cs' | 'en', key, fallback);

  const [profile, setProfile] = useState<PublicProfile | null>(null);
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [collabRequestError, setCollabRequestError] = useState<string | null>(null);
  const [collabRequestLoading, setCollabRequestLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTrack, setCurrentTrack] = useState<CurrentTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerError, setPlayerError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('display_name, hardware, bio, avatar_url, banner_url')
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

    const loadProjects = async () => {
        const { data, error } = await supabase
          .from('projects')
          .select('id, title, description, cover_url, project_url, tracks_json, access_mode, user_id')
          .eq('user_id', profileId)
          .order('created_at', { ascending: false })
          .limit(6);
      if (error) {
        const message =
          error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string'
            ? (error as any).message
            : 'Neznámá chyba';
        console.error('Chyba načítání projektů:', error);
        setProjectsError('Nepodařilo se načíst projekty: ' + message);
      } else {
        setProjects((data as Project[]) ?? []);
        setProjectsError(null);
      }
    };

    const loadCollabs = async () => {
      // Vlákna, kde je profil jako participant
      const { data, error } = await supabase
        .from('collab_threads')
        .select('id, title, status, result_audio_url, result_cover_url, collab_participants!inner(user_id)')
        .eq('collab_participants.user_id', profileId)
        .order('updated_at', { ascending: false })
        .limit(10);
      if (error) {
        const message =
          error && typeof error === 'object' && 'message' in error && typeof (error as any).message === 'string'
            ? (error as any).message
            : 'Neznámá chyba';
        console.error('Chyba načítání spoluprací:', error);
        setCollabsError('Nepodařilo se načíst spolupráce: ' + message);
        return;
      }
      const mapped: Collaboration[] = (data ?? []).map((c: any) => ({
        id: c.id,
        title: c.title,
        bpm: null,
        mood: c.status,
        audio_url: c.result_audio_url,
        cover_url: c.result_cover_url,
        partners: [],
      }));
      setCollabs(mapped);
      setCollabsError(null);
    };

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      setIsLoggedIn(!!uid);
      setCurrentUserId(uid ?? null);
      if (uid && uid === profileId) {
        router.push('/profile');
      }
    };

    loadSession();
    loadData();
    loadBeats();
    loadProjects();
    loadCollabs();
  }, [profileId, supabase, router]);

  const handleRequestCollab = async () => {
    setCollabRequestError(null);
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const uid = userData?.user?.id || currentUserId;
    if (userErr || !uid) {
      setCollabRequestError('Musíš být přihlášen.');
      return;
    }
    try {
      setCollabRequestLoading(true);
      const threadTitle =
        profile?.display_name?.trim()
          ? `Spolupráce s ${profile.display_name}`
          : 'Nová spolupráce';

      // Nezakládej duplicitní vlákno: zjisti, zda už existuje thread s oběma uživateli.
      const [{ data: myThreads, error: myErr }, { data: targetThreads, error: targetErr }] = await Promise.all([
        supabase.from('collab_participants').select('thread_id').eq('user_id', uid),
        supabase.from('collab_participants').select('thread_id').eq('user_id', profileId),
      ]);
      if (myErr) throw myErr;
      if (targetErr) throw targetErr;
      const mySet = new Set((myThreads ?? []).map((r: any) => r.thread_id));
      const existing = (targetThreads ?? []).find((r: any) => mySet.has(r.thread_id));
      if (existing) {
        setCollabRequestError('Spolupráce s tímto uživatelem už existuje.');
        setCollabRequestLoading(false);
        return;
      }

      const { data: thread, error: threadErr } = await supabase
        .from('collab_threads')
        .insert({
          title: threadTitle,
          created_by: uid,
          status: 'active',
        })
        .select('id')
        .single();
      if (threadErr || !thread) throw threadErr || new Error('Vlákno nevytvořeno');

      const participants = [
        { thread_id: thread.id, user_id: uid, role: 'owner' },
        { thread_id: thread.id, user_id: profileId, role: 'guest' },
      ];
      const { error: partErr } = await supabase.from('collab_participants').insert(participants);
      if (partErr) throw partErr;

      await supabase
        .from('collab_messages')
        .insert({ thread_id: thread.id, user_id: uid, body: 'Ahoj, rád bych spolupracoval.' });

      // Notifikace pro partnera (API využívá service role, na FE jen voláme fetch)
      try {
        await fetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: profileId,
            type: 'collab_created',
            title: 'Nová spolupráce',
            body: threadTitle,
            item_type: 'collab_thread',
            item_id: thread.id,
          }),
        });
      } catch {
        // když notifikace selže, nebráníme založení vlákna
      }

      await new Promise((res) => setTimeout(res, 300)); // krátký wait
      // reload collabs
      const { data, error } = await supabase
        .from('collab_threads')
        .select('id, title, status, result_audio_url, result_cover_url, collab_participants!inner(user_id)')
        .eq('collab_participants.user_id', profileId)
        .order('updated_at', { ascending: false })
        .limit(10);
      if (!error && data) {
        const mapped: Collaboration[] = (data ?? []).map((c: any) => ({
          id: c.id,
          title: c.title,
          bpm: null,
          mood: c.status,
          audio_url: c.result_audio_url,
          cover_url: c.result_cover_url,
          partners: [],
        }));
        setCollabs(mapped);
      }
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string'
          ? (err as any).message
          : 'Neznámá chyba';
      console.error('Chyba při zakládání spolupráce:', err);
      setCollabRequestError('Nepodařilo se založit spolupráci: ' + message);
    } finally {
      setCollabRequestLoading(false);
    }
  };

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
    setCurrentTime(0);
    setDuration(0);
    setCurrentTrack(item);
    setIsPlaying((prev) => {
      if (currentTrack && currentTrack.id === item.id) {
        return !prev;
      }
      return true;
    });
  }

  function seekInCurrent(clientX: number, width: number) {
    const el = audioRef.current;
    if (!el || !duration) return;
    const ratio = Math.min(Math.max(clientX / width, 0), 1);
    const next = ratio * duration;
    el.currentTime = next;
    setCurrentTime(next);
    setIsPlaying(true);
    void el.play();
  }

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !currentTrack) return;
    el.src = currentTrack.url;
    const run = async () => {
      try {
        if (isPlaying) {
          await el.play();
        } else {
          el.pause();
        }
      } catch (err) {
        console.error('Audio play error:', err);
        setPlayerError('Nepodařilo se spustit audio.');
      }
    };
    run();
  }, [currentTrack, isPlaying]);

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

  return (
    <main className="min-h-screen bg-[#0c0f16] text-[var(--mpc-light)]">
      <audio
        ref={audioRef}
        className="hidden"
        onTimeUpdate={(e) => setCurrentTime((e.target as HTMLAudioElement).currentTime)}
        onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration || 0)}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
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
          <div className="ml-auto">
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
                const isLocked = project.access_mode && project.access_mode !== 'public' && currentUserId !== project.user_id;
                return (
                  <div
                    key={project.id}
                    className="rounded-2xl border border-[var(--mpc-dark)] bg-[var(--mpc-panel)] px-4 py-4 text-sm text-[var(--mpc-light)]"
                  >
                    {isLocked && (
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
                          onClick={() => setExpandedProjects((prev) => ({ ...prev, [project.id]: !prev[project.id] }))}
                          disabled={isLocked}
                          className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--mpc-accent)] text-white shadow-[0_8px_18px_rgba(243,116,51,0.35)] transition hover:translate-y-[1px] disabled:opacity-50"
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
                          {isLocked ? (
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
                          ) : project.tracks_json && project.tracks_json.length > 0 ? (
                            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                              {project.tracks_json.map((t, idx) => {
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
                                        disabled={isLocked || !t.url}
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
                                disabled={isLocked}
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
                                className="text-[11px] text-[var(--mpc-accent)] hover:text-white disabled:opacity-50"
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
            <div className="space-y-3 text-sm text-[var(--mpc-muted)]">
              <p>O spolupráce mohou žádat pouze registrovaní uživatelé.</p>
              {isLoggedIn && currentUserId !== profileId && (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleRequestCollab}
                    disabled={collabRequestLoading}
                    className="rounded-full border border-[var(--mpc-accent)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-white disabled:opacity-60"
                  >
                    {collabRequestLoading ? 'Zakládám…' : 'Požádat o spolupráci'}
                  </button>
                  {collabRequestError && (
                    <div className="rounded-md border border-red-700/40 bg-red-900/20 px-3 py-2 text-xs text-red-100">
                      {collabRequestError}
                    </div>
                  )}
                </div>
              )}
            </div>
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
              <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                {t('publicProfile.message.label', 'Zpráva')}
              </label>
              <textarea
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
