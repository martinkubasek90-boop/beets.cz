'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MainNav } from '@/components/main-nav';

const STEPS = 32;
const DRUM_ROWS = 10;
const SAMPLE_ROWS = 8;
const MAX_SAMPLE_SECONDS = 5 * 60;

type DrumRow = {
  name: string;
  fileName: string | null;
  fileBlob: Blob | null;
  buffer: AudioBuffer | null;
};

type Slice = {
  id: string;
  start: number;
  end: number;
  label: string;
};

type SavedProject = {
  id: string;
  name: string;
  bpm: number;
  createdAt: string;
  drumSteps: boolean[][];
  samplerSteps: boolean[][];
  slices: Slice[];
  padAssignments: (string | null)[];
  drumKeys: (string | null)[];
  samplerKey: string | null;
};

const createStepGrid = (rows: number) =>
  Array.from({ length: rows }, () => Array.from({ length: STEPS }, () => false));

const defaultDrumNames = [
  'Kick',
  'Snare',
  'Clap',
  'HiHat',
  'O.Hat',
  'Tom',
  'Rim',
  'Perc',
  'FX',
  'Shaker',
];

const drumColors = [
  '#f97316',
  '#ef4444',
  '#f59e0b',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#eab308',
  '#10b981',
];

const samplerColors = [
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f97316',
  '#f59e0b',
  '#14b8a6',
];

const DB_NAME = 'beets-beatmaker';
const DB_VERSION = 1;
const STORE_AUDIO = 'audio';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_AUDIO)) {
        db.createObjectStore(STORE_AUDIO);
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

async function putBlob(key: string, blob: Blob) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_AUDIO, 'readwrite');
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();
    tx.objectStore(STORE_AUDIO).put(blob, key);
  });
}

async function getBlob(key: string) {
  const db = await openDb();
  return new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE_AUDIO, 'readonly');
    tx.onerror = () => reject(tx.error);
    const request = tx.objectStore(STORE_AUDIO).get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve((request.result as Blob) || null);
  });
}

function getStoredProjects(): SavedProject[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('beatmaker_projects');
    return raw ? (JSON.parse(raw) as SavedProject[]) : [];
  } catch {
    return [];
  }
}

function saveStoredProjects(projects: SavedProject[]) {
  localStorage.setItem('beatmaker_projects', JSON.stringify(projects));
}

export default function BeatMakerPage() {
  const audioRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);
  const playheadRef = useRef(0);

  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [drumSteps, setDrumSteps] = useState(() => createStepGrid(DRUM_ROWS));
  const [samplerSteps, setSamplerSteps] = useState(() => createStepGrid(SAMPLE_ROWS));
  const [drumRows, setDrumRows] = useState<DrumRow[]>(
    defaultDrumNames.map((name) => ({
      name,
      fileName: null,
      fileBlob: null,
      buffer: null,
    }))
  );

  const [sampleFileName, setSampleFileName] = useState<string | null>(null);
  const [sampleFileBlob, setSampleFileBlob] = useState<Blob | null>(null);
  const [sampleBuffer, setSampleBuffer] = useState<AudioBuffer | null>(null);
  const [sampleDuration, setSampleDuration] = useState(0);
  const [sliceStart, setSliceStart] = useState(0);
  const [sliceEnd, setSliceEnd] = useState(0);
  const [slices, setSlices] = useState<Slice[]>([]);
  const [padAssignments, setPadAssignments] = useState<(string | null)[]>(
    Array.from({ length: SAMPLE_ROWS }, () => null)
  );
  const [selectedPad, setSelectedPad] = useState<number | null>(null);

  const [projectName, setProjectName] = useState('');
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const drumStepsRef = useRef(drumSteps);
  const samplerStepsRef = useRef(samplerSteps);
  const drumRowsRef = useRef(drumRows);
  const slicesRef = useRef(slices);
  const padAssignmentsRef = useRef(padAssignments);
  const sampleBufferRef = useRef(sampleBuffer);

  const waveformRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    setSavedProjects(getStoredProjects());
  }, []);

  useEffect(() => {
    drumStepsRef.current = drumSteps;
  }, [drumSteps]);
  useEffect(() => {
    samplerStepsRef.current = samplerSteps;
  }, [samplerSteps]);
  useEffect(() => {
    drumRowsRef.current = drumRows;
  }, [drumRows]);
  useEffect(() => {
    slicesRef.current = slices;
  }, [slices]);
  useEffect(() => {
    padAssignmentsRef.current = padAssignments;
  }, [padAssignments]);
  useEffect(() => {
    sampleBufferRef.current = sampleBuffer;
  }, [sampleBuffer]);

  useEffect(() => {
    const canvas = waveformRef.current;
    if (!canvas || !sampleBuffer) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#101010';
    ctx.fillRect(0, 0, width, height);

    const data = sampleBuffer.getChannelData(0);
    const step = Math.max(1, Math.floor(data.length / width));
    ctx.strokeStyle = '#f27a2f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < width; x += 1) {
      let min = 1;
      let max = -1;
      const start = x * step;
      const end = Math.min(start + step, data.length);
      for (let i = start; i < end; i += 1) {
        const value = data[i];
        if (value < min) min = value;
        if (value > max) max = value;
      }
      const y1 = (1 + min) * 0.5 * height;
      const y2 = (1 + max) * 0.5 * height;
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
    }
    ctx.stroke();
  }, [sampleBuffer]);

  const ensureAudioContext = () => {
    if (!audioRef.current) {
      audioRef.current = new AudioContext();
    }
    if (audioRef.current.state === 'suspended') {
      void audioRef.current.resume();
    }
    return audioRef.current;
  };

  const playBuffer = (buffer: AudioBuffer, start?: number, duration?: number) => {
    const ctx = ensureAudioContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    if (typeof start === 'number' && typeof duration === 'number') {
      source.start(0, start, duration);
    } else {
      source.start(0);
    }
  };

  const scheduleStep = (index: number) => {
    const drumGrid = drumStepsRef.current;
    const samplerGrid = samplerStepsRef.current;
    const rows = drumRowsRef.current;
    const slicesLocal = slicesRef.current;
    const assignments = padAssignmentsRef.current;
    const samplerBuffer = sampleBufferRef.current;

    rows.forEach((row, rowIndex) => {
      if (drumGrid[rowIndex]?.[index] && row.buffer) {
        playBuffer(row.buffer);
      }
    });

    if (samplerBuffer) {
      assignments.forEach((sliceId, rowIndex) => {
        if (!sliceId) return;
        if (!samplerGrid[rowIndex]?.[index]) return;
        const slice = slicesLocal.find((item) => item.id === sliceId);
        if (!slice) return;
        const duration = Math.max(0.01, slice.end - slice.start);
        playBuffer(samplerBuffer, slice.start, duration);
      });
    }
  };

  const startPlayback = () => {
    ensureAudioContext();
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
    }
    playheadRef.current = 0;
    setPlayhead(0);
    setIsPlaying(true);
    const stepDuration = (60 / bpm) / 4;
    intervalRef.current = window.setInterval(() => {
      const current = playheadRef.current;
      scheduleStep(current);
      const next = (current + 1) % STEPS;
      playheadRef.current = next;
      setPlayhead(next);
    }, stepDuration * 1000);
  };

  const stopPlayback = () => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPlaying(false);
    setPlayhead(0);
  };

  useEffect(() => {
    if (!isPlaying) return;
    startPlayback();
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm]);

  const toggleStep = (section: 'drums' | 'sampler', row: number, col: number) => {
    if (section === 'drums') {
      setDrumSteps((prev) =>
        prev.map((r, rIndex) =>
          rIndex === row ? r.map((value, cIndex) => (cIndex === col ? !value : value)) : r
        )
      );
    } else {
      setSamplerSteps((prev) =>
        prev.map((r, rIndex) =>
          rIndex === row ? r.map((value, cIndex) => (cIndex === col ? !value : value)) : r
        )
      );
    }
  };

  const handleDrumUpload = async (rowIndex: number, file: File) => {
    const ctx = ensureAudioContext();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    setDrumRows((prev) =>
      prev.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              fileName: file.name,
              fileBlob: file,
              buffer,
            }
          : row
      )
    );
  };

  const handleSampleUpload = async (file: File) => {
    const ctx = ensureAudioContext();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    if (buffer.duration > MAX_SAMPLE_SECONDS) {
      alert('Maximální délka samplu je 5 minut.');
      return;
    }
    setSampleFileName(file.name);
    setSampleFileBlob(file);
    setSampleBuffer(buffer);
    setSampleDuration(buffer.duration);
    setSliceStart(0);
    setSliceEnd(Math.min(1, buffer.duration));
    setSlices([]);
    setPadAssignments(Array.from({ length: SAMPLE_ROWS }, () => null));
  };

  const addSlice = () => {
    if (!sampleBuffer) return;
    const start = Math.max(0, Math.min(sliceStart, sliceEnd));
    const end = Math.min(sampleDuration, Math.max(sliceStart, sliceEnd));
    if (end - start < 0.01) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const label = `Slice ${slices.length + 1}`;
    setSlices((prev) => [...prev, { id, start, end, label }]);
  };

  const assignSliceToPad = (sliceId: string, padIndex?: number) => {
    const target = typeof padIndex === 'number' ? padIndex : selectedPad;
    if (typeof target !== 'number') return;
    setPadAssignments((prev) => prev.map((item, index) => (index === target ? sliceId : item)));
  };

  const autoAssignSlices = () => {
    setPadAssignments((prev) =>
      prev.map((item, index) => slices[index]?.id ?? item ?? null)
    );
  };

  const playPad = (padIndex: number) => {
    const buffer = sampleBufferRef.current;
    const assignments = padAssignmentsRef.current;
    const sliceId = assignments[padIndex];
    if (!buffer || !sliceId) return;
    const slice = slicesRef.current.find((item) => item.id === sliceId);
    if (!slice) return;
    const duration = Math.max(0.01, slice.end - slice.start);
    playBuffer(buffer, slice.start, duration);
  };

  const handleSave = async () => {
    if (!projectName.trim()) {
      setSaveStatus('Zadej název projektu.');
      return;
    }
    const id = `${Date.now()}`;
    const drumKeys = drumRows.map((row, index) => (row.fileBlob ? `${id}:drum:${index}` : null));
    const samplerKey = sampleFileBlob ? `${id}:sampler` : null;

    const savePromises: Promise<void>[] = [];
    drumRows.forEach((row, index) => {
      if (row.fileBlob && drumKeys[index]) {
        savePromises.push(putBlob(drumKeys[index] as string, row.fileBlob));
      }
    });
    if (sampleFileBlob && samplerKey) {
      savePromises.push(putBlob(samplerKey, sampleFileBlob));
    }

    await Promise.all(savePromises);

    const record: SavedProject = {
      id,
      name: projectName.trim(),
      bpm,
      createdAt: new Date().toISOString(),
      drumSteps,
      samplerSteps,
      slices,
      padAssignments,
      drumKeys,
      samplerKey,
    };

    const updated = [record, ...getStoredProjects()];
    saveStoredProjects(updated);
    setSavedProjects(updated);
    setSelectedProject(id);
    setSaveStatus('Uloženo.');
  };

  const handleLoad = async () => {
    const project = savedProjects.find((item) => item.id === selectedProject);
    if (!project) return;
    setBpm(project.bpm);
    const normalizedDrumSteps = Array.from({ length: DRUM_ROWS }, (_, rowIndex) => {
      const row = project.drumSteps?.[rowIndex] ?? [];
      return Array.from({ length: STEPS }, (_, colIndex) => row[colIndex] ?? false);
    });
    setDrumSteps(normalizedDrumSteps);
    const normalizedSamplerSteps = Array.from({ length: SAMPLE_ROWS }, (_, rowIndex) => {
      const row = project.samplerSteps?.[rowIndex] ?? [];
      return Array.from({ length: STEPS }, (_, colIndex) => row[colIndex] ?? false);
    });
    setSamplerSteps(normalizedSamplerSteps);
    setSlices(project.slices ?? []);
    const normalizedAssignments = Array.from(
      { length: SAMPLE_ROWS },
      (_, index) => project.padAssignments?.[index] ?? null
    );
    setPadAssignments(normalizedAssignments);
    setSampleFileName(null);
    setSampleFileBlob(null);
    setSampleBuffer(null);
    setSampleDuration(0);

    const ctx = ensureAudioContext();
    const drumKeyList = Array.from({ length: DRUM_ROWS }, (_, index) => project.drumKeys?.[index] ?? null);
    const rows = await Promise.all(
      drumKeyList.map(async (key, index) => {
        if (!key) {
          return {
            name: defaultDrumNames[index],
            fileName: null,
            fileBlob: null,
            buffer: null,
          } satisfies DrumRow;
        }
        const blob = await getBlob(key);
        if (!blob) {
          return {
            name: defaultDrumNames[index],
            fileName: null,
            fileBlob: null,
            buffer: null,
          } satisfies DrumRow;
        }
        const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
        return {
          name: defaultDrumNames[index],
          fileName: blob instanceof File ? blob.name : defaultDrumNames[index],
          fileBlob: blob,
          buffer,
        } satisfies DrumRow;
      })
    );
    setDrumRows(rows);

    if (project.samplerKey) {
      const blob = await getBlob(project.samplerKey);
      if (blob) {
        const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
        setSampleFileBlob(blob);
        setSampleFileName(blob instanceof File ? blob.name : 'Sampler');
        setSampleBuffer(buffer);
        setSampleDuration(buffer.duration);
        setSliceStart(0);
        setSliceEnd(Math.min(1, buffer.duration));
      }
    }
  };

  const resetProject = () => {
    setDrumSteps(createStepGrid(DRUM_ROWS));
    setSamplerSteps(createStepGrid(SAMPLE_ROWS));
    setDrumRows(
      defaultDrumNames.map((name) => ({
        name,
        fileName: null,
        fileBlob: null,
        buffer: null,
      }))
    );
    setSampleFileName(null);
    setSampleFileBlob(null);
    setSampleBuffer(null);
    setSampleDuration(0);
    setSlices([]);
    setPadAssignments(Array.from({ length: SAMPLE_ROWS }, () => null));
    setSliceStart(0);
    setSliceEnd(0);
    setSaveStatus(null);
  };

  const selectionStyle = useMemo(() => {
    if (!sampleDuration) return { left: '0%', width: '0%' };
    const left = (Math.min(sliceStart, sliceEnd) / sampleDuration) * 100;
    const width = (Math.abs(sliceEnd - sliceStart) / sampleDuration) * 100;
    return { left: `${left}%`, width: `${width}%` };
  }, [sampleDuration, sliceStart, sliceEnd]);

  return (
    <div className="min-h-screen bg-black text-white">
      <MainNav />
      <main className="mx-auto w-full max-w-7xl px-4 pb-16 pt-10">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.35em] text-[var(--mpc-muted)]">Beats.cz Tools</p>
              <h1 className="text-3xl font-semibold tracking-tight">Beat Maker</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/60">
                Sekvencer + sampler v prohlížeči. Část A = bicí (10 zvuků), část B = sampler (8 padů).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetProject}
                className="rounded-full border border-white/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70 hover:text-white"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <div className="flex flex-wrap items-center gap-4">
                <label className="text-[11px] uppercase tracking-[0.2em] text-white/50">BPM</label>
                <input
                  type="number"
                  min={60}
                  max={200}
                  value={bpm}
                  onChange={(event) => setBpm(Number(event.target.value))}
                  className="w-20 rounded-full border border-white/20 bg-black px-3 py-1 text-sm text-white"
                />
                <span className="text-[11px] uppercase tracking-[0.2em] text-white/50">
                  Step: {playhead + 1}/{STEPS}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <input
                    type="text"
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    placeholder="Název projektu"
                    className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/80 placeholder:text-white/30"
                  />
                  <button
                    type="button"
                    onClick={handleSave}
                    className="rounded-full border border-[var(--mpc-accent)] bg-[var(--mpc-accent)]/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white"
                  >
                    Uložit
                  </button>
                  <select
                    value={selectedProject}
                    onChange={(event) => setSelectedProject(event.target.value)}
                    className="rounded-full border border-white/10 bg-black/40 px-3 py-2 text-xs uppercase tracking-[0.2em] text-white/70"
                  >
                    <option value="">Načíst projekt</option>
                    {savedProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleLoad}
                    className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70"
                  >
                    Načíst
                  </button>
                </div>
              </div>
              {saveStatus && (
                <p className="mt-3 text-xs uppercase tracking-[0.2em] text-emerald-300">{saveStatus}</p>
              )}
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Legenda</p>
              <p className="mt-2 text-sm text-white/60">
                Klikni do gridu pro aktivaci kroku. Nahraj vlastní zvuky, nastav BPM a spusť loop.
              </p>
              <p className="mt-2 text-xs text-white/40">
                Projekty se ukládají lokálně v prohlížeči. Maximální délka samplu 5 minut.
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            <div className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                    Část A · Bicí
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/40">{DRUM_ROWS} zvuků</span>
                    <button
                      type="button"
                      onClick={() => (isPlaying ? stopPlayback() : startPlayback())}
                      className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white hover:border-white/40"
                    >
                      {isPlaying ? 'Pause' : 'Play'}
                    </button>
                  </div>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <div className="grid gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex w-28 items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                        <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Kroky</span>
                      </div>
                      <div className="rounded-full border border-white/10 px-3 py-1 text-[9px] uppercase tracking-[0.2em] text-white/30">
                        —
                      </div>
                      <div
                        className="grid gap-1 text-[10px] text-white/30"
                        style={{ gridTemplateColumns: `repeat(${STEPS}, minmax(0, 1fr))` }}
                      >
                        {Array.from({ length: STEPS }, (_, colIndex) => (
                          <div key={colIndex} className="text-center">
                            {colIndex + 1}
                          </div>
                        ))}
                      </div>
                    </div>
                    {drumRows.map((row, rowIndex) => (
                      <div key={row.name} className="flex items-center gap-3">
                        <div className="flex w-28 items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: drumColors[rowIndex % drumColors.length] }}
                          />
                          <label className="text-xs uppercase tracking-[0.18em] text-white/60">
                            {row.name}
                          </label>
                        </div>
                        <input
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          id={`drum-upload-${rowIndex}`}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) void handleDrumUpload(rowIndex, file);
                          }}
                        />
                        <label
                          htmlFor={`drum-upload-${rowIndex}`}
                          className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/60 hover:text-white"
                        >
                          {row.fileName ? 'Nahráno' : 'Nahrát'}
                        </label>
                        <div
                          className="grid gap-1"
                          style={{ gridTemplateColumns: `repeat(${STEPS}, minmax(0, 1fr))` }}
                        >
                          {Array.from({ length: STEPS }, (_, colIndex) => (
                            <button
                              key={colIndex}
                              type="button"
                              onClick={() => toggleStep('drums', rowIndex, colIndex)}
                              className={`h-6 w-6 rounded-md border border-white/5 transition ${
                                drumSteps[rowIndex]?.[colIndex]
                                  ? ''
                                  : 'bg-white/5'
                              } ${playhead === colIndex ? 'ring-2 ring-white/40' : ''}`}
                              style={
                                drumSteps[rowIndex]?.[colIndex]
                                  ? { backgroundColor: drumColors[rowIndex % drumColors.length] }
                                  : undefined
                              }
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                  Sampler · Waveform
                </h2>
                <div className="mt-3 flex items-center gap-3">
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    id="sampler-upload"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleSampleUpload(file);
                    }}
                  />
                  <label
                    htmlFor="sampler-upload"
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-white/70"
                  >
                    {sampleFileName ? 'Vyměnit sample' : 'Nahrát sample'}
                  </label>
                  {sampleFileName && (
                    <span className="text-xs text-white/50">{sampleFileName}</span>
                  )}
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-black/60 p-3">
                  <div className="relative">
                    <canvas
                      ref={waveformRef}
                      width={1200}
                      height={180}
                      className="h-40 w-full rounded-lg"
                    />
                    {sampleBuffer && (
                      <div
                        className="pointer-events-none absolute inset-y-0 rounded-md border border-emerald-400/60 bg-emerald-400/20"
                        style={selectionStyle}
                      />
                    )}
                  </div>
                  <div className="mt-3 grid gap-2">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                      Start (s)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={sampleDuration || 1}
                      step={0.01}
                      value={sliceStart}
                      onChange={(event) => setSliceStart(Number(event.target.value))}
                    />
                    <label className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                      End (s)
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={sampleDuration || 1}
                      step={0.01}
                      value={sliceEnd}
                      onChange={(event) => setSliceEnd(Number(event.target.value))}
                    />
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={addSlice}
                        className="rounded-full border border-[var(--mpc-accent)] bg-[var(--mpc-accent)]/20 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white"
                      >
                        Přidat slice
                      </button>
                      <button
                        type="button"
                        onClick={() => setSlices([])}
                        className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-white/60"
                      >
                        Vymazat
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Slices</p>
                    <button
                      type="button"
                      onClick={autoAssignSlices}
                      className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-white/60"
                    >
                      Auto přiřadit
                    </button>
                  </div>
                  <div className="mt-2 grid gap-2">
                    {slices.map((slice) => (
                      <button
                        key={slice.id}
                        type="button"
                        onClick={() => assignSliceToPad(slice.id)}
                        className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 hover:text-white"
                      >
                        <span>{slice.label}</span>
                        <span className="text-[11px] text-white/40">
                          {slice.start.toFixed(2)}s – {slice.end.toFixed(2)}s
                        </span>
                      </button>
                    ))}
                    {slices.length === 0 && (
                      <p className="text-xs text-white/40">Žádné slices.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                    Část B · Sampler
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/40">{SAMPLE_ROWS} padů</span>
                    <button
                      type="button"
                      onClick={() => (isPlaying ? stopPlayback() : startPlayback())}
                      className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-white hover:border-white/40"
                    >
                      {isPlaying ? 'Pause' : 'Play'}
                    </button>
                  </div>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <div className="grid gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-20 text-[10px] uppercase tracking-[0.2em] text-white/40">Kroky</div>
                      <div
                        className="grid gap-1 text-[10px] text-white/30"
                        style={{ gridTemplateColumns: `repeat(${STEPS}, minmax(0, 1fr))` }}
                      >
                        {Array.from({ length: STEPS }, (_, colIndex) => (
                          <div key={colIndex} className="text-center">
                            {colIndex + 1}
                          </div>
                        ))}
                      </div>
                    </div>
                    {Array.from({ length: SAMPLE_ROWS }, (_, rowIndex) => (
                      <div key={rowIndex} className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setSelectedPad(rowIndex)}
                          className={`w-20 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.2em] ${
                            selectedPad === rowIndex
                              ? 'border-[var(--mpc-accent)] text-white'
                              : 'border-white/20 text-white/60'
                          }`}
                        >
                          <span className="flex items-center justify-center gap-1">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: samplerColors[rowIndex % samplerColors.length] }}
                            />
                            Pad {rowIndex + 1}
                          </span>
                        </button>
                        <div
                          className="grid gap-1"
                          style={{ gridTemplateColumns: `repeat(${STEPS}, minmax(0, 1fr))` }}
                        >
                          {Array.from({ length: STEPS }, (_, colIndex) => (
                            <button
                              key={colIndex}
                              type="button"
                              onClick={() => toggleStep('sampler', rowIndex, colIndex)}
                              className={`h-6 w-6 rounded-md border border-white/5 transition ${
                                samplerSteps[rowIndex]?.[colIndex]
                                  ? ''
                                  : 'bg-white/5'
                              } ${playhead === colIndex ? 'ring-2 ring-white/40' : ''}`}
                              style={
                                samplerSteps[rowIndex]?.[colIndex]
                                  ? { backgroundColor: samplerColors[rowIndex % samplerColors.length] }
                                  : undefined
                              }
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
