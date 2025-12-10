'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type ProfilePoint = {
  id: string;
  name: string;
  region?: string | null;
  avatar_url?: string | null;
};

type RegionShape = {
  id: string; // normalized klíč
  label: string;
  center: { x: number; y: number };
  scale: number;
  fill: string;
  stroke: string;
};

const normalizeRegion = (region?: string | null) =>
  (region || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/-/g, '');

// Stylizované tvary – používáme jednu šablonu a pozicujeme ji transformací, aby nevznikal chaos
const shapePath = 'M -70 -40 L 70 -40 L 95 0 L 40 70 L -30 70 L -90 10 Z';

const regions: RegionShape[] = [
  { label: 'Karlovarský kraj', center: { x: 140, y: 250 }, scale: 0.9, fill: '#f1f0f5', stroke: '#e1007a' },
  { label: 'Plzeňský kraj', center: { x: 210, y: 260 }, scale: 1, fill: '#ece6f2', stroke: '#e1007a' },
  { label: 'Ústecký kraj', center: { x: 250, y: 170 }, scale: 1, fill: '#f8e6f5', stroke: '#e1007a' },
  { label: 'Liberecký kraj', center: { x: 340, y: 160 }, scale: 0.95, fill: '#f3e1f4', stroke: '#e1007a' },
  { label: 'Královéhradecký kraj', center: { x: 370, y: 210 }, scale: 1, fill: '#efe1f4', stroke: '#e1007a' },
  { label: 'Pardubický kraj', center: { x: 320, y: 240 }, scale: 0.95, fill: '#eadff3', stroke: '#e1007a' },
  { label: 'Středočeský kraj', center: { x: 250, y: 240 }, scale: 1.05, fill: '#efe6f6', stroke: '#e1007a' },
  { label: 'Hlavní město Praha', center: { x: 260, y: 215 }, scale: 0.45, fill: '#e6e0f4', stroke: '#e1007a' },
  { label: 'Jihočeský kraj', center: { x: 230, y: 330 }, scale: 1.05, fill: '#e7e2f5', stroke: '#e1007a' },
  { label: 'Vysočina', center: { x: 320, y: 320 }, scale: 0.95, fill: '#e2def2', stroke: '#e1007a' },
  { label: 'Jihomoravský kraj', center: { x: 330, y: 380 }, scale: 1, fill: '#dbd8f0', stroke: '#e1007a' },
  { label: 'Olomoucký kraj', center: { x: 400, y: 300 }, scale: 0.95, fill: '#e1def3', stroke: '#e1007a' },
  { label: 'Zlínský kraj', center: { x: 430, y: 340 }, scale: 0.9, fill: '#e6dff2', stroke: '#e1007a' },
  { label: 'Moravskoslezský kraj', center: { x: 440, y: 240 }, scale: 1, fill: '#e7deef', stroke: '#e1007a' },
  // Slovensko
  { label: 'Bratislavský kraj', center: { x: 520, y: 380 }, scale: 0.9, fill: '#c8c8ff', stroke: '#7426ff' },
  { label: 'Trnavský kraj', center: { x: 500, y: 350 }, scale: 0.9, fill: '#b7c3ff', stroke: '#7426ff' },
  { label: 'Trenčiansky kraj', center: { x: 520, y: 320 }, scale: 0.9, fill: '#aabaff', stroke: '#7426ff' },
  { label: 'Nitriansky kraj', center: { x: 560, y: 360 }, scale: 0.9, fill: '#9eb0ff', stroke: '#7426ff' },
  { label: 'Žilinský kraj', center: { x: 540, y: 280 }, scale: 0.95, fill: '#94a7ff', stroke: '#7426ff' },
  { label: 'Banskobystrický kraj', center: { x: 580, y: 320 }, scale: 1.05, fill: '#8a9dff', stroke: '#7426ff' },
  { label: 'Prešovský kraj', center: { x: 640, y: 280 }, scale: 0.95, fill: '#f7b2b5', stroke: '#e1007a' },
  { label: 'Košický kraj', center: { x: 650, y: 340 }, scale: 1, fill: '#c9d7aa', stroke: '#008c4a' },
].map((r) => ({ ...r, id: normalizeRegion(r.label) }));

const baseMarkerColor = '#ff6fb7';

export default function OfflinePage() {
  const supabase = createClient();
  const [profiles, setProfiles] = useState<ProfilePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);

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
          .limit(300);
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

  const filteredProfiles = useMemo(() => {
    if (!selectedRegion) return profiles;
    return profiles.filter((p) => normalizeRegion(p.region) === selectedRegion);
  }, [profiles, selectedRegion]);

  const selectedLabel =
    selectedRegion ? regions.find((r) => r.id === selectedRegion)?.label ?? 'Vybraný kraj' : 'Všechny kraje';

  return (
    <main className="min-h-screen bg-[var(--mpc-deck,#06080f)] text-white">
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold uppercase tracking-[0.18em]">Mapa scény</h1>
            <p className="text-[12px] text-[var(--mpc-muted,#9aa3b5)]">
              {filteredProfiles.length} profilů {selectedRegion ? 'v kraji' : 'celkem'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {selectedRegion && (
              <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-[var(--mpc-muted)]">
                {selectedLabel}
              </span>
            )}
            <button
              onClick={() => setSelectedRegion(null)}
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-white hover:border-[var(--mpc-accent)]"
            >
              Zpět
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}

        <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-[#0f1627] via-[#0b101d] to-[#0f182d] p-5 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Mapa krajů</h2>
              <p className="text-[12px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                {filteredProfiles.length} profilů {selectedRegion ? 'v kraji' : 'celkem'}
              </p>
            </div>
            {loading && <span className="text-[12px] text-[var(--mpc-muted)]">Načítám…</span>}
          </div>

          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.06),transparent_45%),radial-gradient(circle_at_80%_60%,rgba(255,122,0,0.08),transparent_40%),linear-gradient(135deg,#0b0f18,#0a121f,#0c1a2a)]">
            <svg viewBox="0 0 720 480" className="w-full">
              <defs>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" />
                </filter>
              </defs>
              {regions.map((r) => {
                const isActive = selectedRegion ? selectedRegion === r.id : false;
                return (
                  <g
                    key={r.id}
                    transform={`translate(${r.center.x} ${r.center.y}) scale(${r.scale})`}
                    onClick={() => setSelectedRegion(isActive ? null : r.id)}
                    className="cursor-pointer"
                  >
                    <path
                      d={shapePath}
                      fill={r.fill}
                      stroke={r.stroke}
                      strokeWidth={isActive ? 6 : 4}
                      filter="url(#shadow)"
                      className="transition duration-150 hover:brightness-110"
                    />
                    <text
                      x={0}
                      y={6}
                      textAnchor="middle"
                      className="select-none text-[12px] font-semibold"
                      fill="#6c5a77"
                    >
                      {r.label}
                    </text>
                  </g>
                );
              })}

              {filteredProfiles.map((p) => {
                const reg = regions.find((rg) => normalizeRegion(rg.label) === normalizeRegion(p.region));
                if (!reg) return null;
                const isActive = selectedRegion ? normalizeRegion(p.region) === selectedRegion : true;
                const scale = reg.scale;
                const px = reg.center.x;
                const py = reg.center.y;
                return (
                  <g key={p.id} transform={`translate(${px} ${py})`} className="cursor-pointer">
                    <circle r={9} fill={isActive ? baseMarkerColor : '#ff9acb'} stroke="#111" strokeWidth={2} />
                    <rect
                      x={12}
                      y={-10}
                      rx={10}
                      ry={10}
                      width={200}
                      height={24}
                      fill="#0b0b0b"
                      stroke="#111"
                      strokeWidth={1}
                      opacity={0.8}
                    />
                    <text x={112} y={6} textAnchor="middle" fill="#fff" className="text-[11px]">
                      {p.name}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[var(--mpc-panel,#0b0f16)] p-5 shadow-[0_16px_34px_rgba(0,0,0,0.45)]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Podle kraje</h2>
            <span className="text-[12px] text-[var(--mpc-muted)]">Klikni na kraj pro filtr</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {regions.map((r) => {
              const key = r.id;
              const list = grouped[key] || [];
              const isActive = selectedRegion === key;
              if (selectedRegion && !isActive) return null;
              return (
                <div
                  key={r.id}
                  className={`rounded-xl border p-3 ${isActive ? 'border-[var(--mpc-accent)] bg-[var(--mpc-accent)]/10' : 'border-white/10 bg-black/30'}`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <button
                      className="text-left text-sm font-semibold uppercase tracking-[0.1em] text-white hover:text-[var(--mpc-accent)]"
                      onClick={() => setSelectedRegion(isActive ? null : key)}
                    >
                      {r.label}
                    </button>
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
