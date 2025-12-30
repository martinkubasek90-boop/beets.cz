'use client';

import type { ChangeEvent, DragEvent } from 'react';
import { useMemo, useState } from 'react';
import { MainNav } from '@/components/main-nav';

type AnalysisResult = {
  peakDb: number;
  rmsDb: number;
  crestDb: number;
  dcOffset: number;
  stereoCorrelation: number | null;
  widthRatio: number | null;
  lowRatio: number;
  highRatio: number;
  bands: Array<{ label: string; ratio: number }>;
};

type CompareRow = {
  label: string;
  mixValue: string;
  refValue: string;
  delta: string;
  score: number;
  hint: string;
  deltaRaw: number;
};

const MAX_SAMPLE_POINTS = 1_000_000;

type ReferenceTrack = {
  label: string;
  url?: string;
};

const referenceGroups: Array<{ title: string; items: ReferenceTrack[] }> = [
  {
    title: 'LOW-END / SUB / 808',
    items: [
      {
        label: 'Kendrick Lamar – HUMBLE.',
        url: 'https://xbezrcyjfsumhohckwsd.supabase.co/storage/v1/object/public/beats/39b6ec86-7841-4ae1-a31c-721f7dd46108/1767133117728-HUMBLE..wav',
      },
      {
        label: 'Dr. Dre – Still D.R.E.',
        url: 'https://xbezrcyjfsumhohckwsd.supabase.co/storage/v1/object/public/beats/39b6ec86-7841-4ae1-a31c-721f7dd46108/1767133171654-Still%20D.R.E..mp3',
      },
    ],
  },
  {
    title: 'VOCAL / MID RANGE',
    items: [
      {
        label: 'J. Cole – Middle Child',
        url: 'https://xbezrcyjfsumhohckwsd.supabase.co/storage/v1/object/public/beats/39b6ec86-7841-4ae1-a31c-721f7dd46108/1767133209867-J.%20Cole%20-%20MIDDLE%20CHILD%20(Official%20Audio).mp3',
      },
      {
        label: 'Kendrick Lamar – DNA.',
        url: 'https://xbezrcyjfsumhohckwsd.supabase.co/storage/v1/object/public/beats/39b6ec86-7841-4ae1-a31c-721f7dd46108/1767133229614-DNA..wav',
      },
    ],
  },
  {
    title: 'STEREO IMAGE / SPACE',
    items: [
      { label: 'Travis Scott – SICKO MODE' },
      { label: 'Kanye West – Black Skinhead' },
    ],
  },
  {
    title: 'LOUDNESS / TRANSIENTY',
    items: [
      { label: 'Drake – God’s Plan' },
      { label: 'Post Malone – Rockstar' },
    ],
  },
  {
    title: 'GOLD STANDARD',
    items: [
      { label: 'Kendrick Lamar – HUMBLE.' },
      { label: 'Dr. Dre – Still D.R.E.' },
      { label: 'J. Cole – Middle Child' },
      { label: 'Travis Scott – SICKO MODE' },
      { label: 'Drake – God’s Plan' },
    ],
  },
];

const bandDefs = [
  { label: '20–30 Hz', low: 20, high: 30 },
  { label: '30–60 Hz', low: 30, high: 60 },
  { label: '60–120 Hz', low: 60, high: 120 },
  { label: '120–250 Hz', low: 120, high: 250 },
  { label: '250–500 Hz', low: 250, high: 500 },
  { label: '500–1k Hz', low: 500, high: 1000 },
  { label: '1–2k Hz', low: 1000, high: 2000 },
  { label: '2–4k Hz', low: 2000, high: 4000 },
  { label: '4–8k Hz', low: 4000, high: 8000 },
  { label: '8–12k Hz', low: 8000, high: 12000 },
  { label: '12–16k Hz', low: 12000, high: 16000 },
];

const metricThresholds = {
  peakDb: 1.5,
  rmsDb: 2.5,
  crestDb: 2.5,
  lowRatio: 0.08,
  highRatio: 0.08,
  stereoCorrelation: 0.15,
  widthRatio: 0.2,
  dcOffset: 0.01,
};

function dbfs(value: number) {
  if (value <= 0) return -Infinity;
  return 20 * Math.log10(value);
}

async function renderFilteredRms(buffer: AudioBuffer, type: BiquadFilterType, frequency: number) {
  const offline = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  const filter = offline.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  source.connect(filter);
  filter.connect(offline.destination);
  source.start(0);
  const rendered = await offline.startRendering();

  const channel = rendered.getChannelData(0);
  const stride = Math.max(1, Math.floor(channel.length / MAX_SAMPLE_POINTS));
  let sumSquares = 0;
  let count = 0;
  for (let i = 0; i < channel.length; i += stride) {
    const sample = channel[i];
    sumSquares += sample * sample;
    count += 1;
  }
  return Math.sqrt(sumSquares / Math.max(1, count));
}

async function renderBandRms(buffer: AudioBuffer, low: number, high: number) {
  const offline = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  const filter = offline.createBiquadFilter();
  const center = Math.sqrt(low * high);
  const bandwidth = Math.max(1, high - low);
  filter.type = 'bandpass';
  filter.frequency.value = center;
  filter.Q.value = Math.max(0.1, center / bandwidth);
  source.connect(filter);
  filter.connect(offline.destination);
  source.start(0);
  const rendered = await offline.startRendering();

  const channel = rendered.getChannelData(0);
  const stride = Math.max(1, Math.floor(channel.length / MAX_SAMPLE_POINTS));
  let sumSquares = 0;
  let count = 0;
  for (let i = 0; i < channel.length; i += stride) {
    const sample = channel[i];
    sumSquares += sample * sample;
    count += 1;
  }
  return Math.sqrt(sumSquares / Math.max(1, count));
}

async function analyzeFile(file: File): Promise<AnalysisResult> {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = new AudioContext();
  const buffer = await ctx.decodeAudioData(arrayBuffer);

  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  const stride = Math.max(1, Math.floor(length / MAX_SAMPLE_POINTS));

  const left = buffer.getChannelData(0);
  const right = channels > 1 ? buffer.getChannelData(1) : null;

  let peak = 0;
  let sumSquares = 0;
  let sum = 0;
  let count = 0;

  let sumL = 0;
  let sumR = 0;
  let sumLL = 0;
  let sumRR = 0;
  let sumLR = 0;
  let midSquares = 0;
  let sideSquares = 0;

  for (let i = 0; i < length; i += stride) {
    const l = left[i];
    const r = right ? right[i] : l;
    const sample = (l + r) * 0.5;

    peak = Math.max(peak, Math.abs(l), Math.abs(r));
    sumSquares += sample * sample;
    sum += sample;
    count += 1;

    if (right) {
      sumL += l;
      sumR += r;
      sumLL += l * l;
      sumRR += r * r;
      sumLR += l * r;
      const mid = (l + r) * 0.5;
      const side = (l - r) * 0.5;
      midSquares += mid * mid;
      sideSquares += side * side;
    }
  }

  const rms = Math.sqrt(sumSquares / Math.max(1, count));
  const dcOffset = sum / Math.max(1, count);

  let stereoCorrelation: number | null = null;
  let widthRatio: number | null = null;

  if (right) {
    const meanL = sumL / count;
    const meanR = sumR / count;
    const varL = sumLL / count - meanL * meanL;
    const varR = sumRR / count - meanR * meanR;
    const cov = sumLR / count - meanL * meanR;
    stereoCorrelation = cov / Math.max(1e-6, Math.sqrt(varL * varR));
    widthRatio = Math.sqrt(sideSquares / Math.max(1, count)) / Math.max(1e-6, Math.sqrt(midSquares / Math.max(1, count)));
  }

  const [lowRms, highRms, ...bandRms] = await Promise.all([
    renderFilteredRms(buffer, 'lowpass', 150),
    renderFilteredRms(buffer, 'highpass', 3000),
    ...bandDefs.map((band) => renderBandRms(buffer, band.low, band.high)),
  ]);

  await ctx.close();

  return {
    peakDb: dbfs(peak),
    rmsDb: dbfs(rms),
    crestDb: dbfs(peak) - dbfs(rms),
    dcOffset,
    stereoCorrelation,
    widthRatio,
    lowRatio: lowRms / Math.max(1e-6, rms),
    highRatio: highRms / Math.max(1e-6, rms),
    bands: bandDefs.map((band, index) => ({
      label: band.label,
      ratio: bandRms[index] / Math.max(1e-6, rms),
    })),
  };
}

function formatValue(value: number | null, unit = '') {
  if (value === null || Number.isNaN(value)) return '—';
  return `${value.toFixed(2)}${unit}`;
}

function scoreDelta(delta: number, threshold: number) {
  const normalized = Math.min(1, Math.abs(delta) / threshold);
  return Math.max(0, 100 - normalized * 100);
}

function scoreColor(score: number) {
  if (score >= 75) return 'bg-emerald-400';
  if (score >= 45) return 'bg-amber-400';
  return 'bg-red-500';
}

function scoreText(score: number) {
  if (score >= 75) return 'OK';
  if (score >= 45) return 'Pozor';
  return 'Problém';
}

function hintFromMetric(label: string, delta: number) {
  const direction = delta > 0 ? 'víc než reference' : 'míň než reference';
  switch (label) {
    case 'Low ratio':
      return delta > 0
        ? 'Low end je těžké. Zkontroluj sub/808 a HPF na nepodstatných stopách.'
        : 'Low end je slabé. Zkus posílit 40–90 Hz nebo doplnit harmoniky.';
    case 'High ratio':
      return delta > 0
        ? 'Výšky jsou agresivní. Zkus jemný shelf -2 až -4 dB kolem 10 kHz.'
        : 'Výšky chybí. Přidej air/shine kolem 8–12 kHz.';
    case 'Crest factor':
      return delta > 0
        ? 'Dynamika je větší. Možná stačí jemná bus komprese.'
        : 'Dynamika je malá. Zvaž uvolnit kompresi nebo transient shaper.';
    case 'RMS (dBFS)':
      return delta > 0
        ? 'Mix je hlasitější. Zkontroluj limiter a headroom.'
        : 'Mix je tišší. Zvaž gain staging nebo saturaci.';
    case 'Stereo correlation':
      return delta > 0
        ? 'Stereo je stabilnější než reference.'
        : 'Stereo je rizikové. Zkontroluj mono kompatibilitu.';
    case 'Width (Side/Mid)':
      return delta > 0
        ? 'Šířka je větší. Udrž kontrolu ve středu (kick, bass, vocal).'
        : 'Šířka je menší. Můžeš přidat stereo FX na perkusích.';
    case 'Peak (dBFS)':
      return delta > 0
        ? 'Peak je vyšší než reference. Zkontroluj clipping.'
        : 'Peaky jsou níž. Máš prostor pro loudness.';
    case 'DC offset':
      return Math.abs(delta) > metricThresholds.dcOffset
        ? 'DC offset je mimo. Zkus DC filter.'
        : 'DC offset je OK.';
    default:
      return `Mix je ${direction}.`;
  }
}

function bandWidth(ratio: number) {
  return Math.min(100, Math.max(6, ratio * 200));
}

export default function ReferenceMatchPage() {
  const [mixFile, setMixFile] = useState<File | null>(null);
  const [refFile, setRefFile] = useState<File | null>(null);
  const [dragTarget, setDragTarget] = useState<'mix' | 'ref' | null>(null);
  const [loading, setLoading] = useState(false);
  const [mixResult, setMixResult] = useState<AnalysisResult | null>(null);
  const [refResult, setRefResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingRef, setLoadingRef] = useState<string | null>(null);
  const [mode, setMode] = useState<'match' | 'diagnose'>('match');

  const handleDrop = (event: DragEvent<HTMLDivElement>, target: 'mix' | 'ref') => {
    event.preventDefault();
    event.stopPropagation();
    setDragTarget(null);
    const dropped = Array.from(event.dataTransfer.files).find((f) => f.type.includes('audio'));
    if (dropped) {
      if (target === 'mix') {
        setMixFile(dropped);
        setMixResult(null);
      } else {
        setRefFile(dropped);
        setRefResult(null);
      }
    }
  };

  const handlePick = (event: ChangeEvent<HTMLInputElement>, target: 'mix' | 'ref') => {
    const selected = event.target.files?.[0] ?? null;
    if (target === 'mix') {
      setMixFile(selected);
      setMixResult(null);
    } else {
      setRefFile(selected);
      setRefResult(null);
    }
    event.target.value = '';
  };

  const runCompare = async () => {
    if (!mixFile || !refFile) return;
    setLoading(true);
    setError(null);
    try {
      const [mix, ref] = await Promise.all([analyzeFile(mixFile), analyzeFile(refFile)]);
      setMixResult(mix);
      setRefResult(ref);
    } catch (err: any) {
      setError(err?.message || 'Analýza selhala.');
    } finally {
      setLoading(false);
    }
  };

  const loadReference = async (track: ReferenceTrack) => {
    if (!track.url) return;
    setLoadingRef(track.label);
    setError(null);
    try {
      const response = await fetch(track.url);
      if (!response.ok) {
        throw new Error('Nepodařilo se stáhnout referenci.');
      }
      const blob = await response.blob();
      const extension = track.url.split('.').pop() || 'mp3';
      const file = new File([blob], `${track.label}.${extension}`.replace(/[^\w.\s-]/g, ''), { type: blob.type });
      setRefFile(file);
      setRefResult(null);
    } catch (err: any) {
      setError(err?.message || 'Nepodařilo se načíst referenci.');
    } finally {
      setLoadingRef(null);
    }
  };

  const rows = useMemo<CompareRow[]>(() => {
    if (!mixResult || !refResult) return [];
    const peakDelta = mixResult.peakDb - refResult.peakDb;
    const rmsDelta = mixResult.rmsDb - refResult.rmsDb;
    const crestDelta = mixResult.crestDb - refResult.crestDb;
    const lowDelta = mixResult.lowRatio - refResult.lowRatio;
    const highDelta = mixResult.highRatio - refResult.highRatio;
    const corrDelta = (mixResult.stereoCorrelation ?? 0) - (refResult.stereoCorrelation ?? 0);
    const widthDelta = (mixResult.widthRatio ?? 0) - (refResult.widthRatio ?? 0);
    const dcDelta = mixResult.dcOffset - refResult.dcOffset;

    return [
      {
        label: 'Peak (dBFS)',
        mixValue: formatValue(mixResult.peakDb),
        refValue: formatValue(refResult.peakDb),
        delta: formatValue(peakDelta),
        deltaRaw: peakDelta,
        score: scoreDelta(peakDelta, metricThresholds.peakDb),
        hint: hintFromMetric('Peak (dBFS)', peakDelta),
      },
      {
        label: 'RMS (dBFS)',
        mixValue: formatValue(mixResult.rmsDb),
        refValue: formatValue(refResult.rmsDb),
        delta: formatValue(rmsDelta),
        deltaRaw: rmsDelta,
        score: scoreDelta(rmsDelta, metricThresholds.rmsDb),
        hint: hintFromMetric('RMS (dBFS)', rmsDelta),
      },
      {
        label: 'Crest factor',
        mixValue: formatValue(mixResult.crestDb),
        refValue: formatValue(refResult.crestDb),
        delta: formatValue(crestDelta),
        deltaRaw: crestDelta,
        score: scoreDelta(crestDelta, metricThresholds.crestDb),
        hint: hintFromMetric('Crest factor', crestDelta),
      },
      {
        label: 'Low ratio',
        mixValue: formatValue(mixResult.lowRatio),
        refValue: formatValue(refResult.lowRatio),
        delta: formatValue(lowDelta),
        deltaRaw: lowDelta,
        score: scoreDelta(lowDelta, metricThresholds.lowRatio),
        hint: hintFromMetric('Low ratio', lowDelta),
      },
      {
        label: 'High ratio',
        mixValue: formatValue(mixResult.highRatio),
        refValue: formatValue(refResult.highRatio),
        delta: formatValue(highDelta),
        deltaRaw: highDelta,
        score: scoreDelta(highDelta, metricThresholds.highRatio),
        hint: hintFromMetric('High ratio', highDelta),
      },
      {
        label: 'Stereo correlation',
        mixValue: formatValue(mixResult.stereoCorrelation),
        refValue: formatValue(refResult.stereoCorrelation),
        delta: formatValue(corrDelta),
        deltaRaw: corrDelta,
        score: scoreDelta(corrDelta, metricThresholds.stereoCorrelation),
        hint: hintFromMetric('Stereo correlation', corrDelta),
      },
      {
        label: 'Width (Side/Mid)',
        mixValue: formatValue(mixResult.widthRatio),
        refValue: formatValue(refResult.widthRatio),
        delta: formatValue(widthDelta),
        deltaRaw: widthDelta,
        score: scoreDelta(widthDelta, metricThresholds.widthRatio),
        hint: hintFromMetric('Width (Side/Mid)', widthDelta),
      },
      {
        label: 'DC offset',
        mixValue: formatValue(mixResult.dcOffset, ''),
        refValue: formatValue(refResult.dcOffset, ''),
        delta: formatValue(dcDelta, ''),
        deltaRaw: dcDelta,
        score: scoreDelta(dcDelta, metricThresholds.dcOffset),
        hint: hintFromMetric('DC offset', dcDelta),
      },
    ];
  }, [mixResult, refResult]);

  const bandRows = useMemo(() => {
    if (!mixResult || !refResult) return [];
    return mixResult.bands.map((band, index) => {
      const refBand = refResult.bands[index];
      const mixRatio = band?.ratio ?? 0;
      const refRatio = refBand?.ratio ?? 0;
      const delta = mixRatio - refRatio;
      const score = scoreDelta(delta, 0.06);
      return {
        label: band.label,
        mixRatio,
        refRatio,
        delta,
        score,
        hint: hintFromMetric('Low ratio', delta),
      };
    });
  }, [mixResult, refResult]);

  return (
    <main className="min-h-screen bg-[var(--mpc-deck,#050505)] text-white">
      <MainNav />
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10">
        <div className="rounded-3xl border border-white/10 bg-[var(--mpc-panel)] p-8 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.8)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.45em] text-[var(--mpc-muted)]">Reference Match</p>
              <h1 className="text-3xl font-semibold uppercase tracking-[0.18em]">A/B Match Analyzer</h1>
              <p className="text-sm text-[var(--mpc-muted)]">
                Nahraj svůj mix a referenční track. Porovnej low‑end, stereo šířku a loudness.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-xs text-[var(--mpc-muted)]">
              <p className="uppercase tracking-[0.24em] text-[var(--mpc-accent)]">Offline</p>
              <p className="mt-2">Analýza běží v prohlížeči, bez uploadu.</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--mpc-muted)]">Režim porovnání</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs uppercase tracking-[0.2em]">
                  <button
                    type="button"
                    onClick={() => setMode('match')}
                    className={`rounded-full border px-4 py-2 transition ${
                      mode === 'match'
                        ? 'border-[var(--mpc-accent)] bg-[var(--mpc-accent)] text-black'
                        : 'border-white/10 text-[var(--mpc-muted)] hover:border-[var(--mpc-accent)]'
                    }`}
                  >
                    Match
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('diagnose')}
                    className={`rounded-full border px-4 py-2 transition ${
                      mode === 'diagnose'
                        ? 'border-[var(--mpc-accent)] bg-[var(--mpc-accent)] text-black'
                        : 'border-white/10 text-[var(--mpc-muted)] hover:border-[var(--mpc-accent)]'
                    }`}
                  >
                    Diagnose
                  </button>
                </div>
                <p className="mt-3 text-xs text-[var(--mpc-muted)]">
                  Match = čisté A/B delta, Diagnose = varování + doporučení.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {(['mix', 'ref'] as const).map((target) => (
                  <div key={target} className="space-y-3">
                    <p className="text-xs uppercase tracking-[0.25em] text-[var(--mpc-muted)]">
                      {target === 'mix' ? 'Tvůj mix' : 'Reference track'}
                    </p>
                    <div
                      onDragEnter={(event) => {
                        event.preventDefault();
                        setDragTarget(target);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        setDragTarget(target);
                      }}
                      onDragLeave={() => setDragTarget(null)}
                      onDrop={(event) => handleDrop(event, target)}
                      className={`rounded-2xl border border-dashed px-4 py-6 text-center transition ${
                        dragTarget === target
                          ? 'border-[var(--mpc-accent)] bg-[rgba(243,116,51,0.08)]'
                          : 'border-white/15 bg-black/30'
                      }`}
                    >
                      <p className="text-xs uppercase tracking-[0.3em] text-[var(--mpc-muted)]">Dropzone</p>
                      <p className="mt-2 text-sm">{target === 'mix' ? mixFile?.name || 'Nahraj mix' : refFile?.name || 'Nahraj referenci'}</p>
                      <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-black/50 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-white hover:border-[var(--mpc-accent)]">
                        Vybrat soubor
                        <input type="file" accept="audio/*" className="hidden" onChange={(event) => handlePick(event, target)} />
                      </label>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={runCompare}
                disabled={!mixFile || !refFile || loading}
                className="w-full rounded-full bg-[var(--mpc-accent)] px-6 py-4 text-sm font-semibold uppercase tracking-[0.3em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Porovnávám…' : 'Spustit porovnání'}
              </button>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <div className="rounded-2xl border border-white/10 bg-black/35 p-6">
                <p className="uppercase tracking-[0.24em] text-[var(--mpc-accent)]">Reference library</p>
                <p className="mt-2 text-xs text-[var(--mpc-muted)]">Klikni na referenci pro načtení do analyzátoru.</p>
                <div className="mt-4 space-y-4 text-xs text-[var(--mpc-muted)]">
                  {referenceGroups.map((group) => (
                    <div key={group.title}>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white">{group.title}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {group.items.map((item) => (
                          <button
                            key={item.label}
                            type="button"
                            onClick={() => loadReference(item)}
                            disabled={!item.url || loadingRef === item.label}
                            className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--mpc-muted)] transition hover:border-[var(--mpc-accent)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {loadingRef === item.label ? 'Načítám…' : item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/35 p-6">
              <p className="uppercase tracking-[0.24em] text-[var(--mpc-accent-2)]">Porovnání</p>
              <div className="mt-4 space-y-3 text-sm text-[var(--mpc-muted)]">
                {rows.length ? (
                  <div className="space-y-3">
                    {rows.map((row) => (
                      <div key={row.label} className="rounded-xl border border-white/10 bg-black/40 px-4 py-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">{row.label}</p>
                        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-[10px] text-[var(--mpc-muted)]">Mix</p>
                            <p className="text-white">{row.mixValue}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--mpc-muted)]">Reference</p>
                            <p className="text-white">{row.refValue}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--mpc-muted)]">Delta</p>
                            <p className="text-white">{row.delta}</p>
                          </div>
                        </div>
                        {mode === 'diagnose' && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-[10px] text-[var(--mpc-muted)]">
                              <span>{scoreText(row.score)}</span>
                              <span>{Math.round(row.score)}%</span>
                            </div>
                            <div className="mt-1 h-2 w-full rounded-full bg-white/10">
                              <div
                                className={`h-2 rounded-full ${scoreColor(row.score)}`}
                                style={{ width: `${Math.max(6, row.score)}%` }}
                              />
                            </div>
                            <p className="mt-2 text-xs text-white/80">{row.hint}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--mpc-muted)]">Nahraj mix + referenci a spusť porovnání.</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/35 p-6">
              <p className="uppercase tracking-[0.24em] text-[var(--mpc-accent-2)]">Frekvenční pásma</p>
              <div className="mt-4 space-y-3 text-sm text-[var(--mpc-muted)]">
                {bandRows.length ? (
                  <div className="space-y-3">
                    {bandRows.map((band) => (
                      <div key={band.label} className="rounded-xl border border-white/10 bg-black/40 px-4 py-4">
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                          <span>{band.label}</span>
                          <span>{Math.round(band.score)}%</span>
                        </div>
                        <div className="mt-3 space-y-2 text-xs">
                          <div>
                            <p className="text-[10px] text-[var(--mpc-muted)]">Mix</p>
                            <div className="mt-1 h-2 w-full rounded-full bg-white/10">
                              <div
                                className="h-2 rounded-full bg-[var(--mpc-accent)]"
                                style={{ width: `${bandWidth(band.mixRatio)}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] text-[var(--mpc-muted)]">Reference</p>
                            <div className="mt-1 h-2 w-full rounded-full bg-white/10">
                              <div
                                className="h-2 rounded-full bg-[var(--mpc-accent-2)]"
                                style={{ width: `${bandWidth(band.refRatio)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        {mode === 'diagnose' && (
                          <>
                            <div className="mt-3 flex items-center justify-between text-[10px] text-[var(--mpc-muted)]">
                              <span>{scoreText(band.score)}</span>
                              <span>{band.delta.toFixed(2)}</span>
                            </div>
                            <div className="mt-1 h-2 w-full rounded-full bg-white/10">
                              <div
                                className={`h-2 rounded-full ${scoreColor(band.score)}`}
                                style={{ width: `${Math.max(6, band.score)}%` }}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--mpc-muted)]">Po analýze se zobrazí heatmapa pásem.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
