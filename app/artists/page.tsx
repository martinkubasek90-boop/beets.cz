'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase/client';

type ArtistCard = {
  id: string | number;
  name: string;
  initials: string;
  beatsCount?: number;
  projectsCount?: number;
  city?: string;
  avatar_url?: string | null;
};

const fallbackArtists: ArtistCard[] = [
  { id: 1, name: 'Northside', initials: 'NS', beatsCount: 12, projectsCount: 3, city: 'Praha' },
  { id: 2, name: 'No Bad Vibes', initials: 'NB', beatsCount: 9, projectsCount: 2, city: 'Brno' },
  { id: 3, name: 'Cay Caleb', initials: 'CC', beatsCount: 7, projectsCount: 1, city: 'Ostrava' },
  { id: 4, name: 'Neck', initials: 'NK', beatsCount: 5, projectsCount: 2, city: 'Praha' },
  { id: 5, name: 'Elevated', initials: 'EL', beatsCount: 14, projectsCount: 4, city: 'Plzeň' },
  { id: 6, name: 'Good Vibe', initials: 'GV', beatsCount: 11, projectsCount: 2, city: 'Brno' },
];

export default function ArtistsPage() {
  const supabase = createClient();
  const [artists, setArtists] = useState<ArtistCard[]>([]);

  const gradients = [
    'from-emerald-600 to-emerald-900',
    'from-amber-400 to-orange-600',
    'from-indigo-500 to-indigo-900',
    'from-purple-500 to-purple-800',
    'from-rose-500 to-rose-800',
    'from-sky-500 to-sky-900',
  ];

  const getInitials = (name: string) => {
    if (!name) return '??';
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const second = parts[1]?.[0] ?? parts[0]?.[1] ?? '';
    return (first + second).toUpperCase();
  };

  useEffect(() => {
    const load = async () => {
      try {
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .limit(50);
        if (error || !profiles || profiles.length === 0) {
          setArtists(fallbackArtists);
          return;
        }

        const [beatsResp, projectsResp] = await Promise.all([
          supabase.from('beats').select('user_id'),
          supabase.from('projects').select('user_id'),
        ]);

        const beatMap: Record<string, number> = {};
        const projMap: Record<string, number> = {};
        (beatsResp.data as any[] | null)?.forEach((row) => {
          if (row.user_id) beatMap[row.user_id] = (beatMap[row.user_id] || 0) + 1;
        });
        (projectsResp.data as any[] | null)?.forEach((row) => {
          if (row.user_id) projMap[row.user_id] = (projMap[row.user_id] || 0) + 1;
        });

        const mapped: ArtistCard[] = (profiles as any[]).map((p: any) => ({
          id: p.id,
          name: p.display_name || 'Bez jména',
          initials: getInitials(p.display_name || '??'),
          beatsCount: beatMap[p.id] || 0,
          projectsCount: projMap[p.id] || 0,
          city: '',
          avatar_url: p.avatar_url || null,
        }));
        setArtists(mapped);
      } catch (err) {
        console.error('Chyba při načítání umělců:', err);
        setArtists(fallbackArtists);
      }
    };
    void load();
  }, [supabase]);

  const list = artists.length ? artists : fallbackArtists;

  return (
    <main className="min-h-screen bg-[var(--mpc-deck,#050505)] text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold uppercase tracking-[0.18em]">Umělci</h1>
            <p className="text-[12px] text-[var(--mpc-muted,#8a8a8a)]">Seznam profilů na platformě</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/offline"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-white hover:border-[var(--mpc-accent)]"
            >
              Mapa scény
            </Link>
            <Link
              href="/"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-white hover:border-[var(--mpc-accent)]"
            >
              Zpět na homepage
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((artist, idx) => (
            <div
              key={artist.id}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-5 text-center shadow-[0_16px_32px_rgba(0,0,0,0.35)] hover:border-[var(--mpc-accent)]"
            >
              <div
                className={`relative h-28 w-28 overflow-hidden rounded-full border border-white/15 bg-gradient-to-br ${gradients[idx % gradients.length]} shadow-[0_10px_24px_rgba(0,0,0,0.35)]`}
              >
                {artist.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={artist.avatar_url} alt={artist.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-2xl font-black text-white">
                    {artist.initials}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold">{artist.name}</p>
                <p className="text-[12px] text-[var(--mpc-muted,#8a8a8a)]">
                  {artist.beatsCount ?? 0} beatů · {artist.projectsCount ?? 0} projektů{artist.city ? ` · ${artist.city}` : ''}
                </p>
              </div>
              <Link
                href={`/u/${artist.id}`}
                className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-white hover:border-[var(--mpc-accent)]"
              >
                Otevřít profil
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
