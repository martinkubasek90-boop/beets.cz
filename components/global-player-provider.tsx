"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { FireButton } from "./fire-button";

type TrackMeta = {
  projectId?: string;
  trackIndex?: number;
};

type Track = {
  id: string | number;
  title: string;
  artist: string;
  url: string;
  cover_url?: string | null;
  user_id?: string | null;
  item_type?: 'beat' | 'project' | 'collab';
  meta?: TrackMeta;
};

type PlayerCtx = {
  current: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  play: (track: Track) => void;
  toggle: () => void;
  pause: () => void;
  seek: (pct: number) => void;
  setOnEnded: (fn: (() => void) | null) => void;
  setOnNext?: (fn: (() => void) | null) => void;
  setOnPrev?: (fn: (() => void) | null) => void;
};

const Ctx = createContext<PlayerCtx | null>(null);

export function useGlobalPlayer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGlobalPlayer must be used inside GlobalPlayerProvider");
  return ctx;
}

export function GlobalPlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const onEndedRef = useRef<(() => void) | null>(null);
  const onNextRef = useRef<(() => void) | null>(null);
  const onPrevRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime || 0);
    const onMeta = () => setDuration(el.duration || 0);
    const onEnd = () => {
      setIsPlaying(false);
      if (onEndedRef.current) {
        onEndedRef.current();
      }
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnd);
    };
  }, []);

  const play = useCallback((track: Track) => {
    if (!audioRef.current || !track.url) return;
    setCurrent(track);
    audioRef.current.src = track.url;
    audioRef.current.currentTime = 0;
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  }, []);

  const toggle = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    }
  }, [isPlaying]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const seek = useCallback(
    (pct: number) => {
      if (!audioRef.current || !duration) return;
      const next = Math.min(Math.max(pct, 0), 1) * duration;
      audioRef.current.currentTime = next;
      setCurrentTime(next);
    },
    [duration]
  );

  const skipBy = useCallback(
    (seconds: number) => {
      const el = audioRef.current;
      if (!el) return;
      const baseCurrent = el.currentTime || 0;
      const dur = duration || el.duration || 0;
      const next = Math.min(Math.max(baseCurrent + seconds, 0), dur);
      el.currentTime = next;
      setCurrentTime(next);
    },
    [duration]
  );

  const handleNextDefault = useCallback(() => skipBy(300), [skipBy]);
  const handlePrevDefault = useCallback(() => skipBy(-300), [skipBy]);

  const setOnEnded = useCallback((fn: (() => void) | null) => {
    onEndedRef.current = fn;
  }, []);
  const setOnNext = useCallback(
    (fn: (() => void) | null) => {
      onNextRef.current = fn ?? handleNextDefault;
    },
    [handleNextDefault]
  );
  const setOnPrev = useCallback(
    (fn: (() => void) | null) => {
      onPrevRef.current = fn ?? handlePrevDefault;
    },
    [handlePrevDefault]
  );

  useEffect(() => {
    if (!onNextRef.current) {
      onNextRef.current = handleNextDefault;
    }
    if (!onPrevRef.current) {
      onPrevRef.current = handlePrevDefault;
    }
  }, [handleNextDefault, handlePrevDefault]);

  const value = useMemo(
    () => ({ current, isPlaying, currentTime, duration, play, toggle, pause, seek, setOnEnded, setOnNext, setOnPrev }),
    [current, isPlaying, currentTime, duration, play, toggle, pause, seek, setOnEnded, setOnNext, setOnPrev]
  );

  const derivedItemType =
    typeof current?.id === "string" && String(current.id).startsWith("project-") ? "project" : "beat";
  const fireItemId = current ? String(current.id) : null;

  return (
    <Ctx.Provider value={value}>
      {children}
      {current && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3 text-sm">
            <div className="flex items-center gap-3">
              {current.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.cover_url}
                  alt={current.title}
                  className="h-12 w-12 rounded border border-white/10 object-cover"
                />
              ) : (
                <div className="grid h-12 w-12 place-items-center rounded border border-white/10 bg-white/10 text-[11px] text-white">
                  {String(current.title || "?").slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-[140px]">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white leading-tight">{current.title}</p>
                  {fireItemId && (
                    <FireButton itemType={derivedItemType} itemId={fireItemId} className="scale-90" />
                  )}
                </div>
                <p className="text-[11px] text-[var(--mpc-muted)]">{current.artist}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onPrevRef.current?.()}
                disabled={!onPrevRef.current}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white hover:border-[var(--mpc-accent)] disabled:opacity-40"
              >
                ◄
              </button>
              <button
                onClick={toggle}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--mpc-accent)] text-black font-bold shadow-[0_10px_24px_rgba(243,116,51,0.35)]"
              >
                {isPlaying ? "▮▮" : "►"}
              </button>
              <button
                onClick={() => onNextRef.current?.()}
                disabled={!onNextRef.current}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white hover:border-[var(--mpc-accent)] disabled:opacity-40"
              >
                ►
              </button>
              <button
                onClick={pause}
                className="text-[11px] uppercase tracking-[0.1em] text-[var(--mpc-muted)] hover:text-white"
              >
                Stop
              </button>
            </div>
            <div className="flex-1 min-w-[220px]">
              <div
                className="h-2 cursor-pointer overflow-hidden rounded-full bg-white/10"
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                  seek((e.clientX - rect.left) / rect.width);
                }}
              >
                <div
                  className="h-full rounded-full bg-[var(--mpc-accent)]"
                  style={{ width: duration ? `${(currentTime / duration) * 100}%` : "0%" }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-[var(--mpc-muted)]">
                <span>{Math.floor(currentTime)} s</span>
                <span>{duration ? Math.floor(duration) : "--"} s</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
