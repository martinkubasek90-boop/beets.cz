'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import type { LatLngExpression } from 'leaflet';
import { createClient } from '@/lib/supabase/client';

type ProfilePoint = {
  id: string;
  name: string;
  region?: string | null;
  avatar_url?: string | null;
};

type RegionDef = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  color: string;
  border: string;
};

const normalizeRegion = (region?: string | null) =>
  (region || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/-/g, '');

const regions: RegionDef[] = [
  { id: 'karlovarskykraj', label: 'Karlovarský kraj', lat: 50.22, lng: 12.88, color: '#f6f2ff', border: '#e1007a' },
  { id: 'plzenskykraj', label: 'Plzeňský kraj', lat: 49.75, lng: 13.38, color: '#f2ecff', border: '#e1007a' },
  { id: 'usteckykraj', label: 'Ústecký kraj', lat: 50.55, lng: 13.95, color: '#f7e3f4', border: '#e1007a' },
  { id: 'libereckykraj', label: 'Liberecký kraj', lat: 50.7, lng: 15.05, color: '#f3e1f4', border: '#e1007a' },
  { id: 'kralovehradeckykraj', label: 'Královéhradecký kraj', lat: 50.33, lng: 15.8, color: '#f0e3f5', border: '#e1007a' },
  { id: 'pardubickykraj', label: 'Pardubický kraj', lat: 49.95, lng: 16.25, color: '#ede1f4', border: '#e1007a' },
  { id: 'hlavnimestopraha', label: 'Hlavní město Praha', lat: 50.08, lng: 14.44, color: '#fbeeff', border: '#e1007a' },
  { id: 'stredoceskykraj', label: 'Středočeský kraj', lat: 49.87, lng: 14.9, color: '#f5e7f9', border: '#e1007a' },
  { id: 'jihoceskykraj', label: 'Jihočeský kraj', lat: 49.05, lng: 14.45, color: '#eee6f8', border: '#e1007a' },
  { id: 'vysocina', label: 'Vysočina', lat: 49.4, lng: 15.5, color: '#efe9fa', border: '#e1007a' },
  { id: 'jihomoravskykraj', label: 'Jihomoravský kraj', lat: 49.08, lng: 16.65, color: '#ede9f9', border: '#e1007a' },
  { id: 'olomouckykraj', label: 'Olomoucký kraj', lat: 49.75, lng: 17.2, color: '#f5e6f7', border: '#e1007a' },
  { id: 'zlinskykraj', label: 'Zlínský kraj', lat: 49.2, lng: 17.75, color: '#f1e9fb', border: '#e1007a' },
  { id: 'moravskoslezskykraj', label: 'Moravskoslezský kraj', lat: 49.8, lng: 18.2, color: '#f6e6f5', border: '#e1007a' },
  { id: 'bratislavskykraj', label: 'Bratislavský kraj', lat: 48.25, lng: 17.25, color: '#d9ddff', border: '#5649ff' },
  { id: 'trnavskykraj', label: 'Trnavský kraj', lat: 48.45, lng: 17.75, color: '#d7dcff', border: '#5649ff' },
  { id: 'trencianskykraj', label: 'Trenčiansky kraj', lat: 48.85, lng: 18.05, color: '#d3d7ff', border: '#5649ff' },
  { id: 'nitrianskykraj', label: 'Nitriansky kraj', lat: 48.2, lng: 18.3, color: '#d2d7ff', border: '#5649ff' },
  { id: 'zilinskykraj', label: 'Žilinský kraj', lat: 49.1, lng: 19.2, color: '#cfd4ff', border: '#5649ff' },
  { id: 'banskobystrickykraj', label: 'Banskobystrický kraj', lat: 48.6, lng: 19.5, color: '#cbd2ff', border: '#5649ff' },
  { id: 'presovskykraj', label: 'Prešovský kraj', lat: 49.0, lng: 21.2, color: '#ffcad2', border: '#e1007a' },
  { id: 'kosickykraj', label: 'Košický kraj', lat: 48.6, lng: 21.3, color: '#cde8c7', border: '#0a8f5c' },
];

const jitterFromId = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff;
  const rand = () => (((h = (h ^ (h << 13)) ^ (h >> 17) ^ (h << 5)) >>> 0) % 1000) / 1000;
  return { lat: (rand() - 0.5) * 0.2, lng: (rand() - 0.5) * 0.3 };
};

const makeHex = (lat: number, lng: number, r = 0.4): [number, number][] => {
  const coords: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 6;
    coords.push([lat + r * Math.sin(angle), lng + r * Math.cos(angle)]);
  }
  coords.push(coords[0]);
  return coords;
};

export default function OfflinePage() {
  const [profiles, setProfiles] = useState<ProfilePoint[]>([]);
  const [filterRegion, setFilterRegion] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, region, avatar_url')
        .not('region', 'is', null);
      if (!error && data) {
        setProfiles(
          data.map((p: any) => ({
            id: p.id,
            name: p.display_name ?? 'Neznámý',
            region: p.region,
            avatar_url: p.avatar_url,
          }))
        );
      }
    };
    load();
  }, []);

  useEffect(() => {
    let map: any;
    let layerGroup: any;
    import('leaflet').then((L) => {
      map = L.map('offline-map', {
        zoomControl: false,
        attributionControl: false,
        center: [49.3, 16.0],
        zoom: 6.2,
      });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        opacity: 0.25,
      }).addTo(map);

      layerGroup = L.layerGroup().addTo(map);

      const regionMap: Record<string, RegionDef> = {};
      regions.forEach((r) => {
        const hex = makeHex(r.lat, r.lng, 0.45);
        const polygon = L.polygon(hex as L.LatLngExpression[], {
          color: r.border,
          weight: 3,
          fillColor: r.color,
          fillOpacity: 0.9,
        })
          .on('click', () => setFilterRegion(r.id))
          .addTo(layerGroup);
        polygon.bindTooltip(r.label, { permanent: true, direction: 'center', className: 'map-label' });
        regionMap[r.id] = r;
      });

      profiles.forEach((p) => {
        const regId = normalizeRegion(p.region);
        const region = regionMap[regId];
        if (!region) return;
        const jitter = jitterFromId(p.id);
        const lat = region.lat + jitter.lat;
        const lng = region.lng + jitter.lng;
        const marker = L.circleMarker([lat, lng], {
          radius: 7,
          color: region.border,
          weight: 2,
          fillOpacity: 0.9,
          fillColor: '#0f1117',
        }).addTo(layerGroup);
        marker.bindTooltip(p.name, { permanent: false, direction: 'top' });
      });
    });
    return () => {
      import('leaflet').then(() => {
        if (map) map.remove();
        if (layerGroup) layerGroup.clearLayers();
      });
    };
  }, [profiles]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    regions.forEach((r) => {
      map[r.id] = 0;
    });
    profiles.forEach((p) => {
      const id = normalizeRegion(p.region);
      if (map[id] !== undefined) map[id] += 1;
    });
    return map;
  }, [profiles]);

  const filteredProfiles = useMemo(() => {
    if (!filterRegion) return profiles;
    return profiles.filter((p) => normalizeRegion(p.region) === filterRegion);
  }, [profiles, filterRegion]);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-16 pt-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-white">Mapa scény</h1>
        <Link href="/" className="text-sm text-[var(--mpc-accent)] hover:underline">
          Zpět
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0c0f16] p-4 shadow-lg">
        <div className="flex items-center justify-between text-sm text-white/60">
          <span>{profiles.length} profilů celkem</span>
          {filterRegion && (
            <button
              onClick={() => setFilterRegion(null)}
              className="rounded-full border border-white/20 px-3 py-1 text-xs text-white/80 hover:border-white/50"
            >
              Zrušit filtr
            </button>
          )}
        </div>
        <div id="offline-map" className="mt-3 h-[520px] w-full rounded-xl border border-white/10" />
      </div>

      <div className="grid gap-3 rounded-2xl border border-white/10 bg-[#0c0f16] p-4 shadow-lg">
        <div className="flex items-center justify-between text-sm text-white/70">
          <span>Podle kraje</span>
          <span className="text-xs text-white/50">Klikni na kraj pro filtr</span>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {regions.map((r) => (
            <button
              key={r.id}
              onClick={() => setFilterRegion(r.id)}
              className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition ${
                filterRegion === r.id
                  ? 'border-[var(--mpc-accent)] bg-white/5 text-white'
                  : 'border-white/10 bg-white/0 text-white/80 hover:border-white/30'
              }`}
            >
              <span>{r.label}</span>
              <span className="text-xs text-white/60">{counts[r.id] ?? 0} profilů</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-white/10 bg-[#0c0f16] p-4 shadow-lg">
        <div className="flex items-center justify-between text-sm text-white/70">
          <span>Profily</span>
          <span className="text-xs text-white/50">
            {filterRegion
              ? `Kraj: ${regions.find((r) => r.id === filterRegion)?.label ?? 'neznámý'}`
              : 'Všechny profily'}
          </span>
        </div>
        {filteredProfiles.length === 0 ? (
          <p className="text-sm text-white/60">Žádné profily k zobrazení.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {filteredProfiles.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--mpc-accent)] text-xs font-semibold text-black">
                  {p.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-xs text-white/60">
                    {regions.find((r) => r.id === normalizeRegion(p.region))?.label ?? 'Neznámý kraj'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
