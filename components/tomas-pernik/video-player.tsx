"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, Play, Volume1, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

function CustomSlider({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  return (
    <motion.div
      className={cn("relative h-1 w-full cursor-pointer rounded-full bg-white/20", className)}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = (x / rect.width) * 100;
        onChange(Math.min(Math.max(percentage, 0), 100));
      }}
    >
      <motion.div
        className="absolute left-0 top-0 h-full rounded-full bg-white"
        style={{ width: `${value}%` }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    </motion.div>
  );
}

type VideoPlayerProps = {
  src: string;
  poster?: string;
  title?: string;
};

export default function VideoPlayer({ src, poster, title = "Kampaňové video" }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideControlsRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(pointer: coarse)");
    const sync = () => {
      setIsTouchDevice(media.matches);
      setShowControls(media.matches);
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const queueHideControls = () => {
    if (isTouchDevice || !isPlaying) return;
    if (hideControlsRef.current) window.clearTimeout(hideControlsRef.current);
    hideControlsRef.current = window.setTimeout(() => setShowControls(false), 1800);
  };

  const revealControls = () => {
    if (hideControlsRef.current) window.clearTimeout(hideControlsRef.current);
    setShowControls(true);
    queueHideControls();
  };

  const togglePlay = () => {
    if (!videoRef.current || hasError) return;
    if (videoRef.current.paused) {
      void videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
    revealControls();
  };

  const handleVolumeChange = (value: number) => {
    if (!videoRef.current) return;
    const nextVolume = value / 100;
    videoRef.current.volume = nextVolume;
    videoRef.current.muted = nextVolume === 0;
    setVolume(nextVolume);
    setIsMuted(nextVolume === 0);
    revealControls();
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const nextProgress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
    setProgress(Number.isFinite(nextProgress) ? nextProgress : 0);
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleSeek = (value: number) => {
    if (!videoRef.current || !videoRef.current.duration) return;
    const nextTime = (value / 100) * videoRef.current.duration;
    if (!Number.isFinite(nextTime)) return;
    videoRef.current.currentTime = nextTime;
    setProgress(value);
    revealControls();
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && videoRef.current.volume === 0) {
      videoRef.current.volume = 1;
      setVolume(1);
    }
    if (nextMuted) setVolume(0);
    revealControls();
  };

  const setSpeed = (speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
    revealControls();
  };

  return (
    <motion.div
      className="relative mx-auto w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/20 bg-[#11111198] shadow-[0_24px_80px_rgba(3,78,162,0.18)] backdrop-blur-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onMouseEnter={() => {
        if (!isTouchDevice) setShowControls(true);
      }}
      onMouseMove={revealControls}
      onMouseLeave={() => {
        if (!isTouchDevice && isPlaying) setShowControls(false);
      }}
    >
      <video
        ref={videoRef}
        className="aspect-video w-full bg-slate-900 object-cover"
        src={src}
        poster={poster}
        preload="metadata"
        playsInline
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => {
          if (!videoRef.current) return;
          setDuration(videoRef.current.duration || 0);
          setHasError(false);
        }}
        onPlay={() => {
          setIsPlaying(true);
          queueHideControls();
        }}
        onPause={() => {
          setIsPlaying(false);
          setShowControls(true);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setShowControls(true);
        }}
        onError={() => {
          setHasError(true);
          setIsPlaying(false);
          setShowControls(true);
        }}
      />

      {hasError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950/62 p-6 text-center">
          <div className="max-w-md rounded-3xl border border-white/15 bg-slate-950/70 px-5 py-4 text-white backdrop-blur-md">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">Video box</p>
            <p className="mt-3 text-base font-medium">{title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Doplňte video soubor do <code className="rounded bg-white/10 px-1.5 py-0.5">public/tomas-pernik/kampan.mp4</code>
              a přehrávač se zobrazí rovnou s tímto designem.
            </p>
          </div>
        </div>
      ) : null}

      <AnimatePresence>
        {showControls && !hasError ? (
          <motion.div
            className="absolute inset-x-3 bottom-3 rounded-[24px] bg-[#111111c7] p-3 backdrop-blur-md sm:inset-x-4 sm:bottom-4 sm:p-4"
            initial={{ y: 20, opacity: 0, filter: "blur(10px)" }}
            animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
            exit={{ y: 20, opacity: 0, filter: "blur(10px)" }}
            transition={{ duration: 0.45, ease: "circInOut", type: "spring" }}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs text-white sm:text-sm">{formatTime(currentTime)}</span>
              <CustomSlider value={progress} onChange={handleSeek} className="flex-1" />
              <span className="text-xs text-white sm:text-sm">{formatTime(duration)}</span>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center justify-between gap-3 sm:justify-start sm:gap-4">
                <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
                  <Button
                    onClick={togglePlay}
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 rounded-full text-white hover:bg-[#111111d1] hover:text-white"
                  >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  </Button>
                </motion.div>

                <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}>
                    <Button
                      onClick={toggleMute}
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-full text-white hover:bg-[#111111d1] hover:text-white"
                    >
                      {isMuted ? (
                        <VolumeX className="h-5 w-5" />
                      ) : volume > 0.5 ? (
                        <Volume2 className="h-5 w-5" />
                      ) : (
                        <Volume1 className="h-5 w-5" />
                      )}
                    </Button>
                  </motion.div>
                  <div className="w-20 sm:w-24">
                    <CustomSlider value={volume * 100} onChange={handleVolumeChange} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2 sm:flex sm:items-center">
                {[0.5, 1, 1.5, 2].map((speed) => (
                  <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }} key={speed}>
                    <Button
                      onClick={() => setSpeed(speed)}
                      variant="ghost"
                      className={cn(
                        "h-9 min-w-[3.25rem] rounded-full px-3 text-white hover:bg-[#111111d1] hover:text-white",
                        playbackSpeed === speed && "bg-[#111111d1]",
                      )}
                    >
                      {speed}x
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
