'use client';

import type { ChangeEvent, DragEvent } from 'react';
import { useMemo, useState } from 'react';
import { MainNav } from '@/components/main-nav';

type UploadState = 'idle' | 'uploading' | 'done' | 'error';

const ACCEPTED_EXT = '.wav';

export default function KonvertorPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<UploadState>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileListLabel = useMemo(() => {
    if (!files.length) return 'Zatím žádné soubory';
    if (files.length === 1) return files[0].name;
    return `${files.length} souborů`;
  }, [files]);

  const mergeFiles = (incoming: FileList | File[]) => {
    const next = Array.from(incoming);
    const wavFiles = next.filter((file) => file.name.toLowerCase().endsWith(ACCEPTED_EXT));
    if (!wavFiles.length) {
      setMessage('Vyber WAV soubory (16/24/32bit).');
      return;
    }
    setFiles((prev) => [...prev, ...wavFiles]);
    setMessage(null);
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    mergeFiles(event.target.files);
    event.target.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files?.length) {
      mergeFiles(event.dataTransfer.files);
    }
  };

  const handleConvert = async () => {
    if (!files.length || state === 'uploading') return;
    setState('uploading');
    setMessage('Konvertuju…');

    try {
      const formData = new FormData();
      files.forEach((file) => {
        const name = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
        formData.append('files', file, name);
      });

      const response = await fetch('/api/konvertor', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Konverze selhala.');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `beets-konvertor-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setState('done');
      setMessage('Hotovo. Balíček se stáhl.');
      setFiles([]);
    } catch (error: any) {
      console.error(error);
      setState('error');
      setMessage(error?.message || 'Konverze selhala.');
    }
  };

  return (
    <main className="min-h-screen bg-[var(--mpc-deck,#050505)] text-white">
      <MainNav />
      <section className="mx-auto max-w-5xl px-4 pb-16 pt-10">
        <div className="rounded-3xl border border-white/10 bg-[var(--mpc-panel)] p-8 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.8)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.45em] text-[var(--mpc-muted)]">Beets.cz</p>
              <h1 className="text-3xl font-semibold uppercase tracking-[0.18em]">WAV → MP3 konvertor</h1>
              <p className="text-sm text-[var(--mpc-muted)]">
                Nahraj WAV soubory (16/24/32 bit). Po konverzi stáhneš ZIP se všemi MP3.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-xs text-[var(--mpc-muted)]">
              <p className="uppercase tracking-[0.24em] text-[var(--mpc-accent)]">Rychle a bezpečně</p>
              <p className="mt-2">Nahrané WAVy se po konverzi mažou.</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4">
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`rounded-2xl border border-dashed px-6 py-10 text-center transition ${
                  isDragging
                    ? 'border-[var(--mpc-accent)] bg-[rgba(243,116,51,0.08)]'
                    : 'border-white/15 bg-black/30'
                }`}
              >
                <p className="text-sm uppercase tracking-[0.3em] text-[var(--mpc-muted)]">Dropzone</p>
                <p className="mt-3 text-lg font-medium">Přetáhni WAV soubory sem</p>
                <p className="mt-2 text-xs text-[var(--mpc-muted)]">nebo použij výběr souboru / složky</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-black/50 px-5 py-3 text-xs uppercase tracking-[0.3em] text-white hover:border-[var(--mpc-accent)]">
                  Vybrat soubory
                  <input
                    type="file"
                    accept=".wav"
                    multiple
                    className="hidden"
                    onChange={handleFiles}
                  />
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-black/50 px-5 py-3 text-xs uppercase tracking-[0.3em] text-white hover:border-[var(--mpc-accent)]">
                  Vybrat složku
                  <input
                    type="file"
                    multiple
                    // @ts-expect-error webkitdirectory není v TS typech
                    webkitdirectory="true"
                    className="hidden"
                    onChange={handleFiles}
                  />
                </label>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 px-6 py-4 text-sm text-[var(--mpc-muted)]">
                <p className="uppercase tracking-[0.2em] text-[var(--mpc-accent)]">Vybráno</p>
                <p className="mt-2">{fileListLabel}</p>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-black/35 p-6">
              <div className="space-y-4 text-sm text-[var(--mpc-muted)]">
                <p className="uppercase tracking-[0.25em] text-[var(--mpc-accent-2)]">Jak to funguje</p>
                <ol className="list-decimal space-y-2 pl-4">
                  <li>Vyber WAV soubory nebo celou složku.</li>
                  <li>Spusť konverzi – vytvoří se MP3 balíček.</li>
                  <li>Stahuješ ZIP, WAVy se smažou.</li>
                </ol>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  onClick={handleConvert}
                  disabled={!files.length || state === 'uploading'}
                  className="w-full rounded-full bg-[var(--mpc-accent)] px-6 py-4 text-sm font-semibold uppercase tracking-[0.3em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {state === 'uploading' ? 'Konvertuju…' : 'Konvertovat do MP3'}
                </button>
                <button
                  onClick={() => setFiles([])}
                  className="w-full rounded-full border border-white/10 px-6 py-3 text-xs uppercase tracking-[0.35em] text-white hover:border-[var(--mpc-accent)]"
                >
                  Vyčistit výběr
                </button>
                {message && (
                  <p className={`text-xs ${state === 'error' ? 'text-red-400' : 'text-[var(--mpc-muted)]'}`}>
                    {message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
