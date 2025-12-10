'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type ProfilePoint = {
  id: string;
  name: string;
  city?: string | null;
  avatar_url?: string | null;
};

const cityPositions: Record<string, { x: number; y: number }> = {
  praha: { x: 54, y: 50 },
  brno: { x: 71, y: 70 },
  ostrava: { x: 82, y: 46 },
  plzen: { x: 44, y: 58 },
  liberec: { x: 56, y: 28 },
  olomouc: { x: 72, y: 55 },
  hradec: { x: 61, y: 38 },
  pardubice: { x: 62, y: 44 },
  'ceske budejovice': { x: 55, y: 72 },
  zlin: { x: 75, y: 68 },
  bratislava: { x: 84, y: 78 },
  kosice: { x: 94, y: 58 },
  zilina: { x: 86, y: 64 },
  nitra: { x: 86, y: 72 },
  trnava: { x: 83, y: 74 },
  presov: { x: 94, y: 54 },
  'banska bystrica': { x: 86, y: 69 },
  trencin: { x: 81, y: 68 },
};

function normalizeCity(city?: string | null) {
  if (!city) return '';
  return city.trim().toLowerCase();
}

export default function OfflinePage() {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<ProfilePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: err } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, city')
          .not('city', 'is', null)
          .not('city', 'eq', '')
          .limit(200);
        if (err) throw err;
        const mapped =
          (data as any[] | null)?.map((p) => ({
            id: p.id as string,
            name: (p.display_name as string) || 'Bez jména',
            city: p.city as string | null,
            avatar_url: p.avatar_url as string | null,
          })) ?? [];
        setProfiles(mapped);
      } catch (err: any) {
        console.error('Chyba načítání mapy:', err);
        setError('Nepodařilo se načíst profily pro mapu.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [supabase]);

  const grouped = useMemo(() => {
    const map: Record<string, ProfilePoint[]> = {};
    profiles.forEach((p) => {
      const key = normalizeCity(p.city) || 'neznamé';
      if (!map[key]) map[key] = [];
      map[key].push(p);
    });
    return map;
  }, [profiles]);

  return (
    <main className="min-h-screen bg-[var(--mpc-deck,#06080f)] text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold uppercase tracking-[0.18em]">Beets × Offline</h1>
            <p className="text-[12px] text-[var(--mpc-muted,#9aa3b5)]">Kdo je kde v Česku a na Slovensku</p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-white hover:border-[var(--mpc-accent)]"
          >
            Zpět
          </Link>
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}

        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0f1627] via-[#0b101d] to-[#0f182d] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Mapa scény</h2>
              <p className="text-[12px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                {profiles.length} profilů s městem
              </p>
            </div>
            {loading && <span className="text-[12px] text-[var(--mpc-muted)]">Načítám…</span>}
          </div>
          <div className="relative h-[380px] overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.08),transparent_45%),radial-gradient(circle_at_80%_60%,rgba(255,122,0,0.08),transparent_40%),linear-gradient(135deg,#0b0f18,#0a121f,#0c1a2a)]">
            <div className="absolute inset-0 pointer-events-none" />
            {profiles
              .filter((p) => normalizeCity(p.city) in cityPositions)
              .map((p) => {
                const pos = cityPositions[normalizeCity(p.city)];
                const initials = p.name
                  .split(' ')
                  .map((s) => s[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
                return (
                  <div
                    key={p.id}
                    className="absolute flex items-center gap-2 rounded-full border border-white/20 bg-black/70 px-2 py-1 text-[12px] shadow-[0_8px_20px_rgba(0,0,0,0.4)]"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
                  >
                    <span className="h-6 w-6 rounded-full bg-[var(--mpc-accent)] text-center text-[11px] font-bold text-black">
                      {p.avatar_url ? '' : initials}
                    </span>
                    <span className="max-w-[140px] truncate">{p.name}</span>
                  </div>
                );
              })}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[var(--mpc-panel,#0b0f16)] p-5 shadow-[0_16px_34px_rgba(0,0,0,0.45)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Podle města</h2>
            <span className="text-[12px] text-[var(--mpc-muted)]">Seřazeno abecedně</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([city, list]) => (
                <div key={city} className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold uppercase tracking-[0.1em]">{city || 'Neznámé'}</span>
                    <span className="text-[12px] text-[var(--mpc-muted)]">{list.length} profilů</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {list.slice(0, 10).map((p) => (
                      <span
                        key={p.id}
                        className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[12px] text-white hover:border-[var(--mpc-accent)]"
                      >
                        {p.name}
                      </span>
                    ))}
                    {list.length > 10 && (
                      <span className="text-[12px] text-[var(--mpc-muted)]">+{list.length - 10} dalších</span>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </section>
      </div>
    </main>
  );
}
