'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MainNav } from '@/components/main-nav';

type Aspect = 'square' | 'vertical';

const ASPECTS: Record<Aspect, { label: string; width: number; height: number }> = {
  square: { label: '1:1 (IG)', width: 1080, height: 1080 },
  vertical: { label: '9:16 (TikTok/Stories)', width: 1080, height: 1920 },
};

export default function PreviewGeneratorPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const coverImgRef = useRef<HTMLImageElement | null>(null);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [aspect, setAspect] = useState<Aspect>('vertical');
  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const coverUrl = useMemo(() => (coverFile ? URL.createObjectURL(coverFile) : null), [coverFile]);
  const audioUrl = useMemo(() => (audioFile ? URL.createObjectURL(audioFile) : null), [audioFile]);

  useEffect(() => {
    return () => {
      if (coverUrl) URL.revokeObjectURL(coverUrl);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [coverUrl, audioUrl, videoUrl]);

  const setupAudioGraph = async () => {
    if (!audioRef.current) return null;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }

    const audioCtx = audioCtxRef.current;
    const source = audioCtx.createMediaElementSource(audioRef.current);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 1024;
    const destination = audioCtx.createMediaStreamDestination();

    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    source.connect(destination);

    analyserRef.current = analyser;
    return destination.stream;
  };

  const drawFrame = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    const coverImg = coverImgRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#050505');
    gradient.addColorStop(1, '#1a0e08');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    if (coverImg) {
      const size = Math.min(width * 0.62, height * 0.45);
      const x = (width - size) / 2;
      const y = height * 0.18;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 30;
      ctx.drawImage(coverImg, x, y, size, size);
      ctx.restore();
    }

    const bufferLength = analyser.frequencyBinCount;
    const data = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(data);

    const bars = 48;
    const barWidth = width / bars;
    const startY = height * 0.7;
    const maxBar = height * 0.18;

    for (let i = 0; i < bars; i++) {
      const v = data[i] / 255;
      const barHeight = v * maxBar + 8;
      ctx.fillStyle = '#f37433';
      ctx.fillRect(i * barWidth + barWidth * 0.15, startY, barWidth * 0.7, barHeight);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px "Georgia", serif';
    ctx.textAlign = 'center';
    ctx.fillText(title || 'PREVIEW', width / 2, height * 0.9);

    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '24px "Georgia", serif';
    ctx.fillText(artist || 'BEETS.CZ', width / 2, height * 0.94);

    rafRef.current = requestAnimationFrame(drawFrame);
  };

  const startRecording = async () => {
    if (!audioFile || !audioUrl) {
      setError('Nahraj audio soubor.');
      return;
    }
    if (!canvasRef.current) return;
    setError(null);

    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }

    const audioEl = new Audio(audioUrl);
    audioEl.crossOrigin = 'anonymous';
    audioRef.current = audioEl;

    const coverImg = new Image();
    coverImg.crossOrigin = 'anonymous';
    coverImg.src = coverUrl || '';
    coverImgRef.current = coverImg;

    const stream = canvasRef.current.captureStream(30);
    const audioStream = await setupAudioGraph();

    if (audioStream) {
      audioStream.getAudioTracks().forEach((track) => stream.addTrack(track));
    }

    let mimeType = 'video/webm;codecs=vp9,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8,opus';
    }

    const recorder = new MediaRecorder(stream, { mimeType });
    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      setRecording(false);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };

    setRecording(true);
    if (audioCtxRef.current?.state === 'suspended') {
      await audioCtxRef.current.resume();
    }

    audioEl.onended = () => {
      recorder.stop();
    };

    recorder.start();
    drawFrame();
    await audioEl.play();
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  const { width, height } = ASPECTS[aspect];

  return (
    <main className="min-h-screen bg-[var(--mpc-deck,#050505)] text-white">
      <MainNav />
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10">
        <div className="rounded-3xl border border-white/10 bg-[var(--mpc-panel)] p-8 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.8)]">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.45em] text-[var(--mpc-muted)]">Preview Generator</p>
              <h1 className="text-3xl font-semibold uppercase tracking-[0.18em]">IG/TikTok Preview</h1>
              <p className="text-sm text-[var(--mpc-muted)]">
                Vygeneruj krátké video s coverem, názvem a waveformem. Export je WebM.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-xs text-[var(--mpc-muted)]">
              <p className="uppercase tracking-[0.24em] text-[var(--mpc-accent)]">Preview Studio</p>
              <p className="mt-2">Lokálně v prohlížeči.</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <div className="space-y-4">
              <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/40 p-5">
                <label className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Audio soubor</label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)}
                  className="text-sm text-[var(--mpc-muted)]"
                />

                <label className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Cover</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)}
                  className="text-sm text-[var(--mpc-muted)]"
                />

                <label className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Title</label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Název tracku"
                  className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white"
                />

                <label className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Artist</label>
                <input
                  value={artist}
                  onChange={(event) => setArtist(event.target.value)}
                  placeholder="Autor"
                  className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-white"
                />

                <div className="flex flex-wrap gap-2">
                  {Object.entries(ASPECTS).map(([key, value]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAspect(key as Aspect)}
                      className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                        aspect === key
                          ? 'bg-[var(--mpc-accent)] text-black'
                          : 'border border-white/10 text-[var(--mpc-muted)] hover:text-white'
                      }`}
                    >
                      {value.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={startRecording}
                    disabled={recording || !audioFile}
                    className="rounded-full bg-[var(--mpc-accent)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black disabled:opacity-60"
                  >
                    {recording ? 'Nahrávám…' : 'Spustit export'}
                  </button>
                  {recording && (
                    <button
                      onClick={stopRecording}
                      className="rounded-full border border-white/20 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                    >
                      Zastavit
                    </button>
                  )}
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
              </div>

              {videoUrl && (
                <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Výstup</p>
                  <video src={videoUrl} controls className="mt-3 w-full rounded-xl" />
                  <a
                    href={videoUrl}
                    download={`preview-${Date.now()}.webm`}
                    className="mt-3 inline-flex items-center rounded-full border border-[var(--mpc-accent)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--mpc-accent)]"
                  >
                    Stáhnout WebM
                  </a>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Náhled</p>
              <div className="mt-4 flex items-center justify-center rounded-xl bg-black/60 p-4">
                <canvas ref={canvasRef} width={width} height={height} className="w-full max-w-sm rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
