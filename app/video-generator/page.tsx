'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MainNav } from '@/components/main-nav';

type Preset = {
  id: string;
  label: string;
  prompt: string;
};

const stylePresets: Preset[] = [
  {
    id: 'abstract',
    label: 'Abstract Loop',
    prompt: 'abstract motion graphics, smooth gradients, soft glow, seamless loop',
  },
  {
    id: 'neon',
    label: 'Neon City',
    prompt: 'neon city lights, cyberpunk ambience, cinematic haze, seamless loop',
  },
  {
    id: 'lofi',
    label: 'Lo-Fi Film',
    prompt: 'lofi film texture, dust and grain, warm tones, subtle camera drift, seamless loop',
  },
  {
    id: 'storm',
    label: 'Stormy Mood',
    prompt: 'moody clouds, slow moving fog, dramatic lighting, cinematic, seamless loop',
  },
  {
    id: 'space',
    label: 'Deep Space',
    prompt: 'deep space nebula, slow drifting stars, ethereal glow, seamless loop',
  },
];

export default function VideoGeneratorPage() {
  const [prompt, setPrompt] = useState('');
  const [styleId, setStyleId] = useState(stylePresets[0].id);
  const [duration, setDuration] = useState<4 | 8>(4);
  const [loading, setLoading] = useState(false);
  const [looping, setLooping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loopUrl, setLoopUrl] = useState<string | null>(null);
  const [loopCount, setLoopCount] = useState(3);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const stylePrompt = useMemo(
    () => stylePresets.find((preset) => preset.id === styleId)?.prompt ?? '',
    [styleId]
  );

  const composedPrompt = useMemo(() => {
    if (!prompt.trim()) return '';
    return `${prompt.trim()}. ${stylePrompt}. cinematic, high quality, no text.`;
  }, [prompt, stylePrompt]);

  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      if (loopUrl) URL.revokeObjectURL(loopUrl);
    };
  }, [videoUrl, loopUrl]);

  const generateVideo = async () => {
    if (!composedPrompt) return;
    setLoading(true);
    setError(null);
    setLoopUrl(null);
    try {
      const response = await fetch('/api/video-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: composedPrompt, duration }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Generování selhalo.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
      setVideoUrl(url);
    } catch (err: any) {
      setError(err?.message || 'Generování selhalo.');
    } finally {
      setLoading(false);
    }
  };

  const exportLoop = async () => {
    if (!videoUrl || !videoRef.current) return;
    setLooping(true);
    setError(null);
    setLoopUrl(null);
    try {
      const video = videoRef.current;
      video.pause();
      video.currentTime = 0;
      await video.play();

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas není dostupný.');

      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      const draw = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        if (!video.paused && !video.ended) {
          requestAnimationFrame(draw);
        }
      };

      recorder.start();

      for (let i = 0; i < loopCount; i += 1) {
        video.currentTime = 0;
        await video.play();
        draw();
        await new Promise((resolve) => {
          video.onended = resolve;
        });
      }

      recorder.stop();

      const blob: Blob = await new Promise((resolve) => {
        recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }));
      });

      const url = URL.createObjectURL(blob);
      setLoopUrl(url);
    } catch (err: any) {
      setError(err?.message || 'Loop export selhal.');
    } finally {
      setLooping(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--mpc-deck,#050505)] text-white">
      <MainNav />
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10">
        <div className="rounded-3xl border border-white/10 bg-[var(--mpc-panel)] p-8 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.8)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.45em] text-[var(--mpc-muted)]">AI Video Generator</p>
              <h1 className="text-3xl font-semibold uppercase tracking-[0.18em]">Video Generator</h1>
              <p className="text-sm text-[var(--mpc-muted)]">
                Krátký video loop pro beat. Výstup 4–8s + možnost prodlouženého loopu.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-xs text-[var(--mpc-muted)]">
              <p className="uppercase tracking-[0.24em] text-[var(--mpc-accent)]">HF Serverless</p>
              <p className="mt-2">Free model, může být pomalejší.</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                <label className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  rows={4}
                  className="mt-3 w-full rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
                  placeholder="Např. temné neonové město v dešti, pomalé světelné odlesky..."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Styl</p>
                  <div className="mt-3 space-y-2">
                    {stylePresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setStyleId(preset.id)}
                        className={`w-full rounded-full px-4 py-2 text-left text-xs uppercase tracking-[0.2em] transition ${
                          preset.id === styleId
                            ? 'bg-[var(--mpc-accent)] text-black'
                            : 'border border-white/10 bg-black/40 text-white hover:border-[var(--mpc-accent)]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Délka klipu</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[4, 8].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setDuration(value as 4 | 8)}
                        className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] transition ${
                          duration === value
                            ? 'bg-[var(--mpc-accent)] text-black'
                            : 'border border-white/10 bg-black/40 text-white hover:border-[var(--mpc-accent)]'
                        }`}
                      >
                        {value}s
                      </button>
                    ))}
                  </div>
                  <div className="mt-4">
                    <label className="text-xs uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Loop</label>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        min={2}
                        max={6}
                        value={loopCount}
                        onChange={(event) => setLoopCount(Number(event.target.value) || 2)}
                        className="w-20 rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-[var(--mpc-accent)]"
                      />
                      <span className="text-xs text-[var(--mpc-muted)]">
                        Opakování (výstup ~{loopCount * duration}s)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={generateVideo}
                  disabled={!composedPrompt || loading}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--mpc-accent)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Generuju…' : 'Vygenerovat video'}
                </button>
                {videoUrl && (
                  <button
                    onClick={exportLoop}
                    disabled={looping}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white hover:border-[var(--mpc-accent)] disabled:opacity-60"
                  >
                    {looping ? 'Vytvářím loop…' : 'Vytvořit loop'}
                  </button>
                )}
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/35 p-6">
              <p className="uppercase tracking-[0.24em] text-[var(--mpc-accent-2)]">Preview</p>
              <div className="mt-4 space-y-4">
                {videoUrl ? (
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/50">
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      controls
                      loop
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="grid aspect-video place-items-center rounded-2xl border border-white/10 bg-black/50 text-xs text-[var(--mpc-muted)]">
                    Zatím nic nevygenerováno.
                  </div>
                )}
                {videoUrl && (
                  <a
                    href={videoUrl}
                    download="beets-video.mp4"
                    className="inline-flex w-full items-center justify-center rounded-full border border-white/15 bg-black/40 px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-white hover:border-[var(--mpc-accent)]"
                  >
                    Stáhnout MP4
                  </a>
                )}
                {loopUrl && (
                  <a
                    href={loopUrl}
                    download="beets-video-loop.webm"
                    className="inline-flex w-full items-center justify-center rounded-full bg-[var(--mpc-accent)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-black hover:brightness-110"
                  >
                    Stáhnout loop (WEBM)
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
