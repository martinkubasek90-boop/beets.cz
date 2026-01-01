'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MainNav } from '@/components/main-nav';

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

function formatDb(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)} dB`;
}

function createWavBuffer(audioBuffer: AudioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numFrames = audioBuffer.length;
  const bitDepth = 16;
  const blockAlign = (numChannels * bitDepth) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i += 1) {
      view.setUint8(offset + i, str.charCodeAt(i));
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
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numFrames; i += 1) {
    for (let channel = 0; channel < numChannels; channel += 1) {
      const sample = audioBuffer.getChannelData(channel)[i];
      const clamped = Math.max(-1, Math.min(1, sample));
      const intSample = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Uint8Array(buffer);
}

async function renderMaster(
  file: File,
  settings: MasterSettings,
  targetPeak = -1
): Promise<{ buffer: AudioBuffer; peak: number; rms: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const context = new AudioContext();
  const decoded = await context.decodeAudioData(arrayBuffer);
  const offline = new OfflineAudioContext(
    decoded.numberOfChannels,
    decoded.length,
    decoded.sampleRate
  );

  const source = offline.createBufferSource();
  source.buffer = decoded;

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
  await context.close();

  // Peak + RMS
  let peak = 0;
  let sumSquares = 0;
  const length = rendered.length;
  for (let ch = 0; ch < rendered.numberOfChannels; ch += 1) {
    const data = rendered.getChannelData(ch);
    for (let i = 0; i < length; i += 1) {
      const sample = Math.abs(data[i]);
      if (sample > peak) peak = sample;
      sumSquares += data[i] * data[i];
    }
  }
  const rms = Math.sqrt(sumSquares / (length * rendered.numberOfChannels));

  const targetLinear = Math.pow(10, targetPeak / 20);
  const gainFactor = peak > 0 ? targetLinear / peak : 1;
  for (let ch = 0; ch < rendered.numberOfChannels; ch += 1) {
    const data = rendered.getChannelData(ch);
    for (let i = 0; i < length; i += 1) {
      data[i] *= gainFactor;
    }
  }

  return { buffer: rendered, peak, rms };
}

export default function AiMasteringPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<StylePreset>('rap');
  const [processing, setProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [mp3Url, setMp3Url] = useState<string | null>(null);
  const [mp3Loading, setMp3Loading] = useState(false);
  const [wavBlob, setWavBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ peak: number; rms: number } | null>(null);

  const settings = PRESETS[preset];

  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
      if (mp3Url) URL.revokeObjectURL(mp3Url);
    };
  }, [downloadUrl, mp3Url]);

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    setStats(null);
    setMp3Url(null);

    try {
      const { buffer, peak, rms } = await renderMaster(file, settings, -1);
      const wavData = createWavBuffer(buffer);
      const blob = new Blob([wavData], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setWavBlob(blob);
      setStats({
        peak: 20 * Math.log10(peak || 1e-6),
        rms: 20 * Math.log10(rms || 1e-6),
      });
    } catch (err: any) {
      setError(err?.message || 'Mastering selhal.');
    } finally {
      setProcessing(false);
    }
  };

  const handleMp3 = async () => {
    if (!wavBlob) return;
    setMp3Loading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', wavBlob, 'master.wav');
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

  const note = useMemo(() => {
    if (preset === 'rap') return 'Rap/Trap mix – důraz na low-end + čistotu výšek.';
    if (preset === 'lofi') return 'Lo-fi vibe – měkčí výšky a klidnější komprese.';
    return 'Clean – vyvážený mastering bez výrazných zásahů.';
  }, [preset]);

  return (
    <main className="min-h-screen bg-[var(--mpc-deck,#050505)] text-white">
      <MainNav />
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10">
        <div className="rounded-3xl border border-white/10 bg-[var(--mpc-panel)] p-8 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.8)]">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.45em] text-[var(--mpc-muted)]">AI Mastering Lite</p>
              <h1 className="text-3xl font-semibold uppercase tracking-[0.18em]">AI Mastering</h1>
              <p className="text-sm text-[var(--mpc-muted)]">
                Lokální mastering v prohlížeči – bez ukládání do databáze.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-xs text-[var(--mpc-muted)]">
              <p className="uppercase tracking-[0.24em] text-[var(--mpc-accent)]">WAV Export</p>
              <p className="mt-2">Výstup je WAV, bez uploadu na server.</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-6 space-y-4">
              <label className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Audio soubor</label>
              <input
                type="file"
                accept="audio/*"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                className="text-sm text-[var(--mpc-muted)]"
              />

              <label className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Preset</label>
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

              <p className="text-xs text-[var(--mpc-muted)]">{note}</p>

              <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-xs text-[var(--mpc-muted)] space-y-1">
                <p>Low shelf: {formatDb(settings.lowShelf)}</p>
                <p>High shelf: {formatDb(settings.highShelf)}</p>
                <p>Compression: {settings.compThreshold} dB / ratio {settings.compRatio}</p>
              </div>

              <button
                onClick={handleProcess}
                disabled={!file || processing}
                className="rounded-full bg-[var(--mpc-accent)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-black disabled:opacity-60"
              >
                {processing ? 'Zpracovávám…' : 'Spustit mastering'}
              </button>

              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-6">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Výstup</p>
              {downloadUrl ? (
                <div className="mt-4 space-y-4">
                  <audio controls className="w-full">
                    <source src={downloadUrl} />
                    Váš prohlížeč nepodporuje přehrávání.
                  </audio>
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={downloadUrl}
                      download={`beets-master-${Date.now()}.wav`}
                      className="inline-flex items-center rounded-full border border-[var(--mpc-accent)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-accent)]"
                    >
                      Stáhnout WAV
                    </a>
                    {mp3Url ? (
                      <a
                        href={mp3Url}
                        download={`beets-master-${Date.now()}.mp3`}
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
                  {stats && (
                    <div className="text-xs text-[var(--mpc-muted)]">
                      Peak: {stats.peak.toFixed(2)} dBFS · RMS: {stats.rms.toFixed(2)} dBFS
                    </div>
                  )}
                </div>
              ) : (
                <p className="mt-3 text-sm text-[var(--mpc-muted)]">Nahraj audio a spusť mastering.</p>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
