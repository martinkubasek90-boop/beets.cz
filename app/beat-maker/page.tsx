'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MainNav } from '@/components/main-nav';

const STEPS = 32;
const DRUM_ROWS = 10;
const SAMPLE_ROWS = 8;
const MAX_SAMPLE_SECONDS = 5 * 60;
const STEP_SIZE = 24;
const STEP_GAP = 4;

type DrumRow = {
  name: string;
  fileName: string | null;
  fileBlob: Blob | null;
  buffer: AudioBuffer | null;
  swing: number;
  volume: number;
  pitch: number;
  eq: { low: number; mid: number; high: number };
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
  sampleBpm?: number;
  createdAt: string;
  drumSteps: boolean[][];
  samplerSteps: boolean[][];
  slices: Slice[];
  padAssignments: (string | null)[];
  drumKeys: (string | null)[];
  samplerKey: string | null;
  drumSwing?: number[];
  drumVolumes?: number[];
  drumPitch?: number[];
  samplerVolumes?: number[];
  samplerPitch?: number[];
  drumEq?: { low: number; mid: number; high: number }[];
  samplerEq?: { low: number; mid: number; high: number }[];
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
  const slicePreviewRef = useRef<AudioBufferSourceNode | null>(null);
  const samplerPadRefs = useRef<(AudioBufferSourceNode | null)[]>(
    Array.from({ length: SAMPLE_ROWS }, () => null)
  );

  const [bpm, setBpm] = useState(120);
  const [sampleBpm, setSampleBpm] = useState(120);
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
      swing: 0,
      volume: 0.9,
      pitch: 0,
      eq: { low: 0, mid: 0, high: 0 },
    }))
  );

  const [sampleFileName, setSampleFileName] = useState<string | null>(null);
  const [sampleFileBlob, setSampleFileBlob] = useState<Blob | null>(null);
  const [sampleBuffer, setSampleBuffer] = useState<AudioBuffer | null>(null);
  const [sampleDuration, setSampleDuration] = useState(0);
  const [sliceStart, setSliceStart] = useState(0);
  const [sliceEnd, setSliceEnd] = useState(0);
  const [nextSlicePoint, setNextSlicePoint] = useState<'start' | 'end'>('start');
  const [slices, setSlices] = useState<Slice[]>([]);
  const [padAssignments, setPadAssignments] = useState<(string | null)[]>(
    Array.from({ length: SAMPLE_ROWS }, () => null)
  );
  const [selectedPad, setSelectedPad] = useState<number | null>(null);
  const [waveZoom, setWaveZoom] = useState(1);
  const [samplerVolumes, setSamplerVolumes] = useState<number[]>(
    Array.from({ length: SAMPLE_ROWS }, () => 0.9)
  );
  const [samplerPitch, setSamplerPitch] = useState<number[]>(
    Array.from({ length: SAMPLE_ROWS }, () => 0)
  );
  const [samplerEq, setSamplerEq] = useState(
    Array.from({ length: SAMPLE_ROWS }, () => ({ low: 0, mid: 0, high: 0 }))
  );

  const [projectName, setProjectName] = useState('');
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const drumStepsRef = useRef(drumSteps);
  const samplerStepsRef = useRef(samplerSteps);
  const drumRowsRef = useRef(drumRows);
  const samplerVolumesRef = useRef(samplerVolumes);
  const samplerPitchRef = useRef(samplerPitch);
  const samplerEqRef = useRef(samplerEq);
  const slicesRef = useRef(slices);
  const padAssignmentsRef = useRef(padAssignments);
  const sampleBufferRef = useRef(sampleBuffer);

  const waveformRef = useRef<HTMLCanvasElement | null>(null);
  const waveformWrapRef = useRef<HTMLDivElement | null>(null);

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
    samplerVolumesRef.current = samplerVolumes;
  }, [samplerVolumes]);
  useEffect(() => {
    samplerPitchRef.current = samplerPitch;
  }, [samplerPitch]);
  useEffect(() => {
    samplerEqRef.current = samplerEq;
  }, [samplerEq]);
  useEffect(() => {
    slicesRef.current = slices;
  }, [slices]);
  useEffect(() => {
    padAssignmentsRef.current = padAssignments;
  }, [padAssignments]);
  useEffect(() => {
    sampleBufferRef.current = sampleBuffer;
  }, [sampleBuffer]);

  const waveWindow = useMemo(() => {
    if (!sampleDuration) return 0;
    return sampleDuration / Math.max(1, waveZoom);
  }, [sampleDuration, waveZoom]);

  const waveViewStart = useMemo(() => {
    if (!sampleDuration || !waveWindow) return 0;
    const anchor = 0;
    const rawStart = sliceStart - waveWindow * anchor;
    return Math.max(0, Math.min(sampleDuration - waveWindow, rawStart));
  }, [sampleDuration, waveWindow, sliceStart]);

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
    const viewEnd = Math.min(sampleDuration, waveViewStart + waveWindow);
    const startIndex = Math.floor(waveViewStart * sampleBuffer.sampleRate);
    const endIndex = Math.min(data.length, Math.floor(viewEnd * sampleBuffer.sampleRate));
    const span = Math.max(1, endIndex - startIndex);
    const step = Math.max(1, Math.floor(span / width));

    ctx.strokeStyle = '#f27a2f';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x < width; x += 1) {
      let min = 1;
      let max = -1;
      const start = startIndex + x * step;
      const end = Math.min(start + step, endIndex);
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
  }, [sampleBuffer, sampleDuration, waveViewStart, waveWindow]);

  const handleWaveformClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!sampleBuffer || !sampleDuration || !waveWindow) return;
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    const rawTime = waveViewStart + ratio * waveWindow;
    const time = Math.round(Math.max(0, Math.min(sampleDuration, rawTime)) * 10) / 10;
    if (nextSlicePoint === 'start') {
      setSliceStart(time);
      setNextSlicePoint('end');
    } else {
      setSliceEnd(time);
      setNextSlicePoint('start');
    }
  };

  const ensureAudioContext = () => {
    if (!audioRef.current) {
      audioRef.current = new AudioContext();
    }
    if (audioRef.current.state === 'suspended') {
      void audioRef.current.resume();
    }
    return audioRef.current;
  };

  const playBuffer = (
    buffer: AudioBuffer,
    start?: number,
    duration?: number,
    when?: number,
    stopPrevious?: boolean,
    playbackRate = 1,
    gainValue = 1,
    eqSettings: { low: number; mid: number; high: number } = { low: 0, mid: 0, high: 0 }
  ) => {
    const ctx = ensureAudioContext();
    if (stopPrevious && slicePreviewRef.current) {
      try {
        slicePreviewRef.current.stop();
      } catch {
        // ignore
      }
      slicePreviewRef.current = null;
    }
    const source = ctx.createBufferSource();
    const gainNode = ctx.createGain();
    const low = ctx.createBiquadFilter();
    const mid = ctx.createBiquadFilter();
    const high = ctx.createBiquadFilter();
    source.buffer = buffer;
    source.playbackRate.value = playbackRate;
    gainNode.gain.value = gainValue;
    low.type = 'lowshelf';
    low.frequency.value = 120;
    low.gain.value = eqSettings.low;
    mid.type = 'peaking';
    mid.frequency.value = 1000;
    mid.Q.value = 1;
    mid.gain.value = eqSettings.mid;
    high.type = 'highshelf';
    high.frequency.value = 8000;
    high.gain.value = eqSettings.high;
    source.connect(low);
    low.connect(mid);
    mid.connect(high);
    high.connect(gainNode);
    gainNode.connect(ctx.destination);
    const startAt = typeof when === 'number' ? ctx.currentTime + when : ctx.currentTime;
    if (typeof start === 'number' && typeof duration === 'number') {
      source.start(startAt, start, duration);
    } else {
      source.start(startAt);
    }
    if (stopPrevious) {
      slicePreviewRef.current = source;
      source.onended = () => {
        if (slicePreviewRef.current === source) {
          slicePreviewRef.current = null;
        }
      };
    }
    return source;
  };

  const getSamplerRate = () => {
    if (!sampleBpm || sampleBpm <= 0) return 1;
    const ratio = bpm / sampleBpm;
    return Math.max(0.5, Math.min(2, ratio));
  };

  const stopSamplerPad = (padIndex: number) => {
    const source = samplerPadRefs.current[padIndex];
    if (!source) return;
    try {
      source.stop();
    } catch {
      // ignore
    }
    samplerPadRefs.current[padIndex] = null;
  };

  const stopAllSamplerPads = () => {
    samplerPadRefs.current.forEach((_, index) => stopSamplerPad(index));
  };

  const scheduleStep = (index: number, stepDuration: number) => {
    const drumGrid = drumStepsRef.current;
    const samplerGrid = samplerStepsRef.current;
    const rows = drumRowsRef.current;
    const slicesLocal = slicesRef.current;
    const assignments = padAssignmentsRef.current;
    const samplerBuffer = sampleBufferRef.current;

    if (index === 0) {
      stopAllSamplerPads();
    }

    rows.forEach((row, rowIndex) => {
      if (drumGrid[rowIndex]?.[index] && row.buffer) {
        const isSwingStep = index % 2 === 1;
        const swingValue = Math.max(-60, Math.min(60, row.swing));
        const swingOffset = Math.abs(swingValue) / 100 * stepDuration;
        const shouldDelay = swingValue >= 0 ? isSwingStep : !isSwingStep;
        const delay = shouldDelay ? swingOffset : 0;
        const rate = Math.pow(2, row.pitch / 12);
        playBuffer(row.buffer, undefined, undefined, delay, false, rate, row.volume, row.eq);
      }
    });

    if (samplerBuffer) {
      const samplerRate = getSamplerRate();
      assignments.forEach((sliceId, rowIndex) => {
        if (!sliceId) return;
        if (!samplerGrid[rowIndex]?.[index]) return;
        const slice = slicesLocal.find((item) => item.id === sliceId);
        if (!slice) return;
        const duration = Math.max(0.01, slice.end - slice.start);
        stopSamplerPad(rowIndex);
        const padPitch = samplerPitchRef.current[rowIndex] ?? 0;
        const padVolume = samplerVolumesRef.current[rowIndex] ?? 0.9;
        const padEq = samplerEqRef.current[rowIndex] ?? { low: 0, mid: 0, high: 0 };
        const pitchRate = Math.pow(2, padPitch / 12);
        const source = playBuffer(
          samplerBuffer,
          slice.start,
          duration,
          undefined,
          false,
          samplerRate * pitchRate,
          padVolume,
          padEq
        );
        samplerPadRefs.current[rowIndex] = source ?? null;
        if (source) {
          source.onended = () => {
            if (samplerPadRefs.current[rowIndex] === source) {
              samplerPadRefs.current[rowIndex] = null;
            }
          };
        }
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
      scheduleStep(current, stepDuration);
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
    stopAllSamplerPads();
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
    setSampleBpm(bpm);
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
    stopSamplerPad(padIndex);
    const samplerRate = getSamplerRate();
    const padPitch = samplerPitchRef.current[padIndex] ?? 0;
    const padVolume = samplerVolumesRef.current[padIndex] ?? 0.9;
    const padEq = samplerEqRef.current[padIndex] ?? { low: 0, mid: 0, high: 0 };
    const pitchRate = Math.pow(2, padPitch / 12);
    const source = playBuffer(
      buffer,
      slice.start,
      duration,
      undefined,
      false,
      samplerRate * pitchRate,
      padVolume,
      padEq
    );
    samplerPadRefs.current[padIndex] = source ?? null;
    if (source) {
      source.onended = () => {
        if (samplerPadRefs.current[padIndex] === source) {
          samplerPadRefs.current[padIndex] = null;
        }
      };
    }
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
      sampleBpm,
      createdAt: new Date().toISOString(),
      drumSteps,
      samplerSteps,
      slices,
      padAssignments,
      drumKeys,
      samplerKey,
      drumSwing: drumRows.map((row) => row.swing),
      drumVolumes: drumRows.map((row) => row.volume),
      drumPitch: drumRows.map((row) => row.pitch),
      drumEq: drumRows.map((row) => row.eq),
      samplerVolumes,
      samplerPitch,
      samplerEq,
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
    setSampleBpm(project.sampleBpm ?? project.bpm ?? 120);
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
    const drumSwing = Array.from({ length: DRUM_ROWS }, (_, index) => project.drumSwing?.[index] ?? 0);
    const drumVolumes = Array.from({ length: DRUM_ROWS }, (_, index) => project.drumVolumes?.[index] ?? 0.9);
    const drumPitch = Array.from({ length: DRUM_ROWS }, (_, index) => project.drumPitch?.[index] ?? 0);
    const drumEq = Array.from(
      { length: DRUM_ROWS },
      (_, index) => project.drumEq?.[index] ?? { low: 0, mid: 0, high: 0 }
    );
    const rows = await Promise.all(
      drumKeyList.map(async (key, index) => {
        if (!key) {
          return {
            name: defaultDrumNames[index],
            fileName: null,
            fileBlob: null,
            buffer: null,
            swing: drumSwing[index],
            volume: drumVolumes[index],
            pitch: drumPitch[index],
            eq: drumEq[index],
          } satisfies DrumRow;
        }
        const blob = await getBlob(key);
        if (!blob) {
          return {
            name: defaultDrumNames[index],
            fileName: null,
            fileBlob: null,
            buffer: null,
            swing: drumSwing[index],
            volume: drumVolumes[index],
            pitch: drumPitch[index],
            eq: drumEq[index],
          } satisfies DrumRow;
        }
        const buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
        return {
          name: defaultDrumNames[index],
          fileName: blob instanceof File ? blob.name : defaultDrumNames[index],
          fileBlob: blob,
          buffer,
          swing: drumSwing[index],
          volume: drumVolumes[index],
          pitch: drumPitch[index],
          eq: drumEq[index],
        } satisfies DrumRow;
      })
    );
    setDrumRows(rows);
    setSamplerVolumes(
      Array.from({ length: SAMPLE_ROWS }, (_, index) => project.samplerVolumes?.[index] ?? 0.9)
    );
    setSamplerPitch(
      Array.from({ length: SAMPLE_ROWS }, (_, index) => project.samplerPitch?.[index] ?? 0)
    );
    setSamplerEq(
      Array.from(
        { length: SAMPLE_ROWS },
        (_, index) => project.samplerEq?.[index] ?? { low: 0, mid: 0, high: 0 }
      )
    );

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
        swing: 0,
        volume: 0.9,
        pitch: 0,
        eq: { low: 0, mid: 0, high: 0 },
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
    setSampleBpm(bpm);
    setSamplerVolumes(Array.from({ length: SAMPLE_ROWS }, () => 0.9));
    setSamplerPitch(Array.from({ length: SAMPLE_ROWS }, () => 0));
    setSamplerEq(Array.from({ length: SAMPLE_ROWS }, () => ({ low: 0, mid: 0, high: 0 })));
    setSaveStatus(null);
  };

  const selectionStyle = useMemo(() => {
    if (!sampleDuration || !waveWindow) return { left: '0%', width: '0%' };
    const start = Math.min(sliceStart, sliceEnd);
    const end = Math.max(sliceStart, sliceEnd);
    const left = ((start - waveViewStart) / waveWindow) * 100;
    const width = ((end - start) / waveWindow) * 100;
    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.max(0, Math.min(100 - Math.max(0, left), width))}%`,
    };
  }, [sampleDuration, sliceStart, sliceEnd, waveViewStart, waveWindow]);

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
                      <div className="w-16 rounded-full border border-white/10 px-2 py-1 text-center text-[9px] uppercase tracking-[0.2em] text-white/30">
                        —
                      </div>
                      <div
                        className="grid text-[10px] text-white/30"
                        style={{
                          gridTemplateColumns: `repeat(${STEPS}, ${STEP_SIZE}px)`,
                          columnGap: `${STEP_GAP}px`,
                        }}
                      >
                        {Array.from({ length: STEPS }, (_, colIndex) => (
                          <div
                            key={colIndex}
                            className="flex h-6 w-6 items-center justify-center text-center leading-none"
                            style={{
                              borderRight:
                                (colIndex + 1) % 4 === 0 ? '2px solid #f97316' : undefined,
                            }}
                          >
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
                          className="w-16 rounded-full border border-white/15 bg-white/5 px-2 py-1 text-center text-[10px] uppercase tracking-[0.2em] text-white/60 hover:text-white"
                        >
                          {row.fileName ? 'Nahráno' : 'Nahrát'}
                        </label>
                        <div
                          className="grid"
                          style={{
                            gridTemplateColumns: `repeat(${STEPS}, ${STEP_SIZE}px)`,
                            columnGap: `${STEP_GAP}px`,
                          }}
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
                                  ? {
                                      backgroundColor: drumColors[rowIndex % drumColors.length],
                                      borderRight:
                                        (colIndex + 1) % 4 === 0
                                          ? '2px solid #f97316'
                                          : undefined,
                                    }
                                  : {
                                      borderRight:
                                        (colIndex + 1) % 4 === 0
                                          ? '2px solid #f97316'
                                          : undefined,
                                    }
                              }
                            />
                          ))}
                        </div>
                        <div className="flex w-32 items-center gap-2 pl-2">
                          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                            Swing
                          </span>
                          <input
                            type="range"
                            min={-60}
                            max={60}
                            step={1}
                            value={row.swing}
                            onChange={(event) => {
                              const value = Number(event.target.value);
                              setDrumRows((prev) =>
                                prev.map((item, idx) =>
                                  idx === rowIndex ? { ...item, swing: value } : item
                                )
                              );
                            }}
                            className="w-16 accent-[var(--mpc-accent)]"
                          />
                          <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                            {row.swing > 0 ? `+${row.swing}` : row.swing}
                          </span>
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
                  {sampleBuffer && (
                    <label className="ml-auto flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/50">
                      Sample BPM
                      <input
                        type="number"
                        min={60}
                        max={200}
                        value={sampleBpm}
                        onChange={(event) => setSampleBpm(Number(event.target.value))}
                        className="w-16 rounded-full border border-white/20 bg-black px-2 py-1 text-xs text-white"
                      />
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (!sampleBuffer) return;
                      const start = Math.max(0, Math.min(sliceStart, sliceEnd));
                      const end = Math.min(sampleDuration, Math.max(sliceStart, sliceEnd));
                      const duration = Math.max(0.05, end - start);
                      playBuffer(sampleBuffer, start, duration, undefined, true, getSamplerRate());
                    }}
                    className="rounded-full border border-[var(--mpc-accent)] bg-[var(--mpc-accent)]/20 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white"
                  >
                    Play Slice
                  </button>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-black/60 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="text-[10px] uppercase tracking-[0.2em] text-white/40">
                      Zoom
                    </label>
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-white/50">
                      <span>1x</span>
                      <input
                        type="range"
                        min={1}
                        max={8}
                        step={0.5}
                        value={waveZoom}
                        onChange={(event) => setWaveZoom(Number(event.target.value))}
                        className="w-28"
                      />
                      <span>8x</span>
                    </div>
                  </div>

                  <div ref={waveformWrapRef} className="relative mt-3 overflow-hidden">
                    <canvas
                      ref={waveformRef}
                      width={1200}
                      height={180}
                      className="h-40 rounded-lg cursor-crosshair"
                      onClick={handleWaveformClick}
                    />
                    {sampleBuffer && (
                      <div
                        className="pointer-events-none absolute inset-y-0 rounded-md border border-emerald-400/60 bg-emerald-400/20"
                        style={selectionStyle}
                      />
                    )}
                  </div>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/40">
                    Klik do waveformu nastaví {nextSlicePoint === 'start' ? 'START' : 'END'}.
                  </p>
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
                        className="grid text-[10px] text-white/30"
                        style={{
                          gridTemplateColumns: `repeat(${STEPS}, ${STEP_SIZE}px)`,
                          columnGap: `${STEP_GAP}px`,
                        }}
                      >
                        {Array.from({ length: STEPS }, (_, colIndex) => (
                          <div
                            key={colIndex}
                            className="flex h-6 w-6 items-center justify-center text-center leading-none"
                            style={{
                              borderRight:
                                (colIndex + 1) % 4 === 0 ? '2px solid #f97316' : undefined,
                            }}
                          >
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
                          className="grid"
                          style={{
                            gridTemplateColumns: `repeat(${STEPS}, ${STEP_SIZE}px)`,
                            columnGap: `${STEP_GAP}px`,
                          }}
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
                                  ? {
                                      backgroundColor: samplerColors[rowIndex % samplerColors.length],
                                      borderRight:
                                        (colIndex + 1) % 4 === 0
                                          ? '2px solid #f97316'
                                          : undefined,
                                    }
                                  : {
                                      borderRight:
                                        (colIndex + 1) % 4 === 0
                                          ? '2px solid #f97316'
                                          : undefined,
                                    }
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
                  Mixer · Volume / Pitch / EQ
                </h2>
                <div className="mt-4 grid gap-4">
                  <div className="rounded-xl border border-white/10 bg-black/50 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Bicí</p>
                    <div className="mt-4 grid gap-4 overflow-x-auto">
                      <div className="flex gap-4">
                        {drumRows.map((row, rowIndex) => (
                          <div
                            key={row.name}
                            className="flex w-24 flex-col items-center gap-3 rounded-lg border border-white/10 bg-black/60 p-3"
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: drumColors[rowIndex % drumColors.length] }}
                            />
                            <span className="text-[10px] uppercase tracking-[0.18em] text-white/70">
                              {row.name}
                            </span>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.01}
                              value={row.volume}
                              onChange={(event) => {
                                const value = Number(event.target.value);
                                setDrumRows((prev) =>
                                  prev.map((item, idx) =>
                                    idx === rowIndex ? { ...item, volume: value } : item
                                  )
                                );
                              }}
                              style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical' }}
                              className="h-24 w-2 accent-[var(--mpc-accent)]"
                            />
                            <label className="w-full text-[9px] uppercase tracking-[0.2em] text-white/40">
                              Pitch
                              <input
                                type="range"
                                min={-12}
                                max={12}
                                step={1}
                                value={row.pitch}
                                onChange={(event) => {
                                  const value = Number(event.target.value);
                                  setDrumRows((prev) =>
                                    prev.map((item, idx) =>
                                      idx === rowIndex ? { ...item, pitch: value } : item
                                    )
                                  );
                                }}
                                className="mt-1 w-full accent-[var(--mpc-accent)]"
                              />
                            </label>
                            <div className="grid w-full gap-1 text-[9px] uppercase tracking-[0.2em] text-white/40">
                              <label>
                                Low
                                <input
                                  type="range"
                                  min={-12}
                                  max={12}
                                  step={1}
                                  value={row.eq.low}
                                  onChange={(event) => {
                                    const value = Number(event.target.value);
                                    setDrumRows((prev) =>
                                      prev.map((item, idx) =>
                                        idx === rowIndex
                                          ? { ...item, eq: { ...item.eq, low: value } }
                                          : item
                                      )
                                    );
                                  }}
                                  className="mt-1 w-full accent-[var(--mpc-accent)]"
                                />
                              </label>
                              <label>
                                Mid
                                <input
                                  type="range"
                                  min={-12}
                                  max={12}
                                  step={1}
                                  value={row.eq.mid}
                                  onChange={(event) => {
                                    const value = Number(event.target.value);
                                    setDrumRows((prev) =>
                                      prev.map((item, idx) =>
                                        idx === rowIndex
                                          ? { ...item, eq: { ...item.eq, mid: value } }
                                          : item
                                      )
                                    );
                                  }}
                                  className="mt-1 w-full accent-[var(--mpc-accent)]"
                                />
                              </label>
                              <label>
                                High
                                <input
                                  type="range"
                                  min={-12}
                                  max={12}
                                  step={1}
                                  value={row.eq.high}
                                  onChange={(event) => {
                                    const value = Number(event.target.value);
                                    setDrumRows((prev) =>
                                      prev.map((item, idx) =>
                                        idx === rowIndex
                                          ? { ...item, eq: { ...item.eq, high: value } }
                                          : item
                                      )
                                    );
                                  }}
                                  className="mt-1 w-full accent-[var(--mpc-accent)]"
                                />
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-black/50 p-3">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">Sampler Pady</p>
                    <div className="mt-4 grid gap-4 overflow-x-auto">
                      <div className="flex gap-4">
                        {Array.from({ length: SAMPLE_ROWS }, (_, rowIndex) => (
                          <div
                            key={rowIndex}
                            className="flex w-24 flex-col items-center gap-3 rounded-lg border border-white/10 bg-black/60 p-3"
                          >
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: samplerColors[rowIndex % samplerColors.length] }}
                            />
                            <span className="text-[10px] uppercase tracking-[0.18em] text-white/70">
                              Pad {rowIndex + 1}
                            </span>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.01}
                              value={samplerVolumes[rowIndex] ?? 0.9}
                              onChange={(event) => {
                                const value = Number(event.target.value);
                                setSamplerVolumes((prev) =>
                                  prev.map((item, idx) => (idx === rowIndex ? value : item))
                                );
                              }}
                              style={{ writingMode: 'bt-lr', WebkitAppearance: 'slider-vertical' }}
                              className="h-24 w-2 accent-[var(--mpc-accent)]"
                            />
                            <label className="w-full text-[9px] uppercase tracking-[0.2em] text-white/40">
                              Pitch
                              <input
                                type="range"
                                min={-12}
                                max={12}
                                step={1}
                                value={samplerPitch[rowIndex] ?? 0}
                                onChange={(event) => {
                                  const value = Number(event.target.value);
                                  setSamplerPitch((prev) =>
                                    prev.map((item, idx) => (idx === rowIndex ? value : item))
                                  );
                                }}
                                className="mt-1 w-full accent-[var(--mpc-accent)]"
                              />
                            </label>
                            <div className="grid w-full gap-1 text-[9px] uppercase tracking-[0.2em] text-white/40">
                              <label>
                                Low
                                <input
                                  type="range"
                                  min={-12}
                                  max={12}
                                  step={1}
                                  value={samplerEq[rowIndex]?.low ?? 0}
                                  onChange={(event) => {
                                    const value = Number(event.target.value);
                                    setSamplerEq((prev) =>
                                      prev.map((item, idx) =>
                                        idx === rowIndex ? { ...item, low: value } : item
                                      )
                                    );
                                  }}
                                  className="mt-1 w-full accent-[var(--mpc-accent)]"
                                />
                              </label>
                              <label>
                                Mid
                                <input
                                  type="range"
                                  min={-12}
                                  max={12}
                                  step={1}
                                  value={samplerEq[rowIndex]?.mid ?? 0}
                                  onChange={(event) => {
                                    const value = Number(event.target.value);
                                    setSamplerEq((prev) =>
                                      prev.map((item, idx) =>
                                        idx === rowIndex ? { ...item, mid: value } : item
                                      )
                                    );
                                  }}
                                  className="mt-1 w-full accent-[var(--mpc-accent)]"
                                />
                              </label>
                              <label>
                                High
                                <input
                                  type="range"
                                  min={-12}
                                  max={12}
                                  step={1}
                                  value={samplerEq[rowIndex]?.high ?? 0}
                                  onChange={(event) => {
                                    const value = Number(event.target.value);
                                    setSamplerEq((prev) =>
                                      prev.map((item, idx) =>
                                        idx === rowIndex ? { ...item, high: value } : item
                                      )
                                    );
                                  }}
                                  className="mt-1 w-full accent-[var(--mpc-accent)]"
                                />
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
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
