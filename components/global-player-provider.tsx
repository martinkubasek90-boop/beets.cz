"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { FireButton } from "./fire-button";
import { createClient } from "@/lib/supabase/client";

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
  item_type?: "beat" | "project" | "collab" | "acapella";
  meta?: TrackMeta;
};

type PlayerCtx = {
  current: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  play: (track: Track) => void;
  setQueue: (tracks: Track[], startId?: Track["id"] | null, autoplay?: boolean) => void;
  queue: Track[];
  next: () => void;
  prev: () => void;
  shuffle: boolean;
  toggleShuffle: () => void;
  repeatMode: "off" | "all" | "one";
  cycleRepeatMode: () => void;
  isMini: boolean;
  toggleMini: () => void;
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
  const supabase = createClient();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [current, setCurrent] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);
  const [queue, setQueueState] = useState<Track[]>([]);
  const queueRef = useRef<Track[]>([]);
  const queueIdxRef = useRef<number>(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off");
  const [queueOpen, setQueueOpen] = useState(false);
  const [isMini, setIsMini] = useState(false);
  const onEndedRef = useRef<(() => void) | null>(null);
  const onNextRef = useRef<(() => void) | null>(null);
  const onPrevRef = useRef<(() => void) | null>(null);
  const resumeAtRef = useRef<number | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const draggingIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)).catch(() => {});
  }, [supabase]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime || 0);
    const onMeta = () => {
      setDuration(el.duration || 0);
      if (resumeAtRef.current && el.duration && resumeAtRef.current < el.duration) {
        el.currentTime = resumeAtRef.current;
        setCurrentTime(resumeAtRef.current);
        resumeAtRef.current = null;
      }
    };
    const onEnd = () => {
      setIsPlaying(false);
      if (queueRef.current.length) {
        if (repeatMode === "one") {
          playFromQueue(queueIdxRef.current);
          return;
        }
        const q = queueRef.current;
        const nextIdx = shuffle ? getRandomIdx() : queueIdxRef.current + 1;
        if (nextIdx >= q.length) {
          if (repeatMode === "all") {
            playFromQueue(0);
            return;
          }
        } else {
          playFromQueue(nextIdx);
          return;
        }
      }
      if (onEndedRef.current) {
        onEndedRef.current();
        return;
      }
      if (onNextRef.current) {
        onNextRef.current();
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
    setPlayError(null);
    setCurrent(track);
    const idx = queueRef.current.findIndex((t) => String(t.id) === String(track.id));
    if (idx >= 0) queueIdxRef.current = idx;
    audioRef.current.src = track.url;
    audioRef.current.currentTime = 0;
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        console.error("playback error", err);
        setPlayError("Nepodařilo se spustit přehrávání (možná expirovaný odkaz nebo problém s povolením zvuku).");
        setIsPlaying(false);
      });
  }, []);

  const playFromQueue = useCallback(
    (idx: number) => {
      const q = queueRef.current;
      if (!q.length) return;
      const safeIdx = ((idx % q.length) + q.length) % q.length;
      queueIdxRef.current = safeIdx;
      play(q[safeIdx]);
    },
    [play]
  );

  const setQueue = useCallback(
    (tracks: Track[], startId?: Track["id"] | null, autoplay = true) => {
      const clean = (tracks || []).filter((t) => t && t.url);
      if (!clean.length) return;
      queueRef.current = clean;
      setQueueState(clean);
      const startIdx =
        startId !== undefined && startId !== null
          ? clean.findIndex((t) => String(t.id) === String(startId))
          : 0;
      queueIdxRef.current = startIdx >= 0 ? startIdx : 0;
      if (autoplay) {
        playFromQueue(queueIdxRef.current);
      }
    },
    [playFromQueue]
  );

  const getRandomIdx = useCallback(() => {
    const q = queueRef.current;
    if (!q.length) return 0;
    if (q.length === 1) return 0;
    let idx = queueIdxRef.current;
    while (idx === queueIdxRef.current) {
      idx = Math.floor(Math.random() * q.length);
    }
    return idx;
  }, []);

  const next = useCallback(() => {
    if (queueRef.current.length) {
      if (repeatMode === "one") {
        playFromQueue(queueIdxRef.current);
        return;
      }
      const q = queueRef.current;
      const nextIdx = shuffle ? getRandomIdx() : queueIdxRef.current + 1;
      if (nextIdx >= q.length) {
        if (repeatMode === "all") {
          playFromQueue(0);
        } else {
          setIsPlaying(false);
        }
      } else {
        playFromQueue(nextIdx);
      }
      return;
    }
    onNextRef.current?.();
  }, [getRandomIdx, playFromQueue, repeatMode, shuffle]);

  const prev = useCallback(() => {
    if (queueRef.current.length) {
      if (repeatMode === "one") {
        playFromQueue(queueIdxRef.current);
        return;
      }
      const q = queueRef.current;
      const prevIdx = shuffle ? getRandomIdx() : queueIdxRef.current - 1;
      if (prevIdx < 0) {
        if (repeatMode === "all") {
          playFromQueue(q.length - 1);
        } else {
          playFromQueue(0);
        }
      } else {
        playFromQueue(prevIdx);
      }
      return;
    }
    onPrevRef.current?.();
  }, [getRandomIdx, playFromQueue, repeatMode, shuffle]);

  const toggleShuffle = useCallback(() => setShuffle((v) => !v), []);
  const cycleRepeatMode = useCallback(
    () => setRepeatMode((mode) => (mode === "off" ? "all" : mode === "all" ? "one" : "off")),
    []
  );
  const toggleMini = useCallback(() => setIsMini((v) => !v), []);

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
      const nextPos = Math.min(Math.max(pct, 0), 1) * duration;
      audioRef.current.currentTime = nextPos;
      setCurrentTime(nextPos);
    },
    [duration]
  );

  const skipBy = useCallback(
    (seconds: number) => {
      const el = audioRef.current;
      if (!el) return;
      const baseCurrent = el.currentTime || 0;
      const dur = duration || el.duration || 0;
      const nextPos = Math.min(Math.max(baseCurrent + seconds, 0), dur);
      el.currentTime = nextPos;
      setCurrentTime(nextPos);
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
    if (!onNextRef.current) onNextRef.current = handleNextDefault;
    if (!onPrevRef.current) onPrevRef.current = handlePrevDefault;
  }, [handleNextDefault, handlePrevDefault]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.getAttribute("contenteditable") === "true");
      if (isInput) return;
      if (e.code === "Space") {
        e.preventDefault();
        toggle();
      }
      if (e.code === "ArrowRight") {
        e.preventDefault();
        next();
      }
      if (e.code === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, toggle]);

  const queueList = useMemo(() => queue, [queue]);

  const moveInQueue = useCallback(
    (fromIdx: number, toIdx: number) => {
      const q = queueRef.current.slice();
      if (fromIdx < 0 || toIdx < 0 || fromIdx >= q.length || toIdx >= q.length) return;
      const [item] = q.splice(fromIdx, 1);
      q.splice(toIdx, 0, item);
      queueRef.current = q;
      setQueueState(q);
      if (current && String(item.id) === String(current.id)) {
        queueIdxRef.current = toIdx;
      } else if (queueIdxRef.current >= 0) {
        queueIdxRef.current = q.findIndex((t) => String(t.id) === String(current?.id));
      }
    },
    [current]
  );

  const derivedItemType =
    current?.item_type ||
    (typeof current?.id === "string" && String(current.id).startsWith("project-") ? "project" : "beat");
  const fireItemId = current ? String(current.id) : null;
  const fireButtonType: "beat" | "project" | "acapella" =
    derivedItemType === "project" ? "project" : derivedItemType === "acapella" ? "acapella" : "beat";

  useEffect(() => {
    if (!current || !userId) {
      setIsFavorite(false);
      resumeAtRef.current = null;
      return;
    }
    const itemType = derivedItemType;
    const itemId = String(current.id);
    const load = async () => {
      try {
        const { data: fav } = await supabase
          .from("favorites")
          .select("id")
          .eq("user_id", userId)
          .eq("item_type", itemType)
          .eq("item_id", itemId)
          .maybeSingle();
        setIsFavorite(!!fav);

        const { data: prog } = await supabase
          .from("playback_progress")
          .select("position_sec,duration_sec")
          .eq("user_id", userId)
          .eq("item_type", itemType)
          .eq("item_id", itemId)
          .maybeSingle();
        if (prog && typeof prog.position_sec === "number" && prog.position_sec > 5) {
          resumeAtRef.current = Math.min(prog.position_sec, prog.duration_sec || prog.position_sec);
        } else {
          resumeAtRef.current = null;
        }
        void supabase.from("play_history").insert({
          user_id: userId,
          item_type: itemType,
          item_id: itemId,
        });
      } catch (err) {
        console.warn("Nepodařilo se načíst oblíbené/progress:", err);
      }
    };
    void load();
  }, [current, derivedItemType, supabase, userId]);

  useEffect(() => {
    if (!current || !userId) return;
    if (!isPlaying) return;
    const itemType = derivedItemType;
    const itemId = String(current.id);
    const saveProgress = async () => {
      try {
        await supabase.from("playback_progress").upsert({
          user_id: userId,
          item_type: itemType,
          item_id: itemId,
          position_sec: Math.round(currentTime),
          duration_sec: duration || null,
          updated_at: new Date().toISOString(),
        });
      } catch (err) {
        console.warn("Save progress failed", err);
      }
    };
    void saveProgress();
    progressTimerRef.current && clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      void saveProgress();
    }, 10000);
    return () => {
      progressTimerRef.current && clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    };
  }, [current, currentTime, duration, derivedItemType, isPlaying, supabase, userId]);

  const value = useMemo(
    () => ({
      current,
      isPlaying,
      currentTime,
      duration,
      play,
      setQueue,
      queue: queueList,
      next,
      prev,
      shuffle,
      toggleShuffle,
      repeatMode,
      cycleRepeatMode,
      isMini,
      toggleMini,
      toggle,
      pause,
      seek,
      setOnEnded,
      setOnNext,
      setOnPrev,
    }),
    [
      current,
      isPlaying,
      currentTime,
      duration,
      play,
      setQueue,
      queueList,
      next,
      prev,
      shuffle,
      toggleShuffle,
      repeatMode,
      cycleRepeatMode,
      isMini,
      toggleMini,
      toggle,
      pause,
      seek,
      setOnEnded,
      setOnNext,
      setOnPrev,
    ]
  );

  const formatTime = (sec: number) => {
    if (!sec || Number.isNaN(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      {current && (
        <div
          className={`fixed z-40 border border-white/10 bg-black/90 backdrop-blur transition-all ${
            isMini ? "bottom-4 right-4 left-auto w-[90%] max-w-sm rounded-2xl shadow-[0_12px_30px_rgba(0,0,0,0.5)]" : "bottom-0 left-0 right-0 border-t"
          }`}
        >
          <div
            className={`mx-auto flex max-w-6xl flex-col items-start gap-3 px-3 py-3 text-sm sm:flex-row sm:items-center sm:gap-4 sm:px-4 ${
              isMini ? "w-full" : ""
            }`}
          >
            <div className="flex items-center gap-3 w-full sm:w-auto">
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
                    <FireButton itemType={fireButtonType} itemId={fireItemId} className="scale-90" />
                  )}
                  <button
                    onClick={async () => {
                      if (!userId || !current) {
                        setPlayError("Pro uložení do oblíbených se přihlas.");
                        return;
                      }
                      setFavLoading(true);
                      try {
                        if (isFavorite) {
                          const { error } = await supabase
                            .from("favorites")
                            .delete()
                            .eq("user_id", userId)
                            .eq("item_type", derivedItemType)
                            .eq("item_id", String(current.id));
                          if (error) throw error;
                          setIsFavorite(false);
                        } else {
                          const { error } = await supabase.from("favorites").upsert({
                            user_id: userId,
                            item_type: derivedItemType,
                            item_id: String(current.id),
                          });
                          if (error) throw error;
                          setIsFavorite(true);
                        }
                      } catch (err) {
                        console.error("favorite toggle failed", err);
                        setPlayError("Nepodařilo se uložit do oblíbených.");
                      } finally {
                        setFavLoading(false);
                      }
                    }}
                    disabled={favLoading}
                    className="text-lg leading-none"
                    title={isFavorite ? "Odebrat z oblíbených" : "Přidat do oblíbených"}
                  >
                    {isFavorite ? "★" : "☆"}
                  </button>
                </div>
                <p className="text-[11px] text-[var(--mpc-muted)]">{current.artist}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full justify-center sm:w-auto sm:justify-start">
              <button
                onClick={prev}
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
                onClick={next}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white hover:border-[var(--mpc-accent)] disabled:opacity-40"
              >
                ►
              </button>
              <button
                onClick={pause}
                className="hidden text-[11px] uppercase tracking-[0.1em] text-[var(--mpc-muted)] hover:text-white sm:inline"
              >
                Stop
              </button>
            </div>
            <div className="flex-1 min-w-[220px] w-full">
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
                <span>{formatTime(currentTime)}</span>
                <span>{duration ? formatTime(duration) : "--"}</span>
              </div>
            </div>
            {playError && <p className="text-[11px] text-red-400">{playError}</p>}
            <div className="flex flex-wrap items-center gap-3 w-full">
              <button
                onClick={toggleShuffle}
                className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.14em] ${
                  shuffle
                    ? "border-[var(--mpc-accent)] text-[var(--mpc-accent)]"
                    : "border-white/20 text-[var(--mpc-muted)] hover:border-[var(--mpc-accent)]"
                }`}
              >
                Shuffle {shuffle ? "On" : "Off"}
              </button>
              <button
                onClick={cycleRepeatMode}
                className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.14em] ${
                  repeatMode !== "off"
                    ? "border-[var(--mpc-accent)] text-[var(--mpc-accent)]"
                    : "border-white/20 text-[var(--mpc-muted)] hover:border-[var(--mpc-accent)]"
                }`}
              >
                Repeat {repeatMode === "one" ? "One" : repeatMode === "all" ? "All" : "Off"}
              </button>
              <button
                onClick={() => setQueueOpen((v) => !v)}
                className="rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--mpc-muted)] hover:border-[var(--mpc-accent)]"
              >
                Fronta ({queueList.length})
              </button>
              <button
                onClick={toggleMini}
                className="ml-auto rounded-full border border-white/20 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[var(--mpc-muted)] hover:border-[var(--mpc-accent)]"
              >
                {isMini ? "Velký přehrávač" : "Mini přehrávač"}
              </button>
            </div>
            {queueOpen && queueList.length > 0 && (
              <div className="w-full space-y-2 rounded-lg border border-white/10 bg-black/60 p-3">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--mpc-muted)]">Fronta</p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {queueList.map((item, idx) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={() => (draggingIdRef.current = item.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggingIdRef.current === null) return;
                        const fromIdx = queueList.findIndex((t) => String(t.id) === String(draggingIdRef.current));
                        const toIdx = idx;
                        draggingIdRef.current = null;
                        moveInQueue(fromIdx, toIdx);
                      }}
                      onClick={() => playFromQueue(idx)}
                      className={`flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition ${
                        current?.id === item.id
                          ? "border-[var(--mpc-accent)] bg-[var(--mpc-accent)]/10"
                          : "border-white/10 bg-white/5 hover:border-[var(--mpc-accent)]"
                      }`}
                    >
                      <div className="h-10 w-10 overflow-hidden rounded border border-white/10 bg-black/40">
                        {item.cover_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.cover_url} alt={item.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-[10px] text-[var(--mpc-muted)]">
                            {String(item.title || "?").slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-[13px] font-semibold text-white line-clamp-1">{item.title}</p>
                        <p className="text-[11px] text-[var(--mpc-muted)] line-clamp-1">{item.artist}</p>
                      </div>
                      <span className="text-[10px] text-[var(--mpc-muted)]">↕</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
