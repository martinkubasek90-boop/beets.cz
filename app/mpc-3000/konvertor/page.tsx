'use client';

import type { ChangeEvent, DragEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Upload, Play, GripVertical, CheckCircle, Loader2 } from 'lucide-react';
import PadGrid from '@/components/converter/PadGrid';
import { convertWavToSnd, createZipDownload, buildMPC3000Program } from '@/components/converter/wavToSnd';

type FileStatus = 'ready' | 'converting' | 'completed' | 'error';

type FileItem = {
  file: File;
  name: string;
  size: string;
  duration: string;
  status: FileStatus;
  id: string;
  padIndex: number;
  url: string;
  error?: string;
};

export default function MPC3000ConverterPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [converting, setConverting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [convertedFiles, setConvertedFiles] = useState<Array<{ url: string }>>([]);
  const [currentBank, setCurrentBank] = useState('A');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedFileForPad, setDraggedFileForPad] = useState<number | null>(null);
  const [showThankYou, setShowThankYou] = useState(false);
  const [typewriterText, setTypewriterText] = useState('');
  const [padSet, setPadSet] = useState<'ONE' | 'TWO'>('ONE');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleDrag = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === 'dragenter' || event.type === 'dragover') {
      setDragActive(true);
    } else if (event.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);

    const items = Array.from(event.dataTransfer.items || []);
    const allFiles: File[] = [];

    const readDirectory = async (dirEntry: any) => {
      const dirReader = dirEntry.createReader();
      const entries: any[] = await new Promise((resolve) => {
        dirReader.readEntries(resolve);
      });

      for (const entry of entries) {
        if (entry.isFile) {
          const file = await new Promise<File>((resolve) => entry.file(resolve));
          if (file.name.toLowerCase().endsWith('.wav')) {
            allFiles.push(file);
          }
        } else if (entry.isDirectory) {
          await readDirectory(entry);
        }
      }
    };

    for (const item of items) {
      const entry = (item as any).webkitGetAsEntry?.();
      if (entry) {
        if (entry.isFile) {
          const file = await new Promise<File>((resolve) => entry.file(resolve));
          if (file.name.toLowerCase().endsWith('.wav')) {
            allFiles.push(file);
          }
        } else if (entry.isDirectory) {
          await readDirectory(entry);
        }
      }
    }

    if (allFiles.length === 0) {
      const droppedFiles = Array.from(event.dataTransfer.files).filter((file) =>
        file.name.toLowerCase().endsWith('.wav')
      );
      allFiles.push(...droppedFiles);
    }

    if (allFiles.length > 0) {
      await addFiles(allFiles);
    }
  };

  const handleFileInput = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    await addFiles(selectedFiles);
    event.target.value = '';
  };

  const addFiles = async (newFiles: File[]) => {
    const currentCount = files.length;
    const remainingSlots = 128 - currentCount;
    const filesToAdd = newFiles.slice(0, remainingSlots);

    if (newFiles.length > remainingSlots) {
      alert(`Only ${remainingSlots} slots remaining. Added first ${filesToAdd.length} files.`);
    }

    const filesWithStatus = await Promise.all(
      filesToAdd.map(async (file, index) => {
        const url = URL.createObjectURL(file);
        let duration = 0;
        try {
          const audio = new Audio(url);
          await new Promise((resolve) => {
            audio.addEventListener('loadedmetadata', () => {
              duration = audio.duration;
              resolve(null);
            });
            audio.addEventListener('error', () => resolve(null));
          });
        } catch {
          // ignore error
        }

        return {
          file,
          name: file.name,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          duration: duration > 0 ? `${duration.toFixed(1)}s` : '-',
          status: 'ready' as FileStatus,
          id: Math.random().toString(36).substr(2, 9),
          padIndex: currentCount + index,
          url,
        };
      })
    );

    setFiles((prev) => [...prev, ...filesWithStatus]);
  };

  const removeFile = (id: string) => {
    const file = files.find((f) => f.id === id);
    if (file?.url) URL.revokeObjectURL(file.url);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const playPreview = (file: FileItem) => {
    if (playingId === file.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(file.url);
      audioRef.current.onended = () => setPlayingId(null);
      void audioRef.current.play();
      setPlayingId(file.id);
    }
  };

  const handleFileDragStart = (event: DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    setDraggedFileForPad(index);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleFileDragOver = (event: DragEvent<HTMLDivElement>, index: number) => {
    event.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFiles = [...files];
    const draggedFile = newFiles[draggedIndex];
    newFiles.splice(draggedIndex, 1);
    newFiles.splice(index, 0, draggedFile);
    setFiles(newFiles);
    setDraggedIndex(index);
  };

  const handleFileDragEnd = () => {
    setDraggedIndex(null);
    setDraggedFileForPad(null);
  };

  const handleDropOnPad = (padIndex: number) => {
    if (draggedFileForPad === null) return;

    const newFiles = [...files];
    const draggedFile = newFiles[draggedFileForPad];
    newFiles.splice(draggedFileForPad, 1);

    const targetIndex = Math.min(padIndex, newFiles.length);
    newFiles.splice(targetIndex, 0, draggedFile);

    setFiles(newFiles);
    setDraggedFileForPad(null);
    setDraggedIndex(null);
  };

  const handleConvert = async () => {
    if (files.length === 0) return;

    setConverting(true);
    setConvertedFiles([]);
    const results: Array<{ filename: string; blob: Blob; url: string }> = [];

    for (const file of files) {
      try {
        setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, status: 'converting' } : f)));

        const result = await convertWavToSnd(file.file);
        results.push({ ...result, id: file.id, originalName: file.name } as any);

        setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, status: 'completed' } : f)));
        setConvertedFiles((prev) => [...prev, { ...result, id: file.id } as any]);
      } catch (error: any) {
        console.error('Conversion error:', error);
        setFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, status: 'error', error: error.message } : f))
        );
      }
    }

    if (results.length > 0) {
      const sampleNames = results.map((r) => r.filename);
      const program = buildMPC3000Program(sampleNames, 'PROGRAM1');
      results.push(program as any);

      const today = new Date();
      const dateStr = `${today.getDate()}.${today.getMonth() + 1}.${today.getFullYear()}`;
      await createZipDownload(results, `MPC3000_KIT_${dateStr}`);

      setShowThankYou(true);
      setTimeout(() => {
        setShowThankYou(false);
        clearAll();
      }, 4000);
    }

    setConverting(false);
  };

  const clearAll = () => {
    files.forEach((f) => {
      if (f.url) URL.revokeObjectURL(f.url);
    });
    convertedFiles.forEach((f) => {
      if (f.url) URL.revokeObjectURL(f.url);
    });
    setFiles([]);
    setConvertedFiles([]);
  };

  const getSampleNames = () => files.map((f) => f.name.replace(/\.[^/.]+$/, '').substring(0, 8));

  const getVisibleFileCount = () => {
    const startIndex = padSet === 'ONE' ? 0 : 64;
    return Math.max(0, Math.min(64, files.length - startIndex));
  };

  const playPadSound = (padIndex: number) => {
    const offset = padSet === 'ONE' ? 0 : 64;
    const file = files[offset + padIndex];
    if (file?.url) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(file.url);
      audioRef.current.onended = () => setPlayingId(null);
      void audioRef.current.play();
      setPlayingId(file.id);
    }
  };

  useEffect(() => {
    if (showThankYou) {
      const fullText = 'THANK YOU\nROGER LINN !';
      let index = 0;
      setTypewriterText('');

      const interval = setInterval(() => {
        if (index < fullText.length) {
          setTypewriterText(fullText.substring(0, index + 1));
          index += 1;
        } else {
          clearInterval(interval);
        }
      }, 80);

      return () => clearInterval(interval);
    }

    setTypewriterText('');
    return undefined;
  }, [showThankYou]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-200 via-stone-100 to-stone-200 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl flex flex-col items-start gap-4 md:flex-row">
        <Link
          href="/"
          className="shrink-0 rounded-full border border-[var(--mpc-accent)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mpc-accent)] transition hover:bg-[var(--mpc-accent)] hover:text-black"
        >
          Zpět
        </Link>
        <div
        className="w-full max-w-4xl"
        style={{
          filter: 'drop-shadow(0 25px 60px rgba(0,0,0,0.35)) drop-shadow(0 12px 24px rgba(0,0,0,0.25))',
        }}
      >
        <div
          className="rounded-lg relative"
          style={{
            background: `
              linear-gradient(145deg, #b0aca4 0%, #9a9690 25%, #8c8880 50%, #7a766e 75%, #6a665e 100%),
              radial-gradient(circle at 30% 20%, rgba(255,255,255,0.15), transparent 50%)
            `,
            backgroundBlendMode: 'overlay, normal',
            paddingTop: '0px',
            paddingBottom: '102px',
            paddingLeft: '24px',
            paddingRight: '24px',
            boxShadow: `
              inset 0 3px 6px rgba(255,255,255,0.25),
              inset 0 -3px 10px rgba(0,0,0,0.5),
              inset 2px 0 4px rgba(0,0,0,0.2),
              inset -2px 0 4px rgba(255,255,255,0.1),
              0 2px 4px rgba(0,0,0,0.1)
            `,
          }}
        >
          <div
            className="rounded-lg shadow-2xl relative overflow-hidden"
            style={{
              background: `
                linear-gradient(180deg, #f0ece4 0%, #e8e4dc 20%, #dcd8d0 50%, #d4d0c8 80%, #ccc8c0 100%),
                radial-gradient(circle at 20% 15%, rgba(255,255,255,0.4), transparent 40%),
                radial-gradient(circle at 80% 85%, rgba(0,0,0,0.08), transparent 50%)
              `,
              backgroundBlendMode: 'overlay, soft-light, multiply',
              border: '3px solid #a8a4a0',
              boxShadow: `
                inset 0 4px 8px rgba(255,255,255,0.5),
                inset 0 -2px 6px rgba(0,0,0,0.15),
                inset 3px 0 6px rgba(255,255,255,0.2),
                inset -3px 0 6px rgba(0,0,0,0.1),
                0 4px 12px rgba(0,0,0,0.15),
                0 1px 3px rgba(0,0,0,0.1)
              `,
            }}
          >
            <div className="px-6 pb-6">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-1 space-y-3 pt-2">
                  <div className="text-center">
                    <div className="text-[7px] text-stone-500 mb-1 font-medium">STEREO VOLUME</div>
                    <div
                      className="w-10 h-10 mx-auto rounded-full relative shadow-lg"
                      style={{
                        background: 'linear-gradient(135deg, #4a4a4a 0%, #2a2a2a 50%, #1a1a1a 100%)',
                        border: '2px solid #555',
                        boxShadow: `
                          inset 0 2px 4px rgba(255,255,255,0.2),
                          inset 0 -2px 6px rgba(0,0,0,0.8),
                          0 4px 8px rgba(0,0,0,0.4),
                          0 1px 2px rgba(0,0,0,0.3)
                        `,
                      }}
                    >
                      <div className="absolute top-1.5 left-1/2 w-0.5 h-3 bg-white transform -translate-x-1/2 rounded-full shadow-sm"></div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-[7px] text-stone-500 mb-1 font-medium">RECORD LEVEL</div>
                    <div
                      className="w-10 h-10 mx-auto rounded-full relative shadow-lg"
                      style={{
                        background: 'linear-gradient(135deg, #4a4a4a 0%, #2a2a2a 50%, #1a1a1a 100%)',
                        border: '2px solid #555',
                        boxShadow: `
                          inset 0 2px 4px rgba(255,255,255,0.2),
                          inset 0 -2px 6px rgba(0,0,0,0.8),
                          0 4px 8px rgba(0,0,0,0.4),
                          0 1px 2px rgba(0,0,0,0.3)
                        `,
                      }}
                    >
                      <div className="absolute top-1.5 left-1/2 w-0.5 h-3 bg-red-500 transform -translate-x-1/2 rounded-full shadow-sm"></div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-[7px] text-stone-500 mb-1 font-medium">DISPLAY</div>
                    <div className="text-[7px] text-stone-500 mb-1 font-medium">CONTRAST</div>
                    <div
                      className="w-7 h-7 mx-auto rounded-full border-2 border-stone-500 shadow-md"
                      style={{
                        background: 'linear-gradient(135deg, #555 0%, #3a3a3a 50%, #2a2a2a 100%)',
                        boxShadow: `
                          inset 0 1px 3px rgba(255,255,255,0.2),
                          inset 0 -1px 4px rgba(0,0,0,0.7),
                          0 3px 6px rgba(0,0,0,0.3)
                        `,
                      }}
                    ></div>
                  </div>

                  <div className="mt-4 pt-2">
                    <div className="flex items-center gap-1 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-stone-400"></div>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-stone-400"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-stone-400"></div>
                    </div>
                    <div className="text-[7px] text-stone-500 font-medium">PAD BANK</div>
                    <div className="grid grid-cols-2 gap-1 mt-1">
                      {['A', 'B', 'C', 'D'].map((bank) => (
                        <button
                          key={bank}
                          onClick={() => setCurrentBank(bank)}
                          className={`w-5 h-5 rounded-sm text-[8px] font-bold transition-all ${
                            currentBank === bank
                              ? 'bg-stone-700 text-white shadow-inner'
                              : 'bg-stone-200 text-stone-600 border border-stone-300 hover:bg-stone-300'
                          }`}
                        >
                          {bank}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 mt-3">
                    <div className="text-center">
                      <div className="text-[6px] text-stone-500 mb-0.5">ONE</div>
                      <button
                        onClick={() => setPadSet('ONE')}
                        className={`w-7 h-4 mx-auto border border-stone-400 rounded-sm shadow-sm transition-all ${
                          padSet === 'ONE' ? 'bg-red-500' : 'bg-stone-100'
                        }`}
                      ></button>
                    </div>
                    <div className="text-center">
                      <div className="text-[6px] text-stone-500 mb-0.5">TWO</div>
                      <button
                        onClick={() => setPadSet('TWO')}
                        className={`w-7 h-4 mx-auto border border-stone-400 rounded-sm shadow-sm transition-all ${
                          padSet === 'TWO' ? 'bg-red-500' : 'bg-stone-100'
                        }`}
                      ></button>
                    </div>
                  </div>

                  <div className="space-y-2 mt-3">
                    <div className="text-[6px] text-stone-500 font-medium">NOTE VARIATION</div>
                    <div className="text-center">
                      <div className="text-[6px] text-stone-500 mb-0.5">ASSIGN</div>
                      <div className="w-7 h-4 mx-auto bg-stone-100 border border-stone-400 rounded-sm shadow-sm"></div>
                    </div>
                    <div className="text-center">
                      <div className="text-[6px] text-stone-500 mb-0.5">AFTER</div>
                      <div className="w-7 h-4 mx-auto bg-stone-100 border border-stone-400 rounded-sm shadow-sm"></div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-[6px] text-stone-500 text-center mb-0.5">10</div>
                    <div className="w-4 h-32 mx-auto bg-stone-800 rounded relative shadow-inner">
                      <div className="absolute left-0 right-0 top-1/3 h-4 bg-stone-400 rounded shadow"></div>
                    </div>
                    <div className="text-[6px] text-stone-500 text-center mt-0.5">0</div>
                  </div>
                </div>

                <div className="col-span-6 space-y-2 pt-6">
                  <div
                    className="rounded border-4 border-stone-500 p-3 min-h-[100px]"
                    style={{
                      background: `
                        linear-gradient(180deg, #1a3a5a 0%, #0a1a2a 100%),
                        radial-gradient(circle at 50% 50%, rgba(100,150,200,0.15), transparent 70%)
                      `,
                      backgroundBlendMode: 'overlay, normal',
                      boxShadow: `
                        inset 0 2px 8px rgba(0,0,0,0.6),
                        inset 0 -1px 3px rgba(100,150,200,0.1),
                        0 2px 4px rgba(0,0,0,0.2)
                      `,
                    }}
                  >
                    {showThankYou ? (
                      <div className="flex flex-col items-center justify-center h-full py-4">
                        <pre className="text-white font-mono text-base font-bold whitespace-pre-wrap text-center leading-relaxed">
                          {typewriterText}
                        </pre>
                      </div>
                    ) : (
                      <>
                        <div className="text-blue-300 font-mono text-xs mb-2">▶ WAV TO SND CONVERTER</div>
                        <div className="text-blue-200 text-[10px] space-y-0.5 font-mono">
                          <div className="flex justify-between">
                            <span>FILES:</span>
                            <span>{files.length}/128</span>
                          </div>
                          <div className="flex justify-between">
                            <span>SET:</span>
                            <span>
                              {padSet} ({padSet === 'ONE' ? '1-64' : '65-128'})
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>BANK:</span>
                            <span>{currentBank} (1-16)</span>
                          </div>
                          <div className="flex justify-between">
                            <span>READY:</span>
                            <span>{files.filter((f) => f.status === 'ready').length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>COMPLETE:</span>
                            <span>{files.filter((f) => f.status === 'completed').length}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex justify-around px-2">
                    {['SOFT KEY 1', 'SOFT KEY 2', 'SOFT KEY 3', 'SOFT KEY 4'].map((key) => (
                      <div key={key} className="text-center">
                        <div className="text-[6px] text-stone-500 mb-0.5">{key}</div>
                        <div className="w-10 h-4 bg-stone-100 rounded-sm border border-stone-300 shadow-sm"></div>
                      </div>
                    ))}
                  </div>

                  <div className="text-[8px] text-stone-500 font-medium mt-2 text-center">DRUMS</div>

                  <PadGrid
                    fileCount={getVisibleFileCount()}
                    currentBank={currentBank}
                    onBankChange={setCurrentBank}
                    sampleNames={getSampleNames().slice(padSet === 'ONE' ? 0 : 64, padSet === 'ONE' ? 64 : 128)}
                    onDropOnPad={handleDropOnPad}
                    isDragging={draggedFileForPad !== null}
                    onPadClick={playPadSound}
                    showThankYou={showThankYou}
                  />
                </div>

                <div className="col-span-5 space-y-3" style={{ width: '90%', marginLeft: 'auto' }}>
                  <div className="flex items-start justify-between pt-2">
                    <div></div>
                    <div className="text-right">
                      <div className="text-stone-600 font-bold text-sm">AKAI MPC 3000 CONVERTOR</div>
                      <div className="text-stone-500 text-[10px]">(WAV &gt; SND)</div>
                    </div>
                  </div>

                  <div className="bg-stone-400 rounded p-1.5 mx-auto w-[70%]">
                    <div className="grid grid-cols-8 gap-0.5">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div key={i} className="w-full aspect-[3/1] bg-stone-600 rounded-sm"></div>
                      ))}
                    </div>
                  </div>

                  <div className="h-12"></div>

                  <div
                    className="rounded border-2 border-stone-500 p-3 shadow-inner"
                    style={{
                      background: `
                        linear-gradient(180deg, #1a3a5a 0%, #0a1a2a 100%),
                        radial-gradient(circle at 50% 50%, rgba(100,150,200,0.12), transparent 70%)
                      `,
                      backgroundBlendMode: 'overlay, normal',
                      minHeight: '280px',
                      boxShadow: `
                        inset 0 2px 6px rgba(0,0,0,0.6),
                        inset 0 -1px 2px rgba(100,150,200,0.08),
                        0 2px 4px rgba(0,0,0,0.2)
                      `,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2 pb-1 border-b border-blue-700/50">
                      <div className="text-blue-300 font-mono text-[10px]">▶ FILES (DRAG TO REORDER OR TO PAD)</div>
                      <div className="text-blue-400 font-mono text-[10px]">{files.length}</div>
                    </div>
                    <div className="space-y-1 max-h-[240px] overflow-y-auto custom-scrollbar">
                      {files.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-24 text-blue-400">
                          <div className="font-mono text-[10px]">NO FILES LOADED</div>
                        </div>
                      ) : (
                        files.map((file, index) => (
                          <div
                            key={file.id}
                            draggable
                            onDragStart={(event) => handleFileDragStart(event, index)}
                            onDragOver={(event) => handleFileDragOver(event, index)}
                            onDragEnd={handleFileDragEnd}
                            className={`flex items-center gap-1 text-blue-200 font-mono text-[10px] p-1 rounded cursor-move hover:bg-blue-800/30 ${
                              draggedIndex === index ? 'bg-blue-700/50' : ''
                            }`}
                          >
                            <GripVertical className="w-3 h-3 text-blue-500 flex-shrink-0" />
                            <span className="text-blue-400 w-5">{String(index + 1).padStart(2, '0')}</span>
                            <button onClick={() => playPreview(file)} className="p-0.5 hover:bg-blue-700/50 rounded">
                              <Play className={`w-3 h-3 ${playingId === file.id ? 'text-green-400' : 'text-blue-300'}`} />
                            </button>
                            <span className="truncate flex-1">{file.name.substring(0, 16)}</span>
                            <span className="text-blue-400 text-[9px]">{file.duration}</span>
                            {file.status === 'converting' && <Loader2 className="w-3 h-3 text-blue-300 animate-spin" />}
                            {file.status === 'completed' && <CheckCircle className="w-3 h-3 text-green-400" />}
                            <button
                              onClick={() => removeFile(file.id)}
                              className="text-red-400 hover:text-red-300 text-sm font-bold px-1"
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-stone-400/80 rounded p-3 space-y-3">
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded p-3 transition-all ${
                        dragActive ? 'border-red-500 bg-red-100/50' : 'border-stone-500 bg-stone-300/50'
                      }`}
                    >
                      <input type="file" multiple accept=".wav" onChange={handleFileInput} className="hidden" id="file-upload" />
                      <label htmlFor="file-upload" className="flex flex-col items-center cursor-pointer">
                        <Upload className="w-5 h-5 text-stone-600 mb-1" />
                        <div className="text-stone-700 font-bold text-xs">DROP WAV FILES OR FOLDER</div>
                        <div className="text-stone-500 text-[10px]">or click to browse</div>
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={handleConvert}
                        disabled={files.length === 0 || converting}
                        className="flex-1 h-9 bg-red-600 hover:bg-red-500 disabled:bg-red-400 text-white font-bold text-sm rounded shadow-md border-2 border-red-800 disabled:border-red-600 transition-all"
                      >
                        {converting ? 'CONVERTING...' : 'CONVERT'}
                      </button>
                      <button
                        onClick={clearAll}
                        disabled={files.length === 0}
                        className="flex-1 h-9 bg-white hover:bg-stone-50 disabled:bg-stone-200 text-stone-700 disabled:text-stone-400 font-bold text-sm rounded shadow-md border-2 border-stone-400 transition-all"
                      >
                        CLEAR ALL
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 px-6 flex justify-between items-center text-[8px] text-stone-400">
            <div>16 BIT DRUM SAMPLER / MIDI SEQUENCER</div>
            <div>SND + PGM CONVERTER</div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.5);
          border-radius: 3px;
        }
      `}</style>
    </div>
    </div>
  );
}
