"use client";

import type { MouseEvent } from "react";
import { IconNext, IconPause, IconPlay, IconPrev, IconRepeat } from "./Icons";
import { fmtClock } from "@/lib/quran";

export type AudioPlayerProps = {
  reciterName: string;
  reciterInitials: string;
  verseLabel: string; // "2:255"
  currentTime: number;
  duration: number;
  playing: boolean;
  repeatSummary: string | null; // "3× each" · "loop 2:1–2:5" · null when plain
  speed: number;
  canPrev: boolean;
  canNext: boolean;
  error?: string | null;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onRepeatPress: () => void;
  onSeek?: (seconds: number) => void;
  onReciterPress?: () => void;
};

/** Floating glass player pinned above the safe area. Pure UI: the owning page holds the HTMLAudioElement. */
export default function AudioPlayer({
  reciterName,
  reciterInitials,
  verseLabel,
  currentTime,
  duration,
  playing,
  repeatSummary,
  speed,
  canPrev,
  canNext,
  error,
  onToggle,
  onPrev,
  onNext,
  onRepeatPress,
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

  const iconBtn = "flex h-10 w-10 items-center justify-center rounded-full disabled:opacity-30";
  const active = !!repeatSummary || speed !== 1;

  return (
    <div
      className="fixed bottom-[18px] left-4 right-4 z-40 mx-auto max-w-[398px] rounded-[22px] border px-3 pb-2.5 pt-3 backdrop-blur-xl"
      style={{ marginBottom: "env(safe-area-inset-bottom)", background: "color-mix(in srgb, var(--qr-bg2) 86%, transparent)", borderColor: "var(--qr-line)", color: "var(--qr-fg)", boxShadow: "0 14px 36px rgba(0,0,0,0.3)" }}
      role="region"
      aria-label="Audio player"
    >
      <div className="flex items-center gap-3">
        <button type="button" onClick={onReciterPress} aria-label={`Reciter: ${reciterName}. Change reciter`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border text-[12px] font-bold tracking-wide" style={{ borderColor: "var(--qr-accent)", color: "var(--qr-accent)" }}>
          {reciterInitials}
        </button>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-bold">{reciterName}</p>
          <p className="text-[11px]" style={{ color: "var(--qr-muted)" }} aria-live="polite">
            {error ? (
              <span style={{ color: "var(--qr-accent)" }}>{error}</span>
            ) : (
              <>
                {verseLabel} · {fmtClock(currentTime)} / {fmtClock(duration)}
              </>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <button type="button" onClick={onPrev} disabled={!canPrev} aria-label="Previous verse" className={iconBtn}>
            <IconPrev size={20} />
          </button>
          <button type="button" onClick={onToggle} aria-label={playing ? "Pause" : "Play"} className="flex h-11 w-11 items-center justify-center rounded-full active:scale-95" style={{ background: "var(--qr-accent)", color: "var(--qr-accent-fg)", boxShadow: "0 6px 18px color-mix(in srgb, var(--qr-accent) 35%, transparent)" }}>
            {playing ? <IconPause size={20} /> : <IconPlay size={22} />}
          </button>
          <button type="button" onClick={onNext} disabled={!canNext} aria-label="Next verse" className={iconBtn}>
            <IconNext size={20} />
          </button>
        </div>
      </div>

      <div className="mt-2.5 h-[3px] w-full cursor-pointer overflow-hidden rounded-full" style={{ background: "var(--qr-line)" }} role="progressbar" aria-label="Playback progress" aria-valuemin={0} aria-valuemax={Math.round(duration) || 0} aria-valuenow={Math.round(currentTime) || 0} aria-valuetext={`${fmtClock(currentTime)} of ${fmtClock(duration)}`} onClick={seek}>
        <div className="h-full rounded-full transition-[width] duration-150 ease-linear" style={{ width: `${progress}%`, background: "var(--qr-accent)" }} />
      </div>

      <div className="mt-1.5 flex items-center justify-between">
        <button type="button" onClick={onRepeatPress} aria-label="Repeat and speed settings" className="flex h-8 items-center gap-1.5 rounded-full px-2 text-[11px] font-bold" style={{ color: active ? "var(--qr-accent)" : "var(--qr-muted)" }}>
          <IconRepeat size={15} />
          {repeatSummary ?? "Repeat"}
        </button>
        <button type="button" onClick={onRepeatPress} aria-label={`Playback speed ${speed}x, tap to change`} className="flex h-8 items-center rounded-full px-2 text-[11px] font-bold tabular-nums" style={{ color: speed !== 1 ? "var(--qr-accent)" : "var(--qr-muted)" }}>
          {speed}×
        </button>
      </div>
    </div>
  );
}
