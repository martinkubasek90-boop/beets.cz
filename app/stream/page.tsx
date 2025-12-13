'use client';

import Link from 'next/link';
import StreamSection from '@/components/stream-section';

export default function StreamPage() {
  return (
    <main className="min-h-screen bg-[var(--mpc-deck)] text-[var(--mpc-light)]">
      <header className="border-b border-[var(--mpc-dark)] bg-[var(--mpc-panel)]/70 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--mpc-muted)]">Stream</p>
            <h1 className="text-2xl font-bold text-white">Platformní live stream</h1>
          </div>
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-[var(--mpc-accent)] px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-black"
          >
            ← Zpět na homepage
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <StreamSection embed={false} />
      </div>
    </main>
  );
}
