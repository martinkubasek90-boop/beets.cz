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
  id: string;
  label: string;
  path: string;
  fill: string;
  stroke: string;
  center: { x: number; y: number };
};

// Stylizované kraje (ČR + SR) inspirované referencí
const regions: RegionShape[] = [
  { id: 'karlovarsky', label: 'Karlovarský kraj', path: 'M20 200 L80 150 L130 180 L110 230 L60 240 Z', fill: '#f2f0f5', stroke: '#e1007a', center: { x: 90, y: 200 } },
  { id: 'plzensky', label: 'Plzeňský kraj', path: 'M80 150 L160 140 L210 190 L180 240 L120 235 L140 190 Z', fill: '#e1dcf1', stroke: '#e1007a', center: { x: 160, y: 200 } },
  { id: 'ustecky', label: 'Ústecký kraj', path: 'M160 110 L240 95 L270 135 L215 190 L175 145 Z', fill: '#f6e1f4', stroke: '#e1007a', center: { x: 215, y: 145 } },
  { id: 'liberecky', label: 'Liberecký kraj', path: 'M270 110 L320 90 L355 130 L315 175 L270 150 Z', fill: '#f2ddf3', stroke: '#e1007a', center: { x: 315, y: 145 } },
  { id: 'kralovehradecky', label: 'Královéhradecký kraj', path: 'M265 150 L330 175 L355 205 L305 230 L245 205 Z', fill: '#eddcf3', stroke: '#e1007a', center: { x: 305, y: 195 } },
  { id: 'pardubicky', label: 'Pardubický kraj', path: 'M240 205 L300 230 L310 270 L255 270 L225 230 Z', fill: '#e9dbf3', stroke: '#e1007a', center: { x: 275, y: 235 } },
  { id: 'stredocesky', label: 'Středočeský kraj', path: 'M160 140 L245 200 L220 235 L180 255 L130 225 L120 185 Z', fill: '#eddff6', stroke: '#e1007a', center: { x: 190, y: 205 } },
  { id: 'praha', label: 'Hlavní město Praha', path: 'M205 200 L222 195 L232 208 L215 222 L200 212 Z', fill: '#e8e0f4', stroke: '#e1007a', center: { x: 218, y: 208 } },
  { id: 'jihocesky', label: 'Jihočeský kraj', path: 'M125 240 L190 255 L225 285 L195 340 L130 330 L95 275 Z', fill: '#e6e0f6', stroke: '#e1007a', center: { x: 170, y: 290 } },
  { id: 'vysocina', label: 'Vysočina', path: 'M185 255 L225 235 L265 270 L265 300 L220 310 L190 340 L200 285 Z', fill: '#dfdbf1', stroke: '#e1007a', center: { x: 230, y: 275 } },
  { id: 'jihomoravsky', label: 'Jihomoravský kraj', path: 'M220 310 L270 300 L320 320 L290 370 L230 370 L200 340 Z', fill: '#d9d6ef', stroke: '#e1007a', center: { x: 270, y: 335 } },
  { id: 'olomoucky', label: 'Olomoucký kraj', path: 'M255 270 L320 270 L350 295 L330 325 L290 325 L265 300 Z', fill: '#e0def3', stroke: '#e1007a', center: { x: 310, y: 300 } },
  { id: 'zlinsky', label: 'Zlínský kraj', path: 'M330 270 L380 255 L410 290 L370 330 L340 325 Z', fill: '#e4dff3', stroke: '#e1007a', center: { x: 365, y: 295 } },
  { id: 'moravskoslezsky', label: 'Moravskoslezský kraj', path: 'M310 230 L385 215 L420 255 L400 295 L360 260 L320 270 Z', fill: '#e6dfef', stroke: '#e1007a', center: { x: 380, y: 250 } },
  // Slovensko
  { id: 'bratislavsky', label: 'Bratislavský kraj', path: 'M330 350 L375 340 L410 360 L390 400 L350 380 Z', fill: '#c8c8ff', stroke: '#7426ff', center: { x: 375, y: 370 } },
  { id: 'trnavsky', label: 'Trnavský kraj', path: 'M305 330 L355 315 L380 340 L350 380 L310 360 Z', fill: '#b7c3ff', stroke: '#7426ff', center: { x: 350, y: 345 } },
  { id: 'trenciansky', label: 'Trenčiansky kraj', path: 'M330 300 L375 280 L405 305 L395 350 L350 320 Z', fill: '#aabaff', stroke: '#7426ff', center: { x: 380, y: 305 } },
  { id: 'nitriansky', label: 'Nitriansky kraj', path: 'M375 340 L435 335 L470 355 L435 395 L395 395 Z', fill: '#a0b2ff', stroke: '#7426ff', center: { x: 430, y: 360 } },
  { id: 'zilinsky', label: 'Žilinský kraj', path: 'M375 260 L420 245 L455 275 L410 320 L395 290 Z', fill: '#97acff', stroke: '#7426ff', center: { x: 425, y: 280 } },
  { id: 'banskobystricky', label: 'Banskobystrický kraj', path: 'M395 320 L455 275 L475 305 L475 360 L445 395 L410 370 Z', fill: '#8da0ff', stroke: '#7426ff', center: { x: 445, y: 325 } },
  { id: 'presovsky', label: 'Prešovský kraj', path: 'M445 245 L500 235 L535 260 L510 305 L470 315 L450 280 Z', fill: '#f7b2b5', stroke: '#e1007a', center: { x: 500, y: 275 } },
  { id: 'kosicky', label: 'Košický kraj', path: 'M470 315 L510 305 L550 315 L550 360 L515 385 L480 365 Z', fill: '#c9d7aa', stroke: '#008c4a', center: { x: 515, y: 340 } },
];

const normalizeRegion = (region?: string | null) =>
  (region || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/-/g, '');

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
            <h1 className="text-2xl font-semibold uppercase tracking-[0.18em]">Beets × Offline</h1>
            <p className="text-[12px] text-[var(--mpc-muted,#9aa3b5)]">Kdo je kde v Česku a na Slovensku</p>
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
              <h2 className="text-lg font-semibold text-white">Mapa scény</h2>
              <p className="text-[12px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                {filteredProfiles.length} profilů {selectedRegion ? 'v kraji' : 'celkem'}
              </p>
            </div>
            {loading && <span className="text-[12px] text-[var(--mpc-muted)]">Načítám…</span>}
          </div>

          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.06),transparent_45%),radial-gradient(circle_at_80%_60%,rgba(255,122,0,0.08),transparent_40%),linear-gradient(135deg,#0b0f18,#0a121f,#0c1a2a)]">
            <svg viewBox="0 0 580 430" className="w-full">
              <defs>
                <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity="0.4" />
                </filter>
              </defs>
              {regions.map((r) => {
                const isActive = selectedRegion ? selectedRegion === r.id : false;
                return (
                  <g key={r.id}>
                    <path
                      d={r.path}
                      fill={r.fill}
                      stroke={r.stroke}
                      strokeWidth={isActive ? 4 : 3}
                      filter="url(#shadow)"
                      className="cursor-pointer transition duration-150 hover:brightness-110"
                      onClick={() => setSelectedRegion(selectedRegion === r.id ? null : r.id)}
                    />
                    <text
                      x={r.center.x}
                      y={r.center.y}
                      textAnchor="middle"
                      className="select-none text-[12px] font-semibold"
                      fill={isActive ? '#ffffff' : '#6b4b75'}
                      onClick={() => setSelectedRegion(selectedRegion === r.id ? null : r.id)}
                    >
                      {r.label}
                    </text>
                  </g>
                );
              })}

              {filteredProfiles.map((p) => {
                const r = regions.find((rg) => normalizeRegion(rg.id) === normalizeRegion(p.region));
                if (!r) return null;
                const isActive = selectedRegion ? normalizeRegion(p.region) === selectedRegion : true;
                return (
                  <g key={p.id} transform={`translate(${r.center.x}, ${r.center.y})`} className="cursor-pointer">
                    <circle r={9} fill={isActive ? '#ff6fb7' : '#ff9acb'} stroke="#111" strokeWidth={2} />
                    <rect
                      x={12}
                      y={-10}
                      rx={10}
                      ry={10}
                      width={160}
                      height={24}
                      fill="#0b0b0b"
                      stroke="#111"
                      strokeWidth={1}
                      opacity={0.8}
                    />
                    <text x={92} y={6} textAnchor="middle" fill="#fff" className="text-[11px]">
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
              const key = normalizeRegion(r.id);
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
