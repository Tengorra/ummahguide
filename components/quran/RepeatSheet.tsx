"use client";

import { useEffect } from "react";
import { IconClose } from "@/components/Icons";
import type { Verse } from "@/lib/quran";

export type RepeatSettings = {
  each: number; // times to play every verse: 1, 2, 3, 5, or Infinity
  range: { from: number; to: number } | null; // verse ids (not numbers) — loop this stretch forever
  speed: number;
};

export const REPEAT_EACH = [1, 2, 3, 5, Infinity] as const;
export const SPEEDS = [0.75, 1, 1.25, 1.5] as const;

export default function RepeatSheet({
  value,
  verses,
  currentId,
  onChange,
  onClose,
}: {
  value: RepeatSettings;
  verses: Verse[];
  currentId: number;
  onChange: (patch: Partial<RepeatSettings>) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const label = (v: Verse) => `${v.verse_key}`;
  const from = value.range?.from ?? currentId;
  const to = value.range?.to ?? currentId;
  const pill = (active: boolean) => (active ? { background: "var(--qr-accent)", color: "var(--qr-accent-fg)" } : { color: "var(--qr-muted)" });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div role="dialog" aria-modal="true" aria-label="Repeat and speed" className="relative w-full max-w-[430px] rounded-t-[28px] px-5 pt-3 shadow-sheet" style={{ background: "var(--qr-bg)", color: "var(--qr-fg)", paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}>
        <div className="mx-auto h-1 w-10 rounded-full" style={{ background: "var(--qr-line)" }} />
        <div className="mt-3 flex items-center justify-between">
          <h2 className="font-display text-[20px] font-medium">Repeat & speed</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--qr-bg2)" }}>
            <IconClose size={18} />
          </button>
        </div>

        <p className="label mt-5" style={{ color: "var(--qr-muted)" }}>
          Play each verse
        </p>
        <div className="mt-2 grid grid-cols-5 gap-1 rounded-2xl p-1" style={{ background: "var(--qr-bg2)" }}>
          {REPEAT_EACH.map((n) => (
            <button key={n} type="button" aria-pressed={value.each === n} onClick={() => onChange({ each: n })} className="h-10 rounded-xl text-[13px] font-bold" style={pill(value.each === n)}>
              {n === Infinity ? "∞" : `${n}×`}
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <p className="label" style={{ color: "var(--qr-muted)" }}>
            Loop a range
          </p>
          {value.range && (
            <button type="button" onClick={() => onChange({ range: null })} className="text-[12px] font-bold" style={{ color: "var(--qr-accent)" }}>
              Clear
            </button>
          )}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {(
            [
              ["From", from, (id: number) => onChange({ range: { from: id, to: Math.max(id, to) } })],
              ["To", to, (id: number) => onChange({ range: { from: Math.min(from, id), to: id } })],
            ] as const
          ).map(([lbl, val, set]) => (
            <label key={lbl} className="flex flex-col gap-1 text-[12px] font-semibold" style={{ color: "var(--qr-muted)" }}>
              {lbl}
              <select value={val} onChange={(e) => set(Number(e.target.value))} className="h-11 rounded-xl border px-3 text-[14px] font-bold outline-none" style={{ background: "var(--qr-bg2)", color: "var(--qr-fg)", borderColor: "var(--qr-line)" }}>
                {verses.map((v) => (
                  <option key={v.id} value={v.id}>
                    {label(v)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-[12px]" style={{ color: "var(--qr-muted)" }}>
          {value.range ? `Looping ${verses.find((v) => v.id === value.range!.from)?.verse_key} – ${verses.find((v) => v.id === value.range!.to)?.verse_key} until you stop.` : "Pick a from/to to memorise a passage on repeat."}
        </p>

        <p className="label mt-5" style={{ color: "var(--qr-muted)" }}>
          Speed
        </p>
        <div className="mt-2 grid grid-cols-4 gap-1 rounded-2xl p-1" style={{ background: "var(--qr-bg2)" }}>
          {SPEEDS.map((s) => (
            <button key={s} type="button" aria-pressed={value.speed === s} onClick={() => onChange({ speed: s })} className="h-10 rounded-xl text-[13px] font-bold tabular-nums" style={pill(value.speed === s)}>
              {s}×
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
