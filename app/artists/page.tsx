'use client';

import Link from 'next/link';

type ArtistCard = {
  id: number;
  name: string;
  initials: string;
  followers: number;
  city?: string;
};

const artists: ArtistCard[] = [
  { id: 1, name: 'Northside', initials: 'NS', followers: 88400, city: 'Praha' },
  { id: 2, name: 'No Bad Vibes', initials: 'NB', followers: 21000, city: 'Brno' },
  { id: 3, name: 'Cay Caleb', initials: 'CC', followers: 22000, city: 'Ostrava' },
  { id: 4, name: 'Neck', initials: 'NK', followers: 6354, city: 'Praha' },
  { id: 5, name: 'Elevated', initials: 'EL', followers: 14860, city: 'Plzeň' },
  { id: 6, name: 'Good Vibe', initials: 'GV', followers: 30200, city: 'Brno' },
];

export default function ArtistsPage() {
  const gradients = [
    'from-emerald-600 to-emerald-900',
    'from-amber-400 to-orange-600',
    'from-indigo-500 to-indigo-900',
    'from-purple-500 to-purple-800',
    'from-rose-500 to-rose-800',
    'from-sky-500 to-sky-900',
  ];

  return (
    <main className="min-h-screen bg-[var(--mpc-deck,#050505)] text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold uppercase tracking-[0.18em]">Umělci</h1>
            <p className="text-[12px] text-[var(--mpc-muted,#8a8a8a)]">Seznam profilů na platformě</p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-white hover:border-[var(--mpc-accent)]"
          >
            Zpět na homepage
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {artists.map((artist, idx) => (
            <div
              key={artist.id}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-5 text-center shadow-[0_16px_32px_rgba(0,0,0,0.35)] hover:border-[var(--mpc-accent)]"
            >
              <div
                className={`relative h-28 w-28 overflow-hidden rounded-full border border-white/15 bg-gradient-to-br ${gradients[idx % gradients.length]} shadow-[0_10px_24px_rgba(0,0,0,0.35)]`}
              >
                <div className="absolute inset-0 grid place-items-center text-2xl font-black text-white">
                  {artist.initials}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-base font-semibold">{artist.name}</p>
                <p className="text-[12px] text-[var(--mpc-muted,#8a8a8a)]">
                  👥 {artist.followers.toLocaleString('cs-CZ')} followers
                  {artist.city ? ` · ${artist.city}` : ''}
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
