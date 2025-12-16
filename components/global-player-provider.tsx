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
  item_type?: 'beat' | 'project' | 'collab' | 'acapella';
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
  const onEndedRef = useRef<(() => void) | null>(null);
  const onNextRef = useRef<(() => void) | null>(null);
  const onPrevRef = useRef<(() => void) | null>(null);
  const resumeAtRef = useRef<number | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

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
      // případné obnovení pozice
      if (resumeAtRef.current && el.duration && resumeAtRef.current < el.duration) {
        el.currentTime = resumeAtRef.current;
        setCurrentTime(resumeAtRef.current);
        resumeAtRef.current = null;
      }
    };
    const onEnd = () => {
      setIsPlaying(false);
      if (onEndedRef.current) {
        onEndedRef.current();
        return;
      }
      // Fallback: pokud není explicitně nastaveno onEnded, zkuste next
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

  const derivedItemType =
    current?.item_type ||
    (typeof current?.id === "string" && String(current.id).startsWith("project-") ? "project" : "beat");
  const fireItemId = current ? String(current.id) : null;

  // načtení oblíbených + progress při změně tracku
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
        // záznam do historie
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

  // průběžný sync progress
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
    // uložíme hned a pak v intervalu
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
    () => ({ current, isPlaying, currentTime, duration, play, toggle, pause, seek, setOnEnded, setOnNext, setOnPrev }),
    [current, isPlaying, currentTime, duration, play, toggle, pause, seek, setOnEnded, setOnNext, setOnPrev]
  );
  const fireItemId = current ? String(current.id) : null;
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
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/85 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 px-3 py-3 text-sm sm:flex-row sm:items-center sm:gap-4 sm:px-4">
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
                    <FireButton itemType={derivedItemType} itemId={fireItemId} className="scale-90" />
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
          </div>
        </div>
      )}
    </Ctx.Provider>
  );
}
