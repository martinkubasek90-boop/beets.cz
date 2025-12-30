'use client';

import type { ChangeEvent, DragEvent } from 'react';
import { useMemo, useState } from 'react';
import { MainNav } from '@/components/main-nav';

type AnalysisResult = {
  duration: number;
  sampleRate: number;
  channels: number;
  peakDb: number;
  rmsDb: number;
  crestDb: number;
  dcOffset: number;
  stereoCorrelation: number | null;
  widthRatio: number | null;
  lowRatio: number;
  highRatio: number;
};

type ChecklistItem = {
  label: string;
  status: 'ok' | 'warn';
  detail: string;
};

const MAX_SAMPLE_POINTS = 1_000_000;

function dbfs(value: number) {
  if (value <= 0) return -Infinity;
  return 20 * Math.log10(value);
}

async function renderFilteredRms(
  buffer: AudioBuffer,
  type: BiquadFilterType,
  frequency: number
) {
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
  const duration = buffer.duration;
  const sampleRate = buffer.sampleRate;
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
    duration,
    sampleRate,
    channels,
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

function buildChecklist(result: AnalysisResult): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  const peakOk = result.peakDb < -1;
  items.push({
    label: 'Headroom / clipping',
    status: peakOk ? 'ok' : 'warn',
    detail: peakOk ? 'Peaky pod -1 dBFS.' : `Peak ${result.peakDb.toFixed(1)} dBFS (příliš hlasité).`,
  });

  const loudnessOk = result.rmsDb <= -10 && result.rmsDb >= -20;
  items.push({
    label: 'Průměrná hlasitost (RMS)',
    status: loudnessOk ? 'ok' : 'warn',
    detail: `RMS ${result.rmsDb.toFixed(1)} dBFS (mix typicky -20 až -10).`,
  });

  const crestOk = result.crestDb >= 8 && result.crestDb <= 16;
  items.push({
    label: 'Dynamika / crest factor',
    status: crestOk ? 'ok' : 'warn',
    detail: `Crest ${result.crestDb.toFixed(1)} dB (ideál 8–16).`,
  });

  const dcOk = Math.abs(result.dcOffset) < 0.01;
  items.push({
    label: 'DC offset',
    status: dcOk ? 'ok' : 'warn',
    detail: `DC ${result.dcOffset.toFixed(4)} (mělo by být blízko 0).`,
  });

  if (result.stereoCorrelation !== null) {
    const corrOk = result.stereoCorrelation > -0.1;
    items.push({
      label: 'Mono kompatibilita',
      status: corrOk ? 'ok' : 'warn',
      detail: `Korelace ${result.stereoCorrelation.toFixed(2)} (nižší = problém v mono).`,
    });
  }

  if (result.widthRatio !== null) {
    const widthOk = result.widthRatio >= 0.2 && result.widthRatio <= 1.1;
    items.push({
      label: 'Stereo šířka',
      status: widthOk ? 'ok' : 'warn',
      detail: `Side/Mid ${result.widthRatio.toFixed(2)} (typicky 0.2–1.1).`,
    });
  }

  const lowOk = result.lowRatio >= 0.2 && result.lowRatio <= 0.5;
  items.push({
    label: 'Low end balance',
    status: lowOk ? 'ok' : 'warn',
    detail: `Low ratio ${result.lowRatio.toFixed(2)} (ideál 0.2–0.5).`,
  });

  const highOk = result.highRatio >= 0.15 && result.highRatio <= 0.45;
  items.push({
    label: 'High end balance',
    status: highOk ? 'ok' : 'warn',
    detail: `High ratio ${result.highRatio.toFixed(2)} (ideál 0.15–0.45).`,
  });

  return items;
}

export default function MixChecklistPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checklist = useMemo(() => (result ? buildChecklist(result) : []), [result]);

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const dropped = Array.from(event.dataTransfer.files).find((f) => f.type.includes('audio'));
    if (dropped) {
      setFile(dropped);
      setResult(null);
      setError(null);
    }
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setResult(null);
    setError(null);
    event.target.value = '';
  };

  const runAnalysis = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const analysis = await analyzeFile(file);
      setResult(analysis);
    } catch (err: any) {
      setError(err?.message || 'Analýza selhala.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--mpc-deck,#050505)] text-white">
      <MainNav />
      <section className="mx-auto max-w-5xl px-4 pb-16 pt-10">
        <div className="rounded-3xl border border-white/10 bg-[var(--mpc-panel)] p-8 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.8)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.45em] text-[var(--mpc-muted)]">AI Mix Checklist</p>
              <h1 className="text-3xl font-semibold uppercase tracking-[0.18em]">Mix Checklist Analyzer</h1>
              <p className="text-sm text-[var(--mpc-muted)]">
                Nahraj track a získej reálnou analýzu headroomu, dynamiky, stereo šířky a balancí.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-xs text-[var(--mpc-muted)]">
              <p className="uppercase tracking-[0.24em] text-[var(--mpc-accent)]">Offline</p>
              <p className="mt-2">Analýza běží v prohlížeči, bez uploadu.</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`rounded-2xl border border-dashed px-6 py-10 text-center transition ${
                  dragActive
                    ? 'border-[var(--mpc-accent)] bg-[rgba(243,116,51,0.08)]'
                    : 'border-white/15 bg-black/30'
                }`}
              >
                <p className="text-sm uppercase tracking-[0.3em] text-[var(--mpc-muted)]">Dropzone</p>
                <p className="mt-3 text-lg font-medium">Přetáhni audio soubor</p>
                <p className="mt-2 text-xs text-[var(--mpc-muted)]">WAV / MP3 / AIFF (ideálně stereo mix)</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-black/50 px-5 py-3 text-xs uppercase tracking-[0.3em] text-white hover:border-[var(--mpc-accent)]">
                  Vybrat soubor
                  <input type="file" accept="audio/*" className="hidden" onChange={handleFileInput} />
                </label>
                <button
                  onClick={runAnalysis}
                  disabled={!file || loading}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--mpc-accent)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Analyzuju…' : 'Spustit analýzu'}
                </button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 px-6 py-4 text-sm text-[var(--mpc-muted)]">
                <p className="uppercase tracking-[0.2em] text-[var(--mpc-accent)]">Vybraný soubor</p>
                <p className="mt-2">{file?.name || 'Zatím žádný soubor'}</p>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/35 p-6">
              <p className="uppercase tracking-[0.25em] text-[var(--mpc-accent-2)]">Výsledky</p>
              <div className="mt-4 space-y-3 text-sm text-[var(--mpc-muted)]">
                {result ? (
                  <>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                        <p className="uppercase tracking-[0.2em] text-[10px] text-[var(--mpc-muted)]">Délka</p>
                        <p className="mt-1 text-white">{result.duration.toFixed(1)} s</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                        <p className="uppercase tracking-[0.2em] text-[10px] text-[var(--mpc-muted)]">Sample rate</p>
                        <p className="mt-1 text-white">{result.sampleRate} Hz</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                        <p className="uppercase tracking-[0.2em] text-[10px] text-[var(--mpc-muted)]">Peak</p>
                        <p className="mt-1 text-white">{result.peakDb.toFixed(1)} dBFS</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                        <p className="uppercase tracking-[0.2em] text-[10px] text-[var(--mpc-muted)]">RMS</p>
                        <p className="mt-1 text-white">{result.rmsDb.toFixed(1)} dBFS</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {checklist.map((item) => (
                        <div
                          key={item.label}
                          className={`rounded-xl border px-4 py-3 text-xs uppercase tracking-[0.16em] ${
                            item.status === 'ok'
                              ? 'border-[rgba(0,86,63,0.6)] bg-[rgba(0,86,63,0.18)] text-white'
                              : 'border-[rgba(243,116,51,0.6)] bg-[rgba(243,116,51,0.12)] text-white'
                          }`}
                        >
                          <p className="text-[10px] text-[var(--mpc-muted)]">{item.label}</p>
                          <p className="mt-1 text-white normal-case tracking-normal text-sm">{item.detail}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[var(--mpc-muted)]">Nahraj audio a spusť analýzu.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
