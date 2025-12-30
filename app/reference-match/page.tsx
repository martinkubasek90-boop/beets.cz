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
};

type CompareRow = {
  label: string;
  mixValue: string;
  refValue: string;
  delta: string;
};

const MAX_SAMPLE_POINTS = 1_000_000;

const referenceGroups = [
  {
    title: 'LOW-END / SUB / 808',
    items: [
      'Kendrick Lamar – HUMBLE.',
      'Dr. Dre – Still D.R.E.',
    ],
  },
  {
    title: 'VOCAL / MID RANGE',
    items: [
      'J. Cole – Middle Child',
      'Kendrick Lamar – DNA.',
    ],
  },
  {
    title: 'STEREO IMAGE / SPACE',
    items: [
      'Travis Scott – SICKO MODE',
      'Kanye West – Black Skinhead',
    ],
  },
  {
    title: 'LOUDNESS / TRANSIENTY',
    items: [
      'Drake – God’s Plan',
      'Post Malone – Rockstar',
    ],
  },
  {
    title: 'GOLD STANDARD',
    items: [
      'Kendrick Lamar – HUMBLE.',
      'Dr. Dre – Still D.R.E.',
      'J. Cole – Middle Child',
      'Travis Scott – SICKO MODE',
      'Drake – God’s Plan',
    ],
  },
];

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

  const [lowRms, highRms] = await Promise.all([
    renderFilteredRms(buffer, 'lowpass', 150),
    renderFilteredRms(buffer, 'highpass', 3000),
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
  };
}

function formatValue(value: number | null, unit = '') {
  if (value === null || Number.isNaN(value)) return '—';
  return `${value.toFixed(2)}${unit}`;
}

export default function ReferenceMatchPage() {
  const [mixFile, setMixFile] = useState<File | null>(null);
  const [refFile, setRefFile] = useState<File | null>(null);
  const [dragTarget, setDragTarget] = useState<'mix' | 'ref' | null>(null);
  const [loading, setLoading] = useState(false);
  const [mixResult, setMixResult] = useState<AnalysisResult | null>(null);
  const [refResult, setRefResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const rows = useMemo<CompareRow[]>(() => {
    if (!mixResult || !refResult) return [];
    return [
      {
        label: 'Peak (dBFS)',
        mixValue: formatValue(mixResult.peakDb),
        refValue: formatValue(refResult.peakDb),
        delta: formatValue(mixResult.peakDb - refResult.peakDb),
      },
      {
        label: 'RMS (dBFS)',
        mixValue: formatValue(mixResult.rmsDb),
        refValue: formatValue(refResult.rmsDb),
        delta: formatValue(mixResult.rmsDb - refResult.rmsDb),
      },
      {
        label: 'Crest factor',
        mixValue: formatValue(mixResult.crestDb),
        refValue: formatValue(refResult.crestDb),
        delta: formatValue(mixResult.crestDb - refResult.crestDb),
      },
      {
        label: 'Low ratio',
        mixValue: formatValue(mixResult.lowRatio),
        refValue: formatValue(refResult.lowRatio),
        delta: formatValue(mixResult.lowRatio - refResult.lowRatio),
      },
      {
        label: 'High ratio',
        mixValue: formatValue(mixResult.highRatio),
        refValue: formatValue(refResult.highRatio),
        delta: formatValue(mixResult.highRatio - refResult.highRatio),
      },
      {
        label: 'Stereo correlation',
        mixValue: formatValue(mixResult.stereoCorrelation),
        refValue: formatValue(refResult.stereoCorrelation),
        delta: formatValue(
          (mixResult.stereoCorrelation ?? 0) - (refResult.stereoCorrelation ?? 0)
        ),
      },
      {
        label: 'Width (Side/Mid)',
        mixValue: formatValue(mixResult.widthRatio),
        refValue: formatValue(refResult.widthRatio),
        delta: formatValue((mixResult.widthRatio ?? 0) - (refResult.widthRatio ?? 0)),
      },
      {
        label: 'DC offset',
        mixValue: formatValue(mixResult.dcOffset, ''),
        refValue: formatValue(refResult.dcOffset, ''),
        delta: formatValue(mixResult.dcOffset - refResult.dcOffset, ''),
      },
    ];
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
                <p className="mt-2 text-xs text-[var(--mpc-muted)]">Tracky doplníme po dodání souborů.</p>
                <div className="mt-4 space-y-4 text-xs text-[var(--mpc-muted)]">
                  {referenceGroups.map((group) => (
                    <div key={group.title}>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-white">{group.title}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {group.items.map((item) => (
                          <span
                            key={item}
                            className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[var(--mpc-muted)]"
                          >
                            {item}
                          </span>
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
                      <div key={row.label} className="rounded-xl border border-white/10 bg-black/40 px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">{row.label}</p>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
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
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--mpc-muted)]">Nahraj mix + referenci a spusť porovnání.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
