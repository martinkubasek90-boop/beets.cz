'use client';

import type { ChangeEvent, DragEvent } from 'react';
import { useState } from 'react';
import { MainNav } from '@/components/main-nav';

export default function StemSplitterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const dropped = Array.from(event.dataTransfer.files).find((f) => f.type.includes('audio'));
    if (dropped) {
      setFile(dropped);
      setError(null);
      setDownloadUrl(null);
    }
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);
    setDownloadUrl(null);
    event.target.value = '';
  };

  const runSplit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setDownloadUrl(null);
    try {
      const formData = new FormData();
      formData.append('file', file, file.name);
      const response = await fetch('/api/stem-splitter', { method: 'POST', body: formData });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.error || 'Zpracování selhalo.');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
    } catch (err: any) {
      setError(err?.message || 'Zpracování selhalo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--mpc-deck,#050505)] text-white">
      <MainNav />
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-10">
        <div className="rounded-3xl border border-white/10 bg-[var(--mpc-panel)] p-8 shadow-[0_30px_80px_-60px_rgba(0,0,0,0.8)] backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-3">
              <p className="text-[11px] uppercase tracking-[0.45em] text-[var(--mpc-muted)]">Stem Splitter</p>
              <h1 className="text-3xl font-semibold uppercase tracking-[0.18em]">Stem Splitter</h1>
              <p className="text-sm text-[var(--mpc-muted)]">
                Rozdělení mixu na stems (vocals, drums, bass, other) přes HF Demucs.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/40 px-5 py-4 text-xs text-[var(--mpc-muted)]">
              <p className="uppercase tracking-[0.24em] text-[var(--mpc-accent)]">HF Serverless</p>
              <p className="mt-2">Výstup je ZIP se stemmy.</p>
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
                  onClick={runSplit}
                  disabled={!file || loading}
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--mpc-accent)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Zpracovávám…' : 'Rozdělit do stems'}
                </button>
              </div>

              <div className="rounded-2xl border border-white/10 bg-black/40 px-6 py-4 text-sm text-[var(--mpc-muted)]">
                <p className="uppercase tracking-[0.2em] text-[var(--mpc-accent)]">Vybraný soubor</p>
                <p className="mt-2">{file?.name || 'Zatím žádný soubor'}</p>
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/35 p-6">
              <p className="uppercase tracking-[0.24em] text-[var(--mpc-accent-2)]">Výstup</p>
              <div className="mt-4 space-y-4 text-sm text-[var(--mpc-muted)]">
                {downloadUrl ? (
                  <>
                    <p>Stems jsou připravené ke stažení.</p>
                    <a
                      href={downloadUrl}
                      download="stems.zip"
                      className="inline-flex w-full items-center justify-center rounded-full bg-[var(--mpc-accent)] px-6 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-black transition hover:brightness-110"
                    >
                      Stáhnout ZIP
                    </a>
                  </>
                ) : (
                  <p>Nahraj audio a spusť rozdělení.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
