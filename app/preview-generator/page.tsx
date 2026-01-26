'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MainNav } from '@/components/main-nav';
import { createClient } from '@/lib/supabase/client';

type Aspect = 'square' | 'vertical';

const ASPECTS: Record<Aspect, { label: string; width: number; height: number }> = {
  square: { label: '1:1 (IG)', width: 1080, height: 1080 },
  vertical: { label: '9:16 (TikTok/Stories)', width: 1080, height: 1920 },
};

type BeatLibraryItem = {
  id: string;
  title: string | null;
  artist: string | null;
  audio_url: string | null;
  cover_url: string | null;
};

type ProjectTrack = {
  name?: string | null;
  url?: string | null;
  path?: string | null;
};

type ProjectLibraryItem = {
  id: string;
  title: string | null;
  cover_url: string | null;
  tracks_json?: ProjectTrack[] | null;
};

const resolveProjectCoverUrl = (cover: string | null) => {
  if (!cover) return null;
  if (cover.startsWith('http')) return cover;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/projects/${cover}`;
};

const resolveProjectTrackUrl = (track: ProjectTrack) => {
  if (track.url && track.url.startsWith('http')) return track.url;
  if (track.path) {
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/projects/${track.path}`;
  }
  return '';
};

export default function PreviewGeneratorPage() {
  const supabase = useMemo(() => createClient(), []);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const destinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const coverImgRef = useRef<HTMLImageElement | null>(null);

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [aspect, setAspect] = useState<Aspect>('vertical');
  const [recording, setRecording] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');
  const [beatOptions, setBeatOptions] = useState<BeatLibraryItem[]>([]);
  const [projectOptions, setProjectOptions] = useState<ProjectLibraryItem[]>([]);
  const [selectedBeatId, setSelectedBeatId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [importedAudioUrl, setImportedAudioUrl] = useState<string | null>(null);
  const [importedCoverUrl, setImportedCoverUrl] = useState<string | null>(null);
  const [importedLabel, setImportedLabel] = useState<string | null>(null);

  const coverUrl = useMemo(() => {
    if (coverFile) return URL.createObjectURL(coverFile);
    return importedCoverUrl;
  }, [coverFile, importedCoverUrl]);
  const audioUrl = useMemo(() => {
    if (audioFile) return URL.createObjectURL(audioFile);
    return importedAudioUrl;
  }, [audioFile, importedAudioUrl]);

  useEffect(() => {
    return () => {
      if (coverUrl && coverUrl.startsWith('blob:')) URL.revokeObjectURL(coverUrl);
      if (audioUrl && audioUrl.startsWith('blob:')) URL.revokeObjectURL(audioUrl);
      if (videoUrl && videoUrl.startsWith('blob:')) URL.revokeObjectURL(videoUrl);
    };
  }, [coverUrl, audioUrl, videoUrl]);

  useEffect(() => {
    const loadLibrary = async () => {
      setLibraryLoading(true);
      setLibraryError(null);
      try {
        const {
          data: { user },
          error: userErr,
        } = await supabase.auth.getUser();
        if (userErr || !user) {
          setLibraryLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .maybeSingle();
        if (profile?.display_name) {
          setProfileName(profile.display_name);
        }

        const { data: beats, error: beatsErr } = await supabase
          .from('beats')
          .select('id, title, artist, audio_url, cover_url')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (beatsErr) throw beatsErr;
        setBeatOptions((beats as BeatLibraryItem[]) ?? []);

        const { data: projects, error: projectsErr } = await supabase
          .from('projects')
          .select('id, title, cover_url, tracks_json')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (projectsErr) throw projectsErr;
        setProjectOptions((projects as ProjectLibraryItem[]) ?? []);
      } catch (err) {
        console.error('Preview generator library load error:', err);
        setLibraryError('Nepodařilo se načíst beaty/projekty z profilu.');
      } finally {
        setLibraryLoading(false);
      }
    };

    void loadLibrary();
  }, [supabase]);

  const applyBeatImport = (beat: BeatLibraryItem) => {
    if (!beat.audio_url) {
      setLibraryError('Vybraný beat nemá audio.');
      return;
    }
    setLibraryError(null);
    setImportedAudioUrl(beat.audio_url);
    setImportedCoverUrl(beat.cover_url || null);
    setImportedLabel(`Beat: ${beat.title || 'Bez názvu'}`);
    setTitle(beat.title || '');
    setArtist(beat.artist || profileName || '');
    setAudioFile(null);
    setCoverFile(null);
  };

  const applyProjectImport = (project: ProjectLibraryItem) => {
    const tracks = Array.isArray(project.tracks_json) ? project.tracks_json : [];
    const firstTrack = tracks.find((track) => resolveProjectTrackUrl(track));
    const audio = firstTrack ? resolveProjectTrackUrl(firstTrack) : '';
    if (!audio) {
      setLibraryError('Vybraný projekt nemá audio stopu.');
      return;
    }
    setLibraryError(null);
    setImportedAudioUrl(audio);
    setImportedCoverUrl(resolveProjectCoverUrl(project.cover_url));
    setImportedLabel(`Projekt: ${project.title || 'Bez názvu'}`);
    setTitle(project.title || '');
    setArtist(profileName || '');
    setAudioFile(null);
    setCoverFile(null);
  };

  const clearImport = () => {
    setSelectedBeatId('');
    setSelectedProjectId('');
    setImportedAudioUrl(null);
    setImportedCoverUrl(null);
    setImportedLabel(null);
  };

  const setupAudioGraph = async () => {
    if (!audioRef.current) return null;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }

    if (sourceRef.current && destinationRef.current) {
      return destinationRef.current.stream;
    }

    const audioCtx = audioCtxRef.current;
    try {
      const source = audioCtx.createMediaElementSource(audioRef.current);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      const destination = audioCtx.createMediaStreamDestination();

      source.connect(analyser);
      analyser.connect(audioCtx.destination);
      source.connect(destination);

      sourceRef.current = source;
      destinationRef.current = destination;
      analyserRef.current = analyser;
      return destination.stream;
    } catch (err) {
      console.warn('Preview generator audio graph failed:', err);
      return null;
    }
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
    if (!audioUrl) {
      setError('Nahraj audio soubor.');
      return;
    }
    if (!canvasRef.current) return;
    setError(null);
    setStatus('Připravuji export…');
    setPreparing(true);
    if (typeof MediaRecorder === 'undefined' || !canvasRef.current.captureStream) {
      setError('Prohlížeč nepodporuje export videa (MediaRecorder). Zkus Chrome/Edge.');
      setPreparing(false);
      setStatus(null);
      return;
    }

    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
      setVideoUrl(null);
    }

    try {
      const audioEl = audioRef.current ?? new Audio();
      audioEl.crossOrigin = 'anonymous';
      audioEl.preload = 'auto';
      audioEl.src = audioUrl;
      audioEl.load();
      audioEl.currentTime = 0;
      audioRef.current = audioEl;

      const coverImg = coverImgRef.current ?? new Image();
      coverImg.crossOrigin = 'anonymous';
      coverImg.src = coverUrl || '';
      coverImgRef.current = coverImg;

      await new Promise<void>((resolve) => {
        if (!coverUrl) return resolve();
        coverImg.onload = () => resolve();
        coverImg.onerror = () => resolve();
      });
      await new Promise<void>((resolve, reject) => {
        if (audioEl.readyState >= 1) return resolve();
        const timer = window.setTimeout(() => {
          cleanup();
          reject(new Error('Audio metadata timeout'));
        }, 10000);
        const cleanup = () => {
          window.clearTimeout(timer);
          audioEl.onloadedmetadata = null;
          audioEl.onerror = null;
        };
        audioEl.onloadedmetadata = () => {
          cleanup();
          resolve();
        };
        audioEl.onerror = () => {
          cleanup();
          reject(new Error('Audio load error'));
        };
      });

      const stream = canvasRef.current.captureStream(30);
      let audioStream: MediaStream | null = await setupAudioGraph();

      if (!audioStream) {
        const capture = (audioEl as HTMLAudioElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream });
        audioStream = capture.captureStream?.() ?? capture.mozCaptureStream?.() ?? null;
      }

      if (audioStream) {
        audioStream.getAudioTracks().forEach((track) => stream.addTrack(track));
      } else {
        throw new Error('Audio stream unavailable');
      }

      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/mp4',
      ];
      const mimeType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || '';
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        if (stopTimerRef.current) {
          window.clearTimeout(stopTimerRef.current);
          stopTimerRef.current = null;
        }
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoUrl(url);
        setRecording(false);
        setPreparing(false);
        setStatus(null);
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };

      setRecording(true);
      setPreparing(false);
      setStatus('Nahrávám…');
      if (audioCtxRef.current?.state === 'suspended') {
        await audioCtxRef.current.resume();
      }

      audioEl.onended = () => {
        recorder.stop();
      };

      recorder.start();
      drawFrame();
      try {
        await audioEl.play();
      } catch (err) {
        throw new Error('Audio playback blocked');
      }

      const durationMs =
        Number.isFinite(audioEl.duration) && audioEl.duration > 0 ? audioEl.duration * 1000 : 0;
      const maxDuration = durationMs ? Math.min(durationMs, 15000) : 15000;
      stopTimerRef.current = window.setTimeout(() => {
        if (recorderRef.current?.state === 'recording') {
          recorderRef.current.stop();
        }
      }, maxDuration);
    } catch (err) {
      console.error('Preview generator error:', err);
      const message =
        err instanceof Error && err.message === 'Audio stream unavailable'
          ? 'Nepodařilo se připojit audio stopu. Zkus prosím stáhnout MP3 a nahrát ji ručně.'
          : err instanceof Error && err.message === 'Audio playback blocked'
            ? 'Prohlížeč zablokoval přehrávání audia. Zkus znovu kliknout nebo použít Chrome.'
            : 'Nepodařilo se spustit export. Zkus jiný prohlížeč nebo soubor.';
      setError(message);
      setRecording(false);
      setPreparing(false);
      setStatus(null);
    }
  };

  const stopRecording = () => {
    if (stopTimerRef.current) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    recorderRef.current?.stop();
    setRecording(false);
    setPreparing(false);
    setStatus(null);
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
                  onChange={(event) => {
                    setAudioFile(event.target.files?.[0] ?? null);
                    setImportedAudioUrl(null);
                    setImportedLabel(null);
                    setSelectedBeatId('');
                    setSelectedProjectId('');
                  }}
                  className="text-sm text-[var(--mpc-muted)]"
                />

                <label className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Cover</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    setCoverFile(event.target.files?.[0] ?? null);
                    setImportedCoverUrl(null);
                    setImportedLabel(null);
                    setSelectedBeatId('');
                    setSelectedProjectId('');
                  }}
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

                <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Import z profilu</p>
                  {libraryLoading && <p className="mt-2 text-xs text-[var(--mpc-muted)]">Načítám knihovnu…</p>}
                  {libraryError && <p className="mt-2 text-xs text-red-400">{libraryError}</p>}
                  {!libraryLoading && (
                    <div className="mt-3 grid gap-3">
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.18em] text-[var(--mpc-muted)]">Beaty</label>
                        <select
                          value={selectedBeatId}
                          onChange={(event) => {
                            const value = event.target.value;
                            setSelectedBeatId(value);
                            setSelectedProjectId('');
                            const beat = beatOptions.find((item) => item.id === value);
                            if (beat) {
                              applyBeatImport(beat);
                            }
                          }}
                          className="mt-2 w-full rounded-full border border-white/10 bg-black/30 px-3 py-2 text-xs text-white"
                        >
                          <option value="">Vybrat beat…</option>
                          {beatOptions.map((beat) => (
                            <option key={beat.id} value={beat.id}>
                              {beat.title || 'Bez názvu'}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase tracking-[0.18em] text-[var(--mpc-muted)]">Projekty</label>
                        <select
                          value={selectedProjectId}
                          onChange={(event) => {
                            const value = event.target.value;
                            setSelectedProjectId(value);
                            setSelectedBeatId('');
                            const project = projectOptions.find((item) => item.id === value);
                            if (project) {
                              applyProjectImport(project);
                            }
                          }}
                          className="mt-2 w-full rounded-full border border-white/10 bg-black/30 px-3 py-2 text-xs text-white"
                        >
                          <option value="">Vybrat projekt…</option>
                          {projectOptions.map((project) => {
                            const tracks = Array.isArray(project.tracks_json) ? project.tracks_json : [];
                            const hasAudio = tracks.some((track) => Boolean(resolveProjectTrackUrl(track)));
                            return (
                              <option key={project.id} value={project.id} disabled={!hasAudio}>
                                {project.title || 'Bez názvu'}
                                {hasAudio ? '' : ' (bez audio)'}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      {importedLabel && (
                        <div className="rounded-full border border-[var(--mpc-accent)]/40 bg-[var(--mpc-accent)]/10 px-3 py-2 text-[11px] text-[var(--mpc-accent)]">
                          {importedLabel}
                        </div>
                      )}
                      {beatOptions.length === 0 && projectOptions.length === 0 && (
                        <p className="text-xs text-[var(--mpc-muted)]">
                          Zatím nemáš žádné beaty nebo projekty k importu.
                        </p>
                      )}
                      {(selectedBeatId || selectedProjectId || importedAudioUrl || importedCoverUrl) && (
                        <button
                          type="button"
                          onClick={clearImport}
                          className="rounded-full border border-white/15 px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--mpc-muted)] hover:border-[var(--mpc-accent)] hover:text-[var(--mpc-accent)]"
                        >
                          Vyčistit import
                        </button>
                      )}
                    </div>
                  )}
                </div>

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
                    className="rounded-full bg-[var(--mpc-accent)] px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-black"
                  >
                    {preparing ? 'Připravuji…' : recording ? 'Nahrávám…' : 'Spustit export'}
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
                {status && <p className="text-sm text-[var(--mpc-muted)]">{status}</p>}
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
        <audio ref={audioRef} className="hidden" preload="auto" />
      </section>
    </main>
  );
}
