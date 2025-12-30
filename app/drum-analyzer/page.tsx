'use client';

import type { ChangeEvent, DragEvent } from 'react';
import { useMemo, useState } from 'react';
import { MainNav } from '@/components/main-nav';

type DrumAnalysis = {
  transientRmsDb: number;
  sustainRmsDb: number;
  attackSustainRatio: number;
  transientPeakDb: number;
  lowRatio: number;
  midRatio: number;
  highRatio: number;
};

type CompareRow = {
  label: string;
  mixValue: string;
  refValue: string;
  delta: string;
  score: number;
  hint: string;
};

const FRAME_SIZE = 1024;
const HOP_SIZE = 512;
const MAX_SAMPLE_POINTS = 1_000_000;

function dbfs(value: number) {
  if (value <= 0) return -Infinity;
  return 20 * Math.log10(value);
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

function formatValue(value: number, unit = '') {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(2)}${unit}`;
}

async function renderFilteredBuffer(
  buffer: AudioBuffer,
  type: BiquadFilterType,
  frequency: number,
  q = 0.707
) {
  const offline = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  const source = offline.createBufferSource();
  source.buffer = buffer;
  const filter = offline.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = q;
  source.connect(filter);
  filter.connect(offline.destination);
  source.start(0);
  return offline.startRendering();
}

function computeEnergyFrames(signal: Float32Array) {
  const frames = Math.floor((signal.length - FRAME_SIZE) / HOP_SIZE);
  const energies: number[] = [];
  for (let i = 0; i < frames; i += 1) {
    let sum = 0;
    const start = i * HOP_SIZE;
    for (let j = 0; j < FRAME_SIZE; j += 1) {
      const sample = signal[start + j];
      sum += sample * sample;
    }
    energies.push(sum / FRAME_SIZE);
  }
  return energies;
}

function detectTransients(energies: number[]) {
  if (!energies.length) return [];
  const sorted = [...energies].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length * 0.5)] || 0;
  const threshold = median * 2.5;
  const indices: number[] = [];
  for (let i = 1; i < energies.length - 1; i += 1) {
    if (energies[i] > threshold && energies[i] > energies[i - 1] && energies[i] > energies[i + 1]) {
      indices.push(i);
    }
  }
  if (!indices.length) {
    const top = sorted[Math.floor(sorted.length * 0.9)] || median;
    for (let i = 0; i < energies.length; i += 1) {
      if (energies[i] >= top) indices.push(i);
    }
  }
  return indices;
}

function rmsFromFrames(signal: Float32Array, frames: number[]) {
  let sum = 0;
  let count = 0;
  for (const frame of frames) {
    const start = frame * HOP_SIZE;
    const end = Math.min(start + FRAME_SIZE, signal.length);
    for (let i = start; i < end; i += 1) {
      const sample = signal[i];
      sum += sample * sample;
      count += 1;
    }
  }
  return Math.sqrt(sum / Math.max(1, count));
}

async function analyzeDrums(file: File): Promise<DrumAnalysis> {
  const arrayBuffer = await file.arrayBuffer();
  const ctx = new AudioContext();
  const buffer = await ctx.decodeAudioData(arrayBuffer);

  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  const left = buffer.getChannelData(0);
  const right = channels > 1 ? buffer.getChannelData(1) : null;

  const mono = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    mono[i] = right ? (left[i] + right[i]) * 0.5 : left[i];
  }

  const energies = computeEnergyFrames(mono);
  const transientFrames = detectTransients(energies);
  const sustainFrames = energies.map((_, index) => index).filter((i) => !transientFrames.includes(i));

  const transientRms = rmsFromFrames(mono, transientFrames);
  const sustainRms = rmsFromFrames(mono, sustainFrames);
  let transientPeak = 0;
  const stride = Math.max(1, Math.floor(length / MAX_SAMPLE_POINTS));
  for (let i = 0; i < length; i += stride) {
    transientPeak = Math.max(transientPeak, Math.abs(mono[i]));
  }

  const [lowBuf, midBuf, highBuf] = await Promise.all([
    renderFilteredBuffer(buffer, 'lowpass', 150),
    renderFilteredBuffer(buffer, 'bandpass', 700, 0.9),
    renderFilteredBuffer(buffer, 'highpass', 3000),
  ]);

  const lowMono = lowBuf.getChannelData(0);
  const midMono = midBuf.getChannelData(0);
  const highMono = highBuf.getChannelData(0);

  const lowRms = rmsFromFrames(lowMono, transientFrames);
  const midRms = rmsFromFrames(midMono, transientFrames);
  const highRms = rmsFromFrames(highMono, transientFrames);

  await ctx.close();

  const sumBands = Math.max(1e-6, lowRms + midRms + highRms);

  return {
    transientRmsDb: dbfs(transientRms),
    sustainRmsDb: dbfs(sustainRms),
    attackSustainRatio: transientRms / Math.max(1e-6, sustainRms),
    transientPeakDb: dbfs(transientPeak),
    lowRatio: lowRms / sumBands,
    midRatio: midRms / sumBands,
    highRatio: highRms / sumBands,
  };
}

function hintFor(label: string, delta: number) {
  switch (label) {
    case 'Transient loudness':
      return delta > 0
        ? 'Transieny jsou silnější než reference. Zvaž jemnější kompresi nebo clipping.'
        : 'Transieny jsou slabší. Zkus menší kompresi nebo transient shaper.';
    case 'Attack/Sustain':
      return delta > 0
        ? 'Větší attack. Možná méně komprese na drum bus.'
        : 'Více sustainu. Zvaž kratší release nebo gate.';
    case 'Low band':
      return delta > 0
        ? 'Více low. Zkontroluj 808 vs kick a čistotu subu.'
        : 'Méně low. Zvaž posílit 50–90 Hz.';
    case 'Mid band':
      return delta > 0
        ? 'Více mid. Sleduj boxiness okolo 250–500 Hz.'
        : 'Méně mid. Kick/snare může být tenčí.';
    case 'High band':
      return delta > 0
        ? 'Více high. Pozor na harshness.'
        : 'Méně high. Zvaž bright hat/clap.';
    default:
      return 'Porovnání proti referenci.';
  }
}

export default function DrumAnalyzerPage() {
  const [mixFile, setMixFile] = useState<File | null>(null);
  const [refFile, setRefFile] = useState<File | null>(null);
  const [dragTarget, setDragTarget] = useState<'mix' | 'ref' | null>(null);
  const [loading, setLoading] = useState(false);
  const [mixResult, setMixResult] = useState<DrumAnalysis | null>(null);
  const [refResult, setRefResult] = useState<DrumAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      const [mix, ref] = await Promise.all([analyzeDrums(mixFile), analyzeDrums(refFile)]);
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
    const transientDelta = mixResult.transientRmsDb - refResult.transientRmsDb;
    const attackDelta = mixResult.attackSustainRatio - refResult.attackSustainRatio;
    const lowDelta = mixResult.lowRatio - refResult.lowRatio;
    const midDelta = mixResult.midRatio - refResult.midRatio;
    const highDelta = mixResult.highRatio - refResult.highRatio;

    return [
      {
        label: 'Transient loudness',
        mixValue: formatValue(mixResult.transientRmsDb, ' dB'),
        refValue: formatValue(refResult.transientRmsDb, ' dB'),
        delta: formatValue(transientDelta, ' dB'),
        score: scoreDelta(transientDelta, 3),
        hint: hintFor('Transient loudness', transientDelta),
      },
      {
        label: 'Attack/Sustain',
        mixValue: formatValue(mixResult.attackSustainRatio, ''),
        refValue: formatValue(refResult.attackSustainRatio, ''),
        delta: formatValue(attackDelta, ''),
        score: scoreDelta(attackDelta, 0.8),
        hint: hintFor('Attack/Sustain', attackDelta),
      },
      {
        label: 'Low band',
        mixValue: formatValue(mixResult.lowRatio, ''),
        refValue: formatValue(refResult.lowRatio, ''),
        delta: formatValue(lowDelta, ''),
        score: scoreDelta(lowDelta, 0.12),
        hint: hintFor('Low band', lowDelta),
      },
      {
        label: 'Mid band',
        mixValue: formatValue(mixResult.midRatio, ''),
        refValue: formatValue(refResult.midRatio, ''),
        delta: formatValue(midDelta, ''),
        score: scoreDelta(midDelta, 0.12),
        hint: hintFor('Mid band', midDelta),
      },
      {
        label: 'High band',
        mixValue: formatValue(mixResult.highRatio, ''),
        refValue: formatValue(refResult.highRatio, ''),
        delta: formatValue(highDelta, ''),
        score: scoreDelta(highDelta, 0.12),
        hint: hintFor('High band', highDelta),
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
              <p className="text-[11px] uppercase tracking-[0.45em] text-[var(--mpc-muted)]">Drum Analyzer</p>
              <h1 className="text-3xl font-semibold uppercase tracking-[0.18em]">Drum A/B Analysis</h1>
              <p className="text-sm text-[var(--mpc-muted)]">
                Lokální analýza transienů, attack/sustain a drum‑band balancí.
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
                      {target === 'mix' ? 'Tvůj beat' : 'Reference beat'}
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
                      <p className="mt-2 text-sm">{target === 'mix' ? mixFile?.name || 'Nahraj beat' : refFile?.name || 'Nahraj referenci'}</p>
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
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/35 p-6">
              <p className="uppercase tracking-[0.24em] text-[var(--mpc-accent-2)]">Výsledky bicích</p>
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
          </div>
        </div>
      </section>
    </main>
  );
}
