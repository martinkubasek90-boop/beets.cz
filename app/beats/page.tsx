'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { FireButton } from '@/components/fire-button';

type Beat = {
  id: number | string;
  title: string;
  artist: string;
  bpm: number | null;
  mood: string | null;
  audio_url: string | null;
  cover_url?: string | null;
  user_id?: string | null;
};

const dummyBeats: Beat[] = [
  { id: 1, title: 'Noční linka', artist: 'Northside', bpm: 90, mood: 'Boom bap', audio_url: null, cover_url: null },
  { id: 2, title: 'Panel Story', artist: 'Blockboy', bpm: 96, mood: 'Rough / grime', audio_url: null, cover_url: null },
  { id: 3, title: 'Beton Dreams', artist: 'LoFi Karel', bpm: 82, mood: 'Lo-fi', audio_url: null, cover_url: null },
];

export default function BeatsPage() {
  const supabase = createClient();
  const [beats, setBeats] = useState<Beat[]>(dummyBeats);
  const [search, setSearch] = useState('');
  const [authorFilter, setAuthorFilter] = useState('all');
  const [bpmFilter, setBpmFilter] = useState('');
  const [moodFilter, setMoodFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTrack, setCurrentTrack] = useState<Beat | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressPercent =
    currentTrack && duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;

  const formatTime = (sec?: number) => {
    if (!sec || !Number.isFinite(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, '0');
    return `${m}:${s}`;
  };

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
    const load = async () => {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .from('beats')
          .select('id, title, artist, user_id, bpm, mood, audio_url, cover_url, created_at')
          .order('id', { ascending: false })
          .limit(30);
        if (err) throw err;
        if (data && data.length) {
          setBeats(data as Beat[]);
          setError(null);
        } else {
          setBeats(dummyBeats);
          setError(null);
        }
      } catch (err: any) {
        console.error('Chyba při načítání beatů:', err);
        setBeats(dummyBeats);
        setError('Nepodařilo se načíst beaty ze Supabase. Zobrazuji demo.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [supabase]);

  const filtered = useMemo(() => {
    return beats.filter((b) => {
      const matchesSearch =
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        (b.artist || '').toLowerCase().includes(search.toLowerCase());
      const matchesAuthor = authorFilter === 'all' || (b.artist || '') === authorFilter;
      const matchesBpm = bpmFilter ? String(b.bpm || '').includes(bpmFilter.trim()) : true;
      const matchesMood = moodFilter
        ? (b.mood || '').toLowerCase().includes(moodFilter.toLowerCase())
        : true;
      return matchesSearch && matchesAuthor && matchesBpm && matchesMood;
    });
  }, [beats, search, authorFilter, bpmFilter, moodFilter]);

  const authors = useMemo(() => {
    const names = Array.from(new Set(beats.map((b) => b.artist || '').filter(Boolean)));
    return names;
  }, [beats]);

  const playBeat = (beat: Beat) => {
    if (!beat.audio_url || !audioRef.current) return;
    if (currentTrack?.id === beat.id) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
      return;
    }
    setCurrentTrack(beat);
    audioRef.current.src = beat.audio_url;
    audioRef.current.currentTime = 0;
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  };

  return (
    <main className="min-h-screen bg-[var(--mpc-deck,#050505)] text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold uppercase tracking-[0.18em]">Beaty</h1>
            <p className="text-[12px] text-[var(--mpc-muted)]">Všechny nahrané beaty</p>
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
            placeholder="Hledat beat…"
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
          <input
            value={bpmFilter}
            onChange={(e) => setBpmFilter(e.target.value)}
            placeholder="BPM (např. 96)"
            className="w-full max-w-[120px] rounded border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
          />
          <input
            value={moodFilter}
            onChange={(e) => setMoodFilter(e.target.value)}
            placeholder="Mood / vibe (boom bap, lo-fi…)"
            className="w-full max-w-xs rounded border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
          />
        </div>

        {loading && <p className="text-[12px] text-[var(--mpc-muted)]">Načítám beaty…</p>}
        {error && (
          <div className="rounded-md border border-yellow-700/40 bg-yellow-900/30 px-3 py-2 text-sm text-yellow-100">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((beat) => (
            <div
              key={beat.id}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur transition hover:border-[var(--mpc-accent)]"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="h-32 w-32 overflow-hidden rounded-xl border border-white/15 bg-white/5 shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
                  {beat.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={beat.cover_url} alt={beat.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[var(--mpc-accent)] to-[var(--mpc-accent-2,#f37433)] text-xl font-black text-white">
                      {beat.title.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="space-y-1 text-center">
                  <p className="text-lg font-semibold text-white">{beat.title}</p>
                  <p className="text-[12px] text-[var(--mpc-muted)]">{beat.artist}</p>
                  <p className="text-[11px] text-[var(--mpc-muted)]">
                    {beat.bpm ? `${beat.bpm} BPM · ` : ''}{beat.mood || 'Mood'}
                  </p>
                </div>
                <button
                  onClick={() => playBeat(beat)}
                  disabled={!beat.audio_url}
                  className="rounded-full border border-[var(--mpc-accent)] bg-[var(--mpc-accent)]/10 px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--mpc-accent)] shadow-[0_10px_24px_rgba(243,116,51,0.35)] hover:bg-[var(--mpc-accent)] hover:text-black disabled:opacity-50"
                >
                  {currentTrack?.id === beat.id && isPlaying ? 'Pause' : 'Play'}
                </button>
                <FireButton
                  itemType="beat"
                  itemId={String(beat.id)}
                  className="mt-1"
                />
                {currentTrack?.id === beat.id && (
                  <div className="w-full">
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[var(--mpc-accent)] shadow-[0_6px_16px_rgba(255,75,129,0.35)]"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-[var(--mpc-muted)]">
                      <span>{Math.floor(currentTime)} s</span>
                      <span>{Math.floor(duration)} s</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-black/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3 text-sm">
            <div className="min-w-[160px] flex-1">
              <p className="font-semibold text-white">{currentTrack.title}</p>
              <p className="text-[11px] text-[var(--mpc-muted)]">{currentTrack.artist}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => playBeat(currentTrack)}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--mpc-accent)] text-black font-bold shadow-[0_10px_24px_rgba(243,116,51,0.35)]"
              >
                {isPlaying ? '▮▮' : '►'}
              </button>
              <FireButton itemType="beat" itemId={String(currentTrack.id)} />
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[var(--mpc-accent)] shadow-[0_6px_16px_rgba(255,75,129,0.35)]"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-[var(--mpc-muted)]">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
