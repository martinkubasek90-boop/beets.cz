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

const regionPositions: Record<string, { x: number; y: number }> = {
  // Česko
  hlavnimestopraha: { x: 54, y: 50 },
  stredocesky: { x: 57, y: 55 },
  jihocesky: { x: 55, y: 70 },
  plzensky: { x: 45, y: 62 },
  karlovarsky: { x: 40, y: 56 },
  ustecky: { x: 50, y: 40 },
  liberecky: { x: 56, y: 34 },
  kralovehradecky: { x: 60, y: 40 },
  pardubicky: { x: 62, y: 48 },
  vysocina: { x: 60, y: 60 },
  jihomoravsky: { x: 70, y: 72 },
  olomoucky: { x: 72, y: 52 },
  zlinsky: { x: 76, y: 60 },
  moravskoslezsky: { x: 82, y: 50 },
  // Slovensko
  bratislavsky: { x: 84, y: 78 },
  trnavsky: { x: 82, y: 72 },
  trenciansky: { x: 82, y: 64 },
  nitriansky: { x: 86, y: 72 },
  zilinsky: { x: 84, y: 60 },
  banskobystricky: { x: 86, y: 66 },
  presovsky: { x: 92, y: 56 },
  kosicky: { x: 94, y: 60 },
};

function normalizeRegion(region?: string | null) {
  if (!region) return '';
  return region
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/-/g, '');
}

// deterministický fallback pro libovolný kraj v rámci CZ/SK bounding boxu
function hashRegionToCoord(region: string) {
  const norm = normalizeRegion(region) || 'nezname';
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = (hash * 31 + norm.charCodeAt(i)) >>> 0;
  }
  const x = 42 + (hash % 55); // 42–97 %
  const y = 25 + ((hash >> 5) % 60); // 25–85 %
  return { x, y };
}

function resolveRegionPosition(region?: string | null) {
  const norm = normalizeRegion(region);
  if (norm && regionPositions[norm]) return regionPositions[norm];
  if (!norm) return { x: 52, y: 52 };
  return hashRegionToCoord(norm);
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
          .select('id, display_name, avatar_url, region')
          .not('region', 'is', null)
          .not('region', 'eq', '')
          .limit(200);
        if (err) throw err;
        const mapped =
          (data as any[] | null)?.map((p) => ({
            id: p.id as string,
            name: (p.display_name as string) || 'Bez jména',
            region: p.region as string | null,
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
      const key = normalizeRegion(p.region) || 'nezname';
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
                {profiles.length} profilů s krajem
              </p>
            </div>
            {loading && <span className="text-[12px] text-[var(--mpc-muted)]">Načítám…</span>}
          </div>
          <div
            className="relative h-[460px] overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.06),transparent_45%),radial-gradient(circle_at_80%_60%,rgba(255,122,0,0.08),transparent_40%),linear-gradient(135deg,#0b0f18,#0a121f,#0c1a2a)]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 25%, rgba(255,255,255,0.05), transparent 35%), radial-gradient(circle at 75% 60%, rgba(255,122,0,0.08), transparent 40%), linear-gradient(135deg,#0b0f18,#0a121f,#0c1a2a), url(\"/map-cz-sk.svg\")',
              backgroundSize: 'cover, cover, cover, contain',
              backgroundRepeat: 'no-repeat, no-repeat, no-repeat, no-repeat',
              backgroundPosition: 'center',
            }}
          >
            <div className="absolute inset-0 pointer-events-none" />
            {profiles.map((p) => {
              const pos = resolveRegionPosition(p.region);
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
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--mpc-accent)] text-center text-[11px] font-bold text-black">
                    {p.avatar_url ? '' : initials}
                  </span>
                  <div className="max-w-[160px] truncate">
                    <div className="truncate text-white">{p.name}</div>
                    {p.region && <div className="text-[10px] uppercase tracking-[0.2em] text-white/70">{p.region}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[var(--mpc-panel,#0b0f16)] p-5 shadow-[0_16px_34px_rgba(0,0,0,0.45)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Podle kraje</h2>
            <span className="text-[12px] text-[var(--mpc-muted)]">Seřazeno abecedně</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([regionKey, list]) => {
                const label = list[0]?.region || regionKey || 'Neznámé';
                return (
                <div key={regionKey} className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold uppercase tracking-[0.1em]">{label}</span>
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
              );
              })}
          </div>
        </section>
      </div>
    </main>
  );
}
