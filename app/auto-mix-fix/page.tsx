'use client';

import type { ChangeEvent, DragEvent } from 'react';
import { useMemo, useState } from 'react';
import { MainNav } from '@/components/main-nav';

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

const MAX_SAMPLE_POINTS = 1_000_000;

function dbfs(value: number) {
  if (value <= 0) return -Infinity;
  return 20 * Math.log10(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
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
  let sumL = 0;
  let sumR = 0;
  let sumLL = 0;
  let sumRR = 0;
  let sumLR = 0;
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

async function processBuffer(buffer: AudioBuffer, plan: FixPlan) {
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

export default function AutoMixFixPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [plan, setPlan] = useState<FixPlan | null>(null);
  const [mp3Url, setMp3Url] = useState<string | null>(null);
  const [wavBlob, setWavBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [safeMode, setSafeMode] = useState(true);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const dropped = Array.from(event.dataTransfer.files).find((f) => f.type.includes('audio'));
    if (dropped) {
      setFile(dropped);
      setAnalysis(null);
      setPlan(null);
      setMp3Url(null);
      setWavBlob(null);
    }
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setAnalysis(null);
    setPlan(null);
    setMp3Url(null);
    setWavBlob(null);
    event.target.value = '';
  };

  const runFix = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setMp3Url(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const ctx = new AudioContext();
      const buffer = await ctx.decodeAudioData(arrayBuffer);
      const stats = await analyzeBuffer(buffer);
      const masteredDetected = stats.rmsDb >= -10 && stats.peakDb >= -1.2;
      const effectiveMode = masteredDetected || safeMode ? 'safe' : 'full';
      const reason = masteredDetected
        ? 'Detekovaný master – Safe mód zamezí přehnaným zásahům.'
        : undefined;
      const plan = buildPlan(stats, { mode: effectiveMode, reason });
      const processed = await processBuffer(buffer, plan);
      const wav = encodeWav16(processed);
      setAnalysis(stats);
      setPlan(plan);
      setWavBlob(wav);

      const formData = new FormData();
      formData.append('file', wav, 'mix-fix.wav');
      const response = await fetch('/api/encode-mp3', { method: 'POST', body: formData });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'MP3 export selhal.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setMp3Url(url);
      await ctx.close();
    } catch (err: any) {
      setError(err?.message || 'Zpracování selhalo.');
    } finally {
      setLoading(false);
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
              <p className="text-[11px] uppercase tracking-[0.45em] text-[var(--mpc-muted)]">Auto Mix Fix</p>
              <h1 className="text-3xl font-semibold uppercase tracking-[0.18em]">Auto Mix Fix (MP3)</h1>
              <p className="text-sm text-[var(--mpc-muted)]">
                Automatické úpravy (EQ, stereo width, jemná komprese) podle analýzy.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-xs text-[var(--mpc-muted)]">
              <p className="uppercase tracking-[0.24em] text-[var(--mpc-accent)]">Offline + Server</p>
              <p className="mt-2">Zpracování lokálně, MP3 export na serveru.</p>
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
                  onClick={runFix}
                  disabled={!file || loading}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--mpc-accent)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Zpracovávám…' : 'Aplikovat mix fix'}
                </button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 px-6 py-4 text-sm text-[var(--mpc-muted)]">
                <p className="uppercase tracking-[0.2em] text-[var(--mpc-accent)]">Vybraný soubor</p>
                <p className="mt-2">{file?.name || 'Zatím žádný soubor'}</p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 px-6 py-4 text-sm text-[var(--mpc-muted)]">
                <p className="uppercase tracking-[0.2em] text-[var(--mpc-accent)]">Režim zpracování</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.25em]">
                  <button
                    type="button"
                    onClick={() => setSafeMode(true)}
                    className={`rounded-full px-4 py-2 transition ${
                      safeMode
                        ? 'bg-[var(--mpc-accent)] text-black'
                        : 'border border-white/10 bg-black/40 text-white hover:border-[var(--mpc-accent)]'
                    }`}
                  >
                    Safe
                  </button>
                  <button
                    type="button"
                    onClick={() => setSafeMode(false)}
                    className={`rounded-full px-4 py-2 transition ${
                      !safeMode
                        ? 'bg-[var(--mpc-accent)] text-black'
                        : 'border border-white/10 bg-black/40 text-white hover:border-[var(--mpc-accent)]'
                    }`}
                  >
                    Full
                  </button>
                </div>
                <p className="mt-2 text-xs text-[var(--mpc-muted)]">
                  Safe = jemnější zásahy, Full = výraznější úpravy. Mastery se přepnou do Safe automaticky.
                </p>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/35 p-6">
              <p className="uppercase tracking-[0.24em] text-[var(--mpc-accent-2)]">Výstup</p>
              <div className="mt-4 space-y-4 text-sm text-[var(--mpc-muted)]">
                {analysis && plan ? (
                  <>
                    <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-xs">
                      <p className="uppercase tracking-[0.2em] text-[10px] text-[var(--mpc-muted)]">Plán úprav</p>
                      <div className="mt-2 space-y-1 text-white">
                        {planSummary?.map((item) => (
                          <p key={item}>{item}</p>
                        ))}
                      </div>
                      {plan.reason && <p className="mt-2 text-[11px] text-[var(--mpc-muted)]">{plan.reason}</p>}
                    </div>
                    {mp3Url && (
                      <a
                        href={mp3Url}
                        download="mix-fix.mp3"
                        className="inline-flex w-full items-center justify-center rounded-full bg-[var(--mpc-accent)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-black transition hover:brightness-110"
                      >
                        Stáhnout MP3
                      </a>
                    )}
                    <p className="text-xs text-[var(--mpc-muted)]">
                      WAV export je zatím interní a není dostupný ke stažení.
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-[var(--mpc-muted)]">Nahraj audio a spusť Auto Mix Fix.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
