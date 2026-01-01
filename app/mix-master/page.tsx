'use client';

import type { ChangeEvent, DragEvent } from 'react';
import { useMemo, useState } from 'react';
import { MainNav } from '@/components/main-nav';

type Mode = 'mix' | 'master' | 'both';

type Analysis = {
  peakDb: number;
  rmsDb: number;
  lowRatio: number;
  highRatio: number;
  widthRatio: number | null;
};

type FixPlan = {
  lowGain: number;
  highGain: number;
  width: number;
  targetPeak: number;
  mode: 'safe' | 'full';
  reason?: string;
};

type StylePreset = 'rap' | 'lofi' | 'clean';

type MasterSettings = {
  lowShelf: number;
  highShelf: number;
  compThreshold: number;
  compRatio: number;
  compAttack: number;
  compRelease: number;
  outputGain: number;
};

const MAX_SAMPLE_POINTS = 1_000_000;

const PRESETS: Record<StylePreset, MasterSettings> = {
  rap: {
    lowShelf: 2.5,
    highShelf: 1.5,
    compThreshold: -18,
    compRatio: 3.2,
    compAttack: 0.01,
    compRelease: 0.18,
    outputGain: 0,
  },
  lofi: {
    lowShelf: 1,
    highShelf: -2,
    compThreshold: -20,
    compRatio: 2.4,
    compAttack: 0.03,
    compRelease: 0.25,
    outputGain: 0,
  },
  clean: {
    lowShelf: 0,
    highShelf: 0.8,
    compThreshold: -16,
    compRatio: 2.2,
    compAttack: 0.02,
    compRelease: 0.2,
    outputGain: 0,
  },
};

function dbfs(value: number) {
  if (value <= 0) return -Infinity;
  return 20 * Math.log10(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatDb(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)} dB`;
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

async function analyzeBuffer(buffer: AudioBuffer): Promise<Analysis> {
  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  const stride = Math.max(1, Math.floor(length / MAX_SAMPLE_POINTS));

  const left = buffer.getChannelData(0);
  const right = channels > 1 ? buffer.getChannelData(1) : null;

  let peak = 0;
  let sumSquares = 0;
  let count = 0;
  let midSquares = 0;
  let sideSquares = 0;

  for (let i = 0; i < length; i += stride) {
    const l = left[i];
    const r = right ? right[i] : l;
    const sample = (l + r) * 0.5;
    peak = Math.max(peak, Math.abs(l), Math.abs(r));
    sumSquares += sample * sample;
    count += 1;

    if (right) {
      const mid = (l + r) * 0.5;
      const side = (l - r) * 0.5;
      midSquares += mid * mid;
      sideSquares += side * side;
    }
  }

  let widthRatio: number | null = null;
  if (right) {
    widthRatio =
      Math.sqrt(sideSquares / Math.max(1, count)) / Math.max(1e-6, Math.sqrt(midSquares / Math.max(1, count)));
  }

  const rms = Math.sqrt(sumSquares / Math.max(1, count));
  const [lowRms, highRms] = await Promise.all([
    renderFilteredRms(buffer, 'lowpass', 150),
    renderFilteredRms(buffer, 'highpass', 3000),
  ]);

  return {
    peakDb: dbfs(peak),
    rmsDb: dbfs(rms),
    lowRatio: lowRms / Math.max(1e-6, rms),
    highRatio: highRms / Math.max(1e-6, rms),
    widthRatio,
  };
}

function buildPlan(analysis: Analysis, options: { mode: 'safe' | 'full'; reason?: string }): FixPlan {
  const maxGain = options.mode === 'safe' ? 2 : 4;
  const minWidth = options.mode === 'safe' ? 0.95 : 0.9;
  const maxWidth = options.mode === 'safe' ? 1.15 : 1.4;
  const targetLow = 0.55;
  const targetHigh = 0.22;
  const lowGain = clamp((targetLow - analysis.lowRatio) * 10, -maxGain, maxGain);
  const highGain = clamp((targetHigh - analysis.highRatio) * 10, -maxGain, maxGain);
  const widthTarget = 0.35;
  const width = clamp(widthTarget / Math.max(0.1, analysis.widthRatio ?? widthTarget), minWidth, maxWidth);
  return {
    lowGain,
    highGain,
    width,
    targetPeak: -0.5,
    mode: options.mode,
    reason: options.reason,
  };
}

function encodeWav16(buffer: AudioBuffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = length * blockAlign;
  const bufferSize = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < length; i += 1) {
    for (let ch = 0; ch < numChannels; ch += 1) {
      const sample = buffer.getChannelData(ch)[i];
      const clamped = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, clamped * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

async function processMix(buffer: AudioBuffer, plan: FixPlan) {
  const offline = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  const source = offline.createBufferSource();
  source.buffer = buffer;

  const low = offline.createBiquadFilter();
  low.type = 'lowshelf';
  low.frequency.value = 120;
  low.gain.value = plan.lowGain;

  const high = offline.createBiquadFilter();
  high.type = 'highshelf';
  high.frequency.value = 8000;
  high.gain.value = plan.highGain;

  const compressor = offline.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.ratio.value = 2.4;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;

  source.connect(low);
  low.connect(high);
  high.connect(compressor);
  compressor.connect(offline.destination);
  source.start(0);

  const rendered = await offline.startRendering();

  if (rendered.numberOfChannels < 2) {
    return rendered;
  }

  const left = rendered.getChannelData(0);
  const right = rendered.getChannelData(1);
  for (let i = 0; i < rendered.length; i += 1) {
    const mid = (left[i] + right[i]) * 0.5;
    const side = (left[i] - right[i]) * 0.5 * plan.width;
    left[i] = mid + side;
    right[i] = mid - side;
  }

  let peak = 0;
  for (let i = 0; i < rendered.length; i += 1) {
    peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
  }
  const target = Math.pow(10, plan.targetPeak / 20);
  const gain = peak > 0 ? target / peak : 1;
  if (gain < 1 || gain > 1.02) {
    for (let i = 0; i < rendered.length; i += 1) {
      left[i] *= gain;
      right[i] *= gain;
    }
  }

  return rendered;
}

async function processMaster(buffer: AudioBuffer, settings: MasterSettings, targetPeak = -1) {
  const offline = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
  const source = offline.createBufferSource();
  source.buffer = buffer;

  const lowShelf = offline.createBiquadFilter();
  lowShelf.type = 'lowshelf';
  lowShelf.frequency.value = 120;
  lowShelf.gain.value = settings.lowShelf;

  const highShelf = offline.createBiquadFilter();
  highShelf.type = 'highshelf';
  highShelf.frequency.value = 9000;
  highShelf.gain.value = settings.highShelf;

  const compressor = offline.createDynamicsCompressor();
  compressor.threshold.value = settings.compThreshold;
  compressor.ratio.value = settings.compRatio;
  compressor.attack.value = settings.compAttack;
  compressor.release.value = settings.compRelease;

  const outputGain = offline.createGain();
  outputGain.gain.value = Math.pow(10, settings.outputGain / 20);

  source.connect(lowShelf);
  lowShelf.connect(highShelf);
  highShelf.connect(compressor);
  compressor.connect(outputGain);
  outputGain.connect(offline.destination);

  source.start();
  const rendered = await offline.startRendering();

  let peak = 0;
  for (let ch = 0; ch < rendered.numberOfChannels; ch += 1) {
    const data = rendered.getChannelData(ch);
    for (let i = 0; i < rendered.length; i += 1) {
      peak = Math.max(peak, Math.abs(data[i]));
    }
  }

  const targetLinear = Math.pow(10, targetPeak / 20);
  const gainFactor = peak > 0 ? targetLinear / peak : 1;
  for (let ch = 0; ch < rendered.numberOfChannels; ch += 1) {
    const data = rendered.getChannelData(ch);
    for (let i = 0; i < rendered.length; i += 1) {
      data[i] *= gainFactor;
    }
  }

  return rendered;
}

export default function MixMasterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [mode, setMode] = useState<Mode>('both');
  const [preset, setPreset] = useState<StylePreset>('rap');
  const [safeMode, setSafeMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [plan, setPlan] = useState<FixPlan | null>(null);
  const [wavBlob, setWavBlob] = useState<Blob | null>(null);
  const [wavUrl, setWavUrl] = useState<string | null>(null);
  const [mp3Url, setMp3Url] = useState<string | null>(null);
  const [mp3Loading, setMp3Loading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settings = PRESETS[preset];

  const resetOutputs = () => {
    setAnalysis(null);
    setPlan(null);
    setWavBlob(null);
    setWavUrl(null);
    setMp3Url(null);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const dropped = Array.from(event.dataTransfer.files).find((f) => f.type.includes('audio'));
    if (dropped) {
      setFile(dropped);
      resetOutputs();
    }
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    resetOutputs();
    event.target.value = '';
  };

  const handleProcess = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setMp3Url(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const ctx = new AudioContext();
      const buffer = await ctx.decodeAudioData(arrayBuffer);

      let workingBuffer = buffer;
      let stats: Analysis | null = null;
      let plan: FixPlan | null = null;

      if (mode === 'mix' || mode === 'both') {
        stats = await analyzeBuffer(buffer);
        const masteredDetected = stats.rmsDb >= -10 && stats.peakDb >= -1.2;
        const effectiveMode = masteredDetected || safeMode ? 'safe' : 'full';
        const reason = masteredDetected
          ? 'Detekovaný master – Safe mód zamezí přehnaným zásahům.'
          : undefined;
        plan = buildPlan(stats, { mode: effectiveMode, reason });
        workingBuffer = await processMix(workingBuffer, plan);
      }

      if (mode === 'master' || mode === 'both') {
        workingBuffer = await processMaster(workingBuffer, settings, -1);
      }

      const wav = encodeWav16(workingBuffer);
      const url = URL.createObjectURL(wav);
      setWavBlob(wav);
      setWavUrl(url);
      setAnalysis(stats);
      setPlan(plan);

      await ctx.close();
    } catch (err: any) {
      setError(err?.message || 'Zpracování selhalo.');
    } finally {
      setLoading(false);
    }
  };

  const handleMp3 = async () => {
    if (!wavBlob) return;
    setMp3Loading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', wavBlob, 'mix-master.wav');
      const res = await fetch('/api/ai-mastering-mp3', { method: 'POST', body: formData });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'MP3 export selhal.');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setMp3Url(url);
    } catch (err: any) {
      setError(err?.message || 'MP3 export selhal.');
    } finally {
      setMp3Loading(false);
    }
  };

  const planSummary = useMemo(() => {
    if (!analysis || !plan) return null;
    return [
      `Mode ${plan.mode.toUpperCase()}${plan.reason ? ' (auto)' : ''}`,
      `Low shelf ${plan.lowGain > 0 ? '+' : ''}${plan.lowGain.toFixed(1)} dB`,
      `High shelf ${plan.highGain > 0 ? '+' : ''}${plan.highGain.toFixed(1)} dB`,
      `Stereo width ${plan.width.toFixed(2)}x`,
      `Target peak ${plan.targetPeak} dBFS`,
    ];
  }, [analysis, plan]);

  return (
    <main className="min-h-screen bg-[var(--mpc-deck,#050505)] text-white">
      <MainNav />
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10">
        <div className="rounded-3xl border border-white/10 bg-[var(--mpc-panel)] p-8 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.8)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.45em] text-[var(--mpc-muted)]">Mix + Master</p>
              <h1 className="text-3xl font-semibold uppercase tracking-[0.18em]">Mix / Master Studio</h1>
              <p className="text-sm text-[var(--mpc-muted)]">
                Jeden krok pro mix, mastering nebo kombinaci obojího. Výstup WAV + MP3.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-xs text-[var(--mpc-muted)]">
              <p className="uppercase tracking-[0.24em] text-[var(--mpc-accent)]">Local + MP3 export</p>
              <p className="mt-2">Mix/master lokálně, MP3 přes ffmpeg.</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
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
                <p className="mt-2 text-xs text-[var(--mpc-muted)]">WAV / MP3 / AIFF</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-black/50 px-5 py-3 text-xs uppercase tracking-[0.3em] text-white hover:border-[var(--mpc-accent)]">
                  Vybrat soubor
                  <input type="file" accept="audio/*" className="hidden" onChange={handleFileInput} />
                </label>
                <button
                  onClick={handleProcess}
                  disabled={!file || loading}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--mpc-accent)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Zpracovávám…' : 'Spustit'}
                </button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 px-6 py-4 text-sm text-[var(--mpc-muted)]">
                <p className="uppercase tracking-[0.2em] text-[var(--mpc-accent)]">Vybraný soubor</p>
                <p className="mt-2">{file?.name || 'Zatím žádný soubor'}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 px-6 py-4 text-sm text-[var(--mpc-muted)] space-y-3">
                <p className="uppercase tracking-[0.2em] text-[var(--mpc-accent)]">Režim</p>
                <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.25em]">
                  {(['mix', 'master', 'both'] as Mode[]).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMode(value)}
                      className={`rounded-full px-4 py-2 transition ${
                        mode === value
                          ? 'bg-[var(--mpc-accent)] text-black'
                          : 'border border-white/10 bg-black/40 text-white hover:border-[var(--mpc-accent)]'
                      }`}
                    >
                      {value === 'both' ? 'mix + master' : value}
                    </button>
                  ))}
                </div>

                {(mode === 'mix' || mode === 'both') && (
                  <div className="text-xs uppercase tracking-[0.25em]">
                    <button
                      type="button"
                      onClick={() => setSafeMode((prev) => !prev)}
                      className={`rounded-full px-4 py-2 transition ${
                        safeMode
                          ? 'bg-white/10 text-white'
                          : 'border border-white/10 text-[var(--mpc-muted)]'
                      }`}
                    >
                      {safeMode ? 'Safe mode ON' : 'Safe mode OFF'}
                    </button>
                  </div>
                )}

                {(mode === 'master' || mode === 'both') && (
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Master preset</p>
                    <div className="flex flex-wrap gap-2">
                      {(['rap', 'lofi', 'clean'] as StylePreset[]).map((style) => (
                        <button
                          key={style}
                          onClick={() => setPreset(style)}
                          className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                            preset === style
                              ? 'bg-[var(--mpc-accent)] text-black'
                              : 'border border-white/10 text-[var(--mpc-muted)] hover:text-white'
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-[var(--mpc-muted)] space-y-1">
                      <p>Low shelf: {formatDb(settings.lowShelf)}</p>
                      <p>High shelf: {formatDb(settings.highShelf)}</p>
                      <p>Compression: {settings.compThreshold} dB / ratio {settings.compRatio}</p>
                    </div>
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
              <p className="uppercase tracking-[0.24em] text-[var(--mpc-accent-2)]">Výstup</p>
              <div className="mt-4 space-y-4 text-sm text-[var(--mpc-muted)]">
                {wavUrl ? (
                  <>
                    <audio controls className="w-full">
                      <source src={wavUrl} />
                      Váš prohlížeč nepodporuje přehrávání.
                    </audio>
                    <div className="flex flex-wrap gap-3">
                      <a
                        href={wavUrl}
                        download={`beets-mix-master-${Date.now()}.wav`}
                        className="inline-flex items-center rounded-full border border-[var(--mpc-accent)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-accent)]"
                      >
                        Stáhnout WAV
                      </a>
                      {mp3Url ? (
                        <a
                          href={mp3Url}
                          download={`beets-mix-master-${Date.now()}.mp3`}
                          className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white"
                        >
                          Stáhnout MP3
                        </a>
                      ) : (
                        <button
                          onClick={handleMp3}
                          disabled={mp3Loading}
                          className="inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white disabled:opacity-60"
                        >
                          {mp3Loading ? 'MP3 export…' : 'Vytvořit MP3'}
                        </button>
                      )}
                    </div>
                    {planSummary && (
                      <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-[var(--mpc-muted)] space-y-1">
                        <p className="uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Plán úprav</p>
                        {planSummary.map((line) => (
                          <p key={line}>{line}</p>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p>Nahraj audio a spusť zpracování.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
