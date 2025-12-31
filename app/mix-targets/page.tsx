'use client';

import { useMemo, useState } from 'react';
import { MainNav } from '@/components/main-nav';

type Target = {
  id: string;
  label: string;
  lufs: string;
  crest: string;
  lowRatio: string;
  highRatio: string;
  stereo: string;
  notes: string[];
};

const targets: Target[] = [
  {
    id: 'hiphop',
    label: 'Hip-Hop / Trap',
    lufs: '-9 až -7 LUFS (master)',
    crest: '7–11 dB',
    lowRatio: '0.45–0.65',
    highRatio: '0.16–0.32',
    stereo: 'Side/Mid 0.18–0.45',
    notes: ['Sub kontrola 30–60 Hz', 'Kick + 808 čitelné i na malých bednách'],
  },
  {
    id: 'lofi',
    label: 'Lo-Fi / Chillhop',
    lufs: '-14 až -10 LUFS',
    crest: '10–16 dB',
    lowRatio: '0.30–0.55',
    highRatio: '0.12–0.25',
    stereo: 'Side/Mid 0.20–0.55',
    notes: ['Méně agresivní výšky', 'Ponechat dynamiku'],
  },
  {
    id: 'boombap',
    label: 'BoomBap',
    lufs: '-10 až -8 LUFS',
    crest: '9–13 dB',
    lowRatio: '0.40–0.60',
    highRatio: '0.14–0.30',
    stereo: 'Side/Mid 0.15–0.40',
    notes: ['Punch na 80–120 Hz', 'Mírně špinavější střed'],
  },
  {
    id: 'drill',
    label: 'Drill / UK Drill',
    lufs: '-9 až -7 LUFS',
    crest: '6–10 dB',
    lowRatio: '0.50–0.70',
    highRatio: '0.18–0.35',
    stereo: 'Side/Mid 0.12–0.35',
    notes: ['Silný sub, tight low-end', 'Agresivnější transienty'],
  },
  {
    id: 'pop',
    label: 'Pop / R&B',
    lufs: '-10 až -8 LUFS',
    crest: '8–12 dB',
    lowRatio: '0.30–0.50',
    highRatio: '0.20–0.40',
    stereo: 'Side/Mid 0.25–0.60',
    notes: ['Vokál 1–4 kHz musí držet', 'Čisté výšky bez harshness'],
  },
  {
    id: 'edm',
    label: 'EDM / Club',
    lufs: '-8 až -6 LUFS',
    crest: '5–9 dB',
    lowRatio: '0.35–0.60',
    highRatio: '0.22–0.45',
    stereo: 'Side/Mid 0.30–0.70',
    notes: ['Agresivnější loudness', 'Wide stereo FX, kontrola mono'],
  },
];

export default function MixTargetsPage() {
  const [selectedId, setSelectedId] = useState(targets[0].id);

  const active = useMemo(
    () => targets.find((target) => target.id === selectedId) ?? targets[0],
    [selectedId]
  );

  return (
    <main className="min-h-screen bg-[var(--mpc-deck,#050505)] text-white">
      <MainNav />
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10">
        <div className="rounded-3xl border border-white/10 bg-[var(--mpc-panel)] p-8 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.8)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.45em] text-[var(--mpc-muted)]">Mix Target Finder</p>
              <h1 className="text-3xl font-semibold uppercase tracking-[0.18em]">Mix Target Finder</h1>
              <p className="text-sm text-[var(--mpc-muted)]">
                Vyber žánr a získej cílové hodnoty pro loudness, dynamiku a balanc pásma.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-xs text-[var(--mpc-muted)]">
              <p className="uppercase tracking-[0.24em] text-[var(--mpc-accent)]">Cíle mixu</p>
              <p className="mt-2">Rychlá orientace pro master.</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Žánr</p>
              <div className="mt-4 space-y-2">
                {targets.map((target) => (
                  <button
                    key={target.id}
                    type="button"
                    onClick={() => setSelectedId(target.id)}
                    className={`w-full rounded-full px-4 py-2 text-left text-xs uppercase tracking-[0.2em] transition ${
                      target.id === selectedId
                        ? 'bg-[var(--mpc-accent)] text-black'
                        : 'border border-white/10 bg-black/40 text-white hover:border-[var(--mpc-accent)]'
                    }`}
                  >
                    {target.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/35 p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Cílové hodnoty</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {[
                    { label: 'LUFS', value: active.lufs },
                    { label: 'Crest factor', value: active.crest },
                    { label: 'Low ratio', value: active.lowRatio },
                    { label: 'High ratio', value: active.highRatio },
                    { label: 'Stereo', value: active.stereo },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl border border-white/10 bg-black/40 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">{item.label}</p>
                      <p className="mt-2 text-base text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/35 p-6">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Poznámky</p>
                <div className="mt-3 space-y-2 text-sm text-white/90">
                  {active.notes.map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/35 px-6 py-4 text-xs text-[var(--mpc-muted)]">
                Hodnoty jsou orientační pro moderní streaming/mastering. Vždy finálně uchem.
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
