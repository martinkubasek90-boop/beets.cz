'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useGlobalPlayer } from '@/components/global-player-provider';
import { FireButton } from '@/components/fire-button';
import { MainNav } from '@/components/main-nav';

type Acapella = {
  id: number | string;
  title: string;
  artist: string;
  bpm: number | null;
  mood: string | null;
  audio_url: string | null;
  cover_url?: string | null;
  user_id?: string | null;
  access_mode?: 'public' | 'request' | 'private' | null;
};

const dummyAcapellas: Acapella[] = [
  { id: 1, title: 'Raw take 01', artist: 'MC Demo', bpm: 90, mood: 'Boom bap', audio_url: null, cover_url: null },
  { id: 2, title: 'Hook idea', artist: 'MC Demo', bpm: 96, mood: 'Rough', audio_url: null, cover_url: null },
  { id: 3, title: 'Verse draft', artist: 'MC Demo', bpm: 82, mood: 'Lo-fi', audio_url: null, cover_url: null },
];

export default function AccapelasPage() {
  const supabase = createClient();
  const { play, current, isPlaying, currentTime, duration, setOnEnded } = useGlobalPlayer();
  const [acapellas, setAcapellas] = useState<Acapella[]>(dummyAcapellas);
  const [search, setSearch] = useState('');
  const [authorFilter, setAuthorFilter] = useState('all');
  const [bpmFilter, setBpmFilter] = useState('');
  const [moodFilter, setMoodFilter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .from('acapellas')
          .select('id, title, bpm, mood, audio_url, cover_url, user_id, access_mode')
          .order('created_at', { ascending: false })
          .limit(50);
        if (err) throw err;

        const rows = (data as any[]) ?? [];
        const userIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean) as string[]));
        let nameMap: Record<string, string> = {};
        if (userIds.length) {
          const { data: profiles, error: profErr } = await supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', userIds);
          if (profErr) {
            console.warn('Chyba při načítání autorů akapel:', profErr);
          } else if (profiles) {
            nameMap = Object.fromEntries((profiles as any[]).map((p) => [p.id, p.display_name || '']));
          }
        }

        if (rows.length) {
          setAcapellas(
            rows.map((row) => ({
              id: row.id,
              title: row.title || 'Akapela',
              bpm: row.bpm ?? null,
              mood: row.mood ?? null,
              audio_url: row.audio_url ?? null,
              cover_url: row.cover_url ?? null,
              user_id: row.user_id,
              access_mode: row.access_mode ?? null,
              artist: (row.user_id && nameMap[row.user_id]) || 'MC',
            }))
          );
          setError(null);
        } else {
          setAcapellas(dummyAcapellas);
          setError(null);
        }
      } catch (err: any) {
        console.error('Chyba při načítání akapel:', err);
        setAcapellas(dummyAcapellas);
        setError(null);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [supabase]);

  const filtered = useMemo(() => {
    return acapellas.filter((a) => {
      const matchesSearch =
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        (a.artist || '').toLowerCase().includes(search.toLowerCase());
      const matchesAuthor = authorFilter === 'all' || (a.artist || '') === authorFilter;
      const matchesBpm = bpmFilter ? String(a.bpm || '').includes(bpmFilter.trim()) : true;
      const matchesMood = moodFilter
        ? (a.mood || '').toLowerCase().includes(moodFilter.toLowerCase())
        : true;
      return matchesSearch && matchesAuthor && matchesBpm && matchesMood;
    });
  }, [acapellas, search, authorFilter, bpmFilter, moodFilter]);

  const authors = useMemo(() => {
    const names = Array.from(new Set(acapellas.map((a) => a.artist || '').filter(Boolean)));
    return names;
  }, [acapellas]);

  const playAcapella = (item: Acapella) => {
    if (!item.audio_url) return;
    play({
      id: item.id,
      title: item.title,
      artist: item.artist,
      url: item.audio_url,
      cover_url: item.cover_url,
      user_id: item.user_id,
      item_type: 'acapella',
    });
    const playable = filtered.filter((a) => a.audio_url);
    if (playable.length <= 1) {
      setOnEnded(null);
      return;
    }
    setOnEnded(() => {
      const idx = playable.findIndex((a) => a.id === item.id);
      if (idx === -1) {
        setOnEnded(null);
        return;
      }
      const next = playable.slice(idx + 1).find((a) => a.audio_url);
      if (next) {
        playAcapella(next);
      } else {
        setOnEnded(null);
      }
    });
  };

  return (
    <main className="min-h-screen bg-[var(--mpc-deck,#050505)] text-white">
      <MainNav />
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold uppercase tracking-[0.18em]">Akapely</h1>
            <p className="text-[12px] text-[var(--mpc-muted)]">Všechny nahrané akapely</p>
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
            placeholder="Hledat akapelu…"
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

        {loading && <p className="text-[12px] text-[var(--mpc-muted)]">Načítám akapely…</p>}
        {error && (
          <div className="rounded-md border border-yellow-700/40 bg-yellow-900/30 px-3 py-2 text-sm text-yellow-100">
            {error}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="relative rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur transition hover:border-[var(--mpc-accent)]"
              style={{ overflow: 'visible' }}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="h-32 w-32 overflow-hidden rounded-xl border border-white/15 bg-white/5 shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
                  {item.user_id ? (
                    <Link href={`/u/${item.user_id}`} className="block h-full w-full">
                      {item.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.cover_url} alt={item.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[var(--mpc-accent)] to-[var(--mpc-accent-2,#f37433)] text-xl font-black text-white">
                          {item.title.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </Link>
                  ) : item.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.cover_url} alt={item.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-gradient-to-br from-[var(--mpc-accent)] to-[var(--mpc-accent-2,#f37433)] text-xl font-black text-white">
                      {item.title.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="space-y-1 text-center">
                  <p className="text-lg font-semibold text-white">{item.title}</p>
                  <p className="text-[12px] text-[var(--mpc-muted)]">{item.artist}</p>
                  <p className="text-[11px] text-[var(--mpc-muted)]">
                    {item.bpm ? `${item.bpm} BPM · ` : ''}{item.mood || 'Mood'}
                  </p>
                  <div className="mt-2 flex items-center justify-center gap-2 text-[11px]">
                    <span
                      className={`rounded-full border px-2 py-[2px] uppercase tracking-[0.14em] ${
                        item.access_mode === 'request'
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-100'
                          : item.access_mode === 'private'
                            ? 'border-red-500/40 bg-red-500/10 text-red-100'
                            : 'border-white/15 bg-white/5 text-[var(--mpc-muted)]'
                      }`}
                    >
                      {item.access_mode === 'request'
                        ? 'Na žádost'
                        : item.access_mode === 'private'
                          ? 'Soukromá'
                          : 'Veřejná'}
                    </span>
                    {item.access_mode === 'request' && (
                      <button
                        onClick={() => alert('Žádost o přístup byla odeslána.')}
                        className="rounded-full border border-[var(--mpc-accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white hover:bg-[var(--mpc-accent)] hover:text-black"
                      >
                        Požádat o přístup
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => playAcapella(item)}
                  disabled={!item.audio_url}
                  className="rounded-full border border-[var(--mpc-accent)] bg-[var(--mpc-accent)]/10 px-5 py-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--mpc-accent)] shadow-[0_10px_24px_rgba(243,116,51,0.35)] hover:bg-[var(--mpc-accent)] hover:text-black disabled:opacity-50"
                >
                  {current?.id === item.id && isPlaying ? 'Pause' : 'Play'}
                </button>
                <FireButton itemType="acapella" itemId={String(item.id)} className="mt-1" />
                {current?.id === item.id && (
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
