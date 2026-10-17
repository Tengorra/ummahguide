"use client";

import { useEffect, useState } from "react";
import { readJSON, todayKey, writeJSON } from "@/lib/storage";

const SET = [
  { label: "SubhanAllah", target: 33 },
  { label: "Alhamdulillah", target: 33 },
  { label: "Allahu Akbar", target: 34 },
];

type State = { day: string; step: number; count: number };

/** Tap-to-count tasbeeh tile: 33 · 33 · 34, remembered for today. */
export default function TasbeehCard() {
  const [s, setS] = useState<State>({ day: todayKey(), step: 0, count: 0 });

  useEffect(() => {
    const saved = readJSON<State>("ug.tasbeeh", { day: todayKey(), step: 0, count: 0 });
    setS(saved.day === todayKey() ? saved : { day: todayKey(), step: 0, count: 0 });
  }, []);

  const done = s.step >= SET.length;
  const cur = done ? SET[SET.length - 1] : SET[s.step];
  const pct = done ? 1 : s.count / cur.target;

  function tap() {
    if (done) {
      const reset = { day: todayKey(), step: 0, count: 0 };
      setS(reset);
      writeJSON("ug.tasbeeh", reset);
      return;
    }
    let next: State = { ...s, count: s.count + 1 };
    if (next.count >= cur.target) next = { day: s.day, step: s.step + 1, count: 0 };
    setS(next);
    writeJSON("ug.tasbeeh", next);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
  }

  const r = 15;
  const circ = 2 * Math.PI * r;

  return (
    <button
      type="button"
      onClick={tap}
      aria-label={done ? "Tasbeeh complete, tap to restart" : `${cur.label} ${s.count} of ${cur.target}, tap to count`}
      className="card flex flex-col items-center justify-between gap-1 px-1 py-2.5 text-center active:scale-[0.97]"
    >
      <svg width="34" height="34" viewBox="0 0 36 36" aria-hidden="true">
        <circle cx="18" cy="18" r={r} fill="none" stroke="#E3EFEA" strokeWidth="4" />
        <circle cx="18" cy="18" r={r} fill="none" stroke="#C9A44C" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${circ * pct} ${circ}`} transform="rotate(-90 18 18)" />
        <text x="18" y="22" textAnchor="middle" fontSize="11" fontWeight="700" fill="#0B3D33">
          {done ? "✓" : s.count}
        </text>
      </svg>
      <span className="max-w-full truncate text-[10px] font-bold text-ink">{done ? "Done" : cur.label}</span>
      <span className="text-[9px] font-semibold text-muted">{done ? "tap to restart" : `${s.count} / ${cur.target}`}</span>
    </button>
  );
}
