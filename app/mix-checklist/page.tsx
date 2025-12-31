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
  hotPeakCount: number;
  clipCount: number;
  peakWindows: number[];
  peakMoments: number[];
};

type ChecklistItem = {
  label: string;
  status: 'ok' | 'warn';
  detail: string;
};

type MixTarget = {
  id: string;
  label: string;
  lufsMin: number;
  lufsMax: number;
  crestMin: number;
  crestMax: number;
  lowMin: number;
  lowMax: number;
  highMin: number;
  highMax: number;
  widthMin: number;
  widthMax: number;
};

const mixTargets: MixTarget[] = [
  {
    id: 'hiphop',
    label: 'Hip-Hop / Trap',
    lufsMin: -9,
    lufsMax: -7,
    crestMin: 7,
    crestMax: 11,
    lowMin: 0.45,
    lowMax: 0.65,
    highMin: 0.16,
    highMax: 0.32,
    widthMin: 0.18,
    widthMax: 0.45,
  },
  {
    id: 'lofi',
    label: 'Lo-Fi / Chillhop',
    lufsMin: -14,
    lufsMax: -10,
    crestMin: 10,
    crestMax: 16,
    lowMin: 0.3,
    lowMax: 0.55,
    highMin: 0.12,
    highMax: 0.25,
    widthMin: 0.2,
    widthMax: 0.55,
  },
  {
    id: 'boombap',
    label: 'BoomBap',
    lufsMin: -10,
    lufsMax: -8,
    crestMin: 9,
    crestMax: 13,
    lowMin: 0.4,
    lowMax: 0.6,
    highMin: 0.14,
    highMax: 0.3,
    widthMin: 0.15,
    widthMax: 0.4,
  },
  {
    id: 'drill',
    label: 'Drill / UK Drill',
    lufsMin: -9,
    lufsMax: -7,
    crestMin: 6,
    crestMax: 10,
    lowMin: 0.5,
    lowMax: 0.7,
    highMin: 0.18,
    highMax: 0.35,
    widthMin: 0.12,
    widthMax: 0.35,
  },
  {
    id: 'pop',
    label: 'Pop / R&B',
    lufsMin: -10,
    lufsMax: -8,
    crestMin: 8,
    crestMax: 12,
    lowMin: 0.3,
    lowMax: 0.5,
    highMin: 0.2,
    highMax: 0.4,
    widthMin: 0.25,
    widthMax: 0.6,
  },
  {
    id: 'edm',
    label: 'EDM / Club',
    lufsMin: -8,
    lufsMax: -6,
    crestMin: 5,
    crestMax: 9,
    lowMin: 0.35,
    lowMax: 0.6,
    highMin: 0.22,
    highMax: 0.45,
    widthMin: 0.3,
    widthMax: 0.7,
  },
];

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

  const windowCount = 20;
  const peakWindows = Array.from({ length: windowCount }, () => 0);
  const topPeaks: { amp: number; time: number }[] = [];
  const clipThreshold = 0.999;
  const hotThreshold = Math.pow(10, -0.3 / 20);
  let clipCount = 0;
  let hotPeakCount = 0;

  for (let i = 0; i < length; i += stride) {
    const l = left[i];
    const r = right ? right[i] : l;
    const sample = (l + r) * 0.5;
    const absSample = Math.max(Math.abs(l), Math.abs(r));

    peak = Math.max(peak, absSample);
    sumSquares += sample * sample;
    sum += sample;
    count += 1;

    if (absSample >= clipThreshold) {
      clipCount += 1;
    }
    if (absSample >= hotThreshold) {
      hotPeakCount += 1;
    }

    const windowIndex = Math.min(windowCount - 1, Math.floor((i / length) * windowCount));
    peakWindows[windowIndex] = Math.max(peakWindows[windowIndex], absSample);

    if (topPeaks.length < 5 || absSample > topPeaks[topPeaks.length - 1].amp) {
      const time = i / sampleRate;
      topPeaks.push({ amp: absSample, time });
      topPeaks.sort((a, b) => b.amp - a.amp);
      topPeaks.splice(5);
    }

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
    hotPeakCount,
    clipCount,
    peakWindows,
    peakMoments: topPeaks.map((item) => item.time),
  };
}

function buildChecklist(result: AnalysisResult): ChecklistItem[] {
  const items: ChecklistItem[] = [];

  // Calibrated for modern hip-hop/trap/lo-fi/boombap masters
  const peakOk = result.peakDb <= -0.2 && result.peakDb >= -1.5;
  items.push({
    label: 'Headroom / clipping',
    status: peakOk ? 'ok' : 'warn',
    detail: peakOk
      ? 'True peak v bezpečné zóně moderního masteru.'
      : `Peak ${result.peakDb.toFixed(1)} dBFS (mimo rozsah -1.5 až -0.2).`,
  });

  const loudnessOk = result.rmsDb <= -6 && result.rmsDb >= -12;
  items.push({
    label: 'Průměrná hlasitost (RMS)',
    status: loudnessOk ? 'ok' : 'warn',
    detail: `RMS ${result.rmsDb.toFixed(1)} dBFS (hip-hop master typicky -12 až -6).`,
  });

  const crestOk = result.crestDb >= 6 && result.crestDb <= 12;
  items.push({
    label: 'Dynamika / crest factor',
    status: crestOk ? 'ok' : 'warn',
    detail: `Crest ${result.crestDb.toFixed(1)} dB (rap/trap typicky 6–12).`,
  });

  const dcOk = Math.abs(result.dcOffset) < 0.01;
  items.push({
    label: 'DC offset',
    status: dcOk ? 'ok' : 'warn',
    detail: `DC ${result.dcOffset.toFixed(4)} (mělo by být blízko 0).`,
  });

  if (result.stereoCorrelation !== null) {
    const corrOk = result.stereoCorrelation > -0.2;
    items.push({
      label: 'Mono kompatibilita',
      status: corrOk ? 'ok' : 'warn',
      detail: `Korelace ${result.stereoCorrelation.toFixed(2)} (nižší = problém v mono).`,
    });
  }

  if (result.widthRatio !== null) {
    const widthOk = result.widthRatio >= 0.1 && result.widthRatio <= 0.9;
    items.push({
      label: 'Stereo šířka',
      status: widthOk ? 'ok' : 'warn',
      detail: `Side/Mid ${result.widthRatio.toFixed(2)} (rap/boombap typicky 0.1–0.9).`,
    });
  }

  const lowOk = result.lowRatio >= 0.35 && result.lowRatio <= 0.9;
  items.push({
    label: 'Low end balance',
    status: lowOk ? 'ok' : 'warn',
    detail: `Low ratio ${result.lowRatio.toFixed(2)} (trap/808 typicky 0.35–0.9).`,
  });

  const highOk = result.highRatio >= 0.12 && result.highRatio <= 0.4;
  items.push({
    label: 'High end balance',
    status: highOk ? 'ok' : 'warn',
    detail: `High ratio ${result.highRatio.toFixed(2)} (rap/lo-fi typicky 0.12–0.4).`,
  });

  return items;
}

export default function MixChecklistPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [targetId, setTargetId] = useState(mixTargets[0].id);

  const checklist = useMemo(() => (result ? buildChecklist(result) : []), [result]);
  const activeTarget = useMemo(
    () => mixTargets.find((target) => target.id === targetId) ?? mixTargets[0],
    [targetId]
  );

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

                    <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                        Porovnání s cílem (žánr)
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {mixTargets.map((target) => (
                          <button
                            key={target.id}
                            type="button"
                            onClick={() => setTargetId(target.id)}
                            className={`rounded-full px-3 py-2 text-[10px] uppercase tracking-[0.2em] transition ${
                              target.id === targetId
                                ? 'bg-[var(--mpc-accent)] text-black'
                                : 'border border-white/10 bg-black/40 text-white hover:border-[var(--mpc-accent)]'
                            }`}
                          >
                            {target.label}
                          </button>
                        ))}
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        {[
                          {
                            label: 'Loudness (RMS)',
                            value: result.rmsDb,
                            min: activeTarget.lufsMin,
                            max: activeTarget.lufsMax,
                            format: (v: number) => `${v.toFixed(1)} dBFS`,
                          },
                          {
                            label: 'Crest factor',
                            value: result.crestDb,
                            min: activeTarget.crestMin,
                            max: activeTarget.crestMax,
                            format: (v: number) => `${v.toFixed(1)} dB`,
                          },
                          {
                            label: 'Low ratio',
                            value: result.lowRatio,
                            min: activeTarget.lowMin,
                            max: activeTarget.lowMax,
                            format: (v: number) => v.toFixed(2),
                          },
                          {
                            label: 'High ratio',
                            value: result.highRatio,
                            min: activeTarget.highMin,
                            max: activeTarget.highMax,
                            format: (v: number) => v.toFixed(2),
                          },
                          {
                            label: 'Stereo width',
                            value: result.widthRatio ?? NaN,
                            min: activeTarget.widthMin,
                            max: activeTarget.widthMax,
                            format: (v: number) => (Number.isFinite(v) ? v.toFixed(2) : 'Mono'),
                          },
                        ].map((item) => {
                          const ok = Number.isFinite(item.value)
                            ? item.value >= item.min && item.value <= item.max
                            : false;
                          return (
                            <div
                              key={item.label}
                              className={`rounded-xl border px-3 py-2 ${
                                ok
                                  ? 'border-[rgba(0,86,63,0.6)] bg-[rgba(0,86,63,0.18)] text-white'
                                  : 'border-[rgba(243,116,51,0.6)] bg-[rgba(243,116,51,0.12)] text-white'
                              }`}
                            >
                              <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                                {item.label}
                              </p>
                              <p className="mt-1 text-white">{item.format(item.value)}</p>
                              <p className="mt-1 text-[10px] text-[var(--mpc-muted)]">
                                Cíl {item.min} – {item.max}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">
                        Clipping &amp; Peaks
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl border border-white/10 bg-black/50 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Hot peaks</p>
                          <p className="mt-1 text-white">{result.hotPeakCount}</p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/50 px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Clipping</p>
                          <p className="mt-1 text-white">{result.clipCount}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-end gap-1">
                        {result.peakWindows.map((value, index) => (
                          <div
                            key={`${index}-${value}`}
                            className="flex-1 rounded-t bg-[var(--mpc-accent)]/70"
                            style={{ height: `${Math.max(6, value * 80)}px` }}
                            title={`Peak ${(value * 100).toFixed(1)}%`}
                          />
                        ))}
                      </div>
                      {result.peakMoments.length > 0 && (
                        <p className="mt-3 text-[11px] text-[var(--mpc-muted)]">
                          Nejvyšší peaky: {result.peakMoments.map((time) => `${time.toFixed(2)}s`).join(', ')}
                        </p>
                      )}
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
