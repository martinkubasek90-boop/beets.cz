"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

export type FeedItem = {
  type: "beat" | "project" | "acapella" | "collab";
  title: string;
  url: string;
  author: string;
  when: string | null;
  extra?: string;
  coverUrl?: string | null;
  audioUrl?: string | null;
};

function formatSince(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "před chvílí";
  if (minutes < 60) return `před ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `před ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `před ${days} dny`;
  return date.toLocaleDateString("cs-CZ");
}

export function FeedList({ items }: { items: FeedItem[] }) {
  const [activeSrc, setActiveSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!audioRef.current) return;
    const onEnd = () => setIsPlaying(false);
    audioRef.current.addEventListener("ended", onEnd);
    return () => audioRef.current?.removeEventListener("ended", onEnd);
  }, []);

  const handlePlay = (src?: string | null) => {
    if (!src) return;
    const audio = audioRef.current;
    if (!audio) return;
    if (activeSrc === src && isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }
    audio.src = src;
    audio.currentTime = 0;
    audio
      .play()
      .then(() => {
        setActiveSrc(src);
        setIsPlaying(true);
      })
      .catch(() => {
        setIsPlaying(false);
      });
  };

  const ordered = useMemo(
    () =>
      items
        .filter((i) => i.when)
        .sort((a, b) => new Date(b.when || 0).getTime() - new Date(a.when || 0).getTime()),
    [items]
  );

  return (
    <>
      <audio ref={audioRef} className="hidden" />
      <div className="space-y-3">
        {ordered.map((item, idx) => {
          const since = item.when ? formatSince(new Date(item.when)) : "";
          const badge =
            item.type === "beat"
              ? "Beat"
              : item.type === "project"
                ? "Projekt"
                : item.type === "acapella"
                  ? "Akapela"
                  : "Spolupráce";
          const canPlay = Boolean(item.audioUrl);
          const playing = canPlay && activeSrc === item.audioUrl && isPlaying;

          return (
            <div
              key={`${item.type}-${item.url}-${idx}`}
              className="relative overflow-hidden rounded-xl border border-white/10 bg-black/50 px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
            >
              {item.coverUrl && (
                <div
                  className="pointer-events-none absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.6), rgba(0,0,0,0.9)), url(${item.coverUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              )}
              <div className="relative flex flex-col gap-2">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-[var(--mpc-muted)]">
                  <span className="rounded-full border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-semibold text-white">
                    {badge}
                  </span>
                  {since && <span>{since}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-white">
                  <span className="font-semibold">{item.title}</span>
                  <span className="text-[var(--mpc-muted)]">· {item.author}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[12px] text-[var(--mpc-muted)]">
                  <Link
                    href={item.url}
                    className="rounded-full border border-[var(--mpc-accent)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--mpc-accent)] hover:bg-[var(--mpc-accent)] hover:text-black"
                  >
                    Otevřít
                  </Link>
                  {item.extra && item.extra.startsWith("/profile") ? (
                    <Link href={item.extra} className="text-[var(--mpc-accent)] underline underline-offset-4">
                      Profil autora
                    </Link>
                  ) : null}
                  {item.type === "collab" && item.extra ? <span>Status: {item.extra}</span> : null}
                  {canPlay && (
                    <button
                      onClick={() => handlePlay(item.audioUrl)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white hover:border-[var(--mpc-accent)]"
                    >
                      {playing ? "Pauza" : "Přehrát"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
