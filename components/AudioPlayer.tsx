"use client";

import type { MouseEvent } from "react";
import { IconNext, IconPause, IconPlay, IconPrev, IconRepeat } from "./Icons";
import { fmtClock } from "@/lib/quran";

export type AudioPlayerProps = {
  reciterName: string;
  reciterInitials: string;
  verseNumber: number;
  currentTime: number;
  duration: number;
  playing: boolean;
  repeat: boolean;
  speed: number;
  canPrev: boolean;
  canNext: boolean;
  error?: string | null;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleRepeat: () => void;
  onToggleSpeed: () => void;
  onSeek?: (seconds: number) => void;
  onReciterPress?: () => void;
};

/** Floating glass player pinned above the safe area. Pure UI: the owning page holds the HTMLAudioElement. */
export default function AudioPlayer({
  reciterName,
  reciterInitials,
  verseNumber,
  currentTime,
  duration,
  playing,
  repeat,
  speed,
  canPrev,
  canNext,
  error,
  onToggle,
  onPrev,
  onNext,
  onToggleRepeat,
  onToggleSpeed,
  onSeek,
  onReciterPress,
}: AudioPlayerProps) {
  const progress = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const seek = (e: MouseEvent<HTMLDivElement>) => {
    if (!onSeek || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    onSeek(frac * duration);
  };

  const iconBtn = "flex h-10 w-10 items-center justify-center rounded-full text-ivory/85 active:bg-white/10 disabled:opacity-30";

  return (
    <div
      className="glass-dark fixed bottom-[18px] left-4 right-4 z-40 mx-auto max-w-[398px] rounded-[22px] px-3 pb-2.5 pt-3 shadow-[0_14px_36px_rgba(0,0,0,0.4)]"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      role="region"
      aria-label="Audio player"
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onReciterPress}
          aria-label={`Reciter: ${reciterName}. Change reciter`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-gold-500/70 bg-em-900 text-[12px] font-bold tracking-wide text-gold-200"
        >
          {reciterInitials}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold text-ivory">{reciterName}</p>
          <p className="text-[11px] text-ivory/55" aria-live="polite">
            {error ? (
              <span className="text-gold-200">{error}</span>
            ) : (
              <>
                Verse {verseNumber} · {fmtClock(currentTime)} / {fmtClock(duration)}
              </>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button type="button" onClick={onPrev} disabled={!canPrev} aria-label="Previous verse" className={iconBtn}>
            <IconPrev size={20} />
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-label={playing ? "Pause" : "Play"}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-500 text-night shadow-[0_6px_18px_rgba(201,164,76,0.35)] active:scale-95"
          >
            {playing ? <IconPause size={20} /> : <IconPlay size={22} />}
          </button>
          <button type="button" onClick={onNext} disabled={!canNext} aria-label="Next verse" className={iconBtn}>
            <IconNext size={20} />
          </button>
        </div>
      </div>

      <div
        className="mt-2.5 h-[3px] w-full cursor-pointer overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-label="Playback progress"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration) || 0}
        aria-valuenow={Math.round(currentTime) || 0}
        aria-valuetext={`${fmtClock(currentTime)} of ${fmtClock(duration)}`}
        onClick={seek}
      >
        <div className="h-full rounded-full bg-gold-500 transition-[width] duration-150 ease-linear" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-1.5 flex items-center justify-between">
        <button
          type="button"
          onClick={onToggleRepeat}
          aria-pressed={repeat}
          aria-label="Repeat verse"
          className={`flex h-8 items-center gap-1.5 rounded-full px-2 text-[11px] font-bold ${repeat ? "text-gold-500" : "text-ivory/55"}`}
        >
          <IconRepeat size={15} />
          Repeat
        </button>
        <button
          type="button"
          onClick={onToggleSpeed}
          aria-label={`Playback speed ${speed === 1 ? "1.0" : speed.toFixed(2)}x, tap to change`}
          className={`flex h-8 items-center rounded-full px-2 text-[11px] font-bold tabular-nums ${speed !== 1 ? "text-gold-500" : "text-ivory/55"}`}
        >
          {speed === 1 ? "1.0×" : `${speed.toFixed(2)}×`}
        </button>
      </div>
    </div>
  );
}
