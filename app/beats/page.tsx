'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { FireButton } from '@/components/fire-button';
import { useGlobalPlayer } from '@/components/global-player-provider';
import { MainNav } from '@/components/main-nav';

type Beat = {
  id: number | string;
  title: string;
  artist: string;
  bpm: number | null;
  mood: string | null;
  audio_url: string | null;
  cover_url?: string | null;
  user_id?: string | null;
  created_at?: string | null;
};

const dummyBeats: Beat[] = [
  { id: 1, title: 'Noční linka', artist: 'Northside', bpm: 90, mood: 'Boom bap', audio_url: null, cover_url: null },
  { id: 2, title: 'Panel Story', artist: 'Blockboy', bpm: 96, mood: 'Rough / grime', audio_url: null, cover_url: null },
  { id: 3, title: 'Beton Dreams', artist: 'LoFi Karel', bpm: 82, mood: 'Lo-fi', audio_url: null, cover_url: null },
];

export default function BeatsPage() {
  const supabase = createClient();
  const { play, current, isPlaying, currentTime, duration, setOnEnded, setOnNext, setOnPrev } = useGlobalPlayer();
  const [beats, setBeats] = useState<Beat[]>(dummyBeats);
  const [fires, setFires] = useState<{ item_id: string; created_at: string }[]>([]);
  const [search, setSearch] = useState('');
  const [authorFilter, setAuthorFilter] = useState('all');
  const [bpmFilter, setBpmFilter] = useState('');
  const [moodFilter, setMoodFilter] = useState('');
  const [sortMode, setSortMode] = useState<'recent' | 'week' | 'month' | 'year'>('recent');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const loadFires = async () => {
      try {
        const startOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString();
        const { data, error: err } = await supabase
          .from('fires')
          .select('item_id, created_at')
          .eq('item_type', 'beat')
          .gte('created_at', startOfYear);
        if (err) throw err;
        setFires((data as any[]) ?? []);
      } catch (err) {
        console.warn('Nepodařilo se načíst ohně pro řazení:', err);
      }
    };
    void loadFires();
  }, [supabase]);

  const fireCounts = useMemo(() => {
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const monthMs = 30 * 24 * 60 * 60 * 1000;
    const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
    const weekMap: Record<string, number> = {};
    const monthMap: Record<string, number> = {};
    const yearMap: Record<string, number> = {};
    fires.forEach((f) => {
      const ts = new Date(f.created_at).getTime();
      if (Number.isNaN(ts)) return;
      if (ts >= now - weekMs) weekMap[f.item_id] = (weekMap[f.item_id] || 0) + 1;
      if (ts >= now - monthMs) monthMap[f.item_id] = (monthMap[f.item_id] || 0) + 1;
      if (ts >= yearStart) yearMap[f.item_id] = (yearMap[f.item_id] || 0) + 1;
    });
    return { weekMap, monthMap, yearMap };
  }, [fires]);

  const filtered = useMemo(() => {
    const base = beats.filter((b) => {
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

    if (sortMode === 'recent') return base;
    const { weekMap, monthMap, yearMap } = fireCounts;
    const getScore = (b: Beat) => {
      const id = String(b.id);
      if (sortMode === 'week') return weekMap[id] || 0;
      if (sortMode === 'month') return monthMap[id] || 0;
      return yearMap[id] || 0;
    };
    return [...base].sort((a, b) => getScore(b) - getScore(a));
  }, [beats, search, authorFilter, bpmFilter, moodFilter, sortMode, fireCounts]);

  const authors = useMemo(() => {
    const names = Array.from(new Set(beats.map((b) => b.artist || '').filter(Boolean)));
    return names;
  }, [beats]);

  const queueRef = useRef<Beat[]>([]);
  const queueIdxRef = useRef<number>(0);

  useEffect(() => {
    queueRef.current = filtered.filter((b) => b.audio_url);
  }, [filtered]);

  const playBeat = (beat: Beat) => {
    if (!beat.audio_url) return;
    const queue = queueRef.current;
    if (!queue.length) return;

    const playAt = (idx: number) => {
      const target = queue[idx];
      if (!target?.audio_url) return;
      queueIdxRef.current = idx;
      play({
        id: target.id,
        title: target.title,
        artist: target.artist,
        url: target.audio_url,
        cover_url: target.cover_url,
        user_id: target.user_id,
      });
    };

    const idx = queue.findIndex((b) => b.id === beat.id);
    const startIdx = idx === -1 ? 0 : idx;
    playAt(startIdx);

    const go = (direction: 1 | -1) => {
      const q = queueRef.current;
      if (!q.length) return;
      const next = (queueIdxRef.current + direction + q.length) % q.length;
      playAt(next);
    };

    setOnNext?.(() => go(1));
    setOnPrev?.(() => go(-1));
    setOnEnded?.(() => go(1));
  };

  useEffect(() => {
    return () => {
      setOnEnded(null);
      setOnNext?.(null);
      setOnPrev?.(null);
    };
  }, [setOnEnded, setOnNext, setOnPrev]);

  return (
    <main className="min-h-screen bg-[var(--mpc-deck,#050505)] text-white">
      <MainNav />
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
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
            className="rounded border border-white/15 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
          >
            <option value="recent">Nejnovější</option>
            <option value="week">Top beaty (týden)</option>
            <option value="month">Top beaty (měsíc)</option>
            <option value="year">Top beaty (rok)</option>
          </select>
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
                  {beat.user_id ? (
                    <Link href={`/u/${beat.user_id}`} className="block h-full w-full">
                      {beat.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={beat.cover_url} alt={beat.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[var(--mpc-accent)] to-[var(--mpc-accent-2,#f37433)] text-xl font-black text-white">
                          {beat.title.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </Link>
                  ) : beat.cover_url ? (
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
                  {current?.id === beat.id && isPlaying ? 'Pause' : 'Play'}
                </button>
                <FireButton itemType="beat" itemId={String(beat.id)} className="mt-1" />
                {current?.id === beat.id && (
                  <div className="w-full">
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-[var(--mpc-accent)] shadow-[0_6px_16px_rgba(255,75,129,0.35)]"
                        style={{ width: duration ? `${Math.min((currentTime / duration) * 100, 100)}%` : '0%' }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-[var(--mpc-muted)]">
                      <span>{Math.floor(currentTime)} s</span>
                      <span>{duration ? Math.floor(duration) : '--'} s</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
