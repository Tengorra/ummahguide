"use client";

import { useEffect, useState } from "react";
import { readJSON, todayKey, writeJSON } from "@/lib/storage";

const SET = [
  { label: "SubhanAllah", target: 33 },
  { label: "Alhamdulillah", target: 33 },
  { label: "Allahu Akbar", target: 34 },
];

type State = { day: string; step: number; count: number };

/** Tap-to-count tasbeeh: 33 · 33 · 34, remembered for today. */
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

  const r = 18;
  const circ = 2 * Math.PI * r;

  return (
    <button
      type="button"
      onClick={tap}
      aria-label={done ? "Tasbeeh complete, tap to restart" : `${cur.label} ${s.count} of ${cur.target}, tap to count`}
      className="card flex flex-col gap-2.5 p-4 text-left active:scale-[0.98]"
    >
      <div className="flex items-center justify-between">
        <span className="label">Tasbeeh</span>
        <svg width="40" height="40" viewBox="0 0 44 44" aria-hidden="true">
          <circle cx="22" cy="22" r={r} fill="none" stroke="#E3EFEA" strokeWidth="5" />
          <circle
            cx="22"
            cy="22"
            r={r}
            fill="none"
            stroke="#C9A44C"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${circ * pct} ${circ}`}
            transform="rotate(-90 22 22)"
          />
        </svg>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="font-display text-[24px] font-medium leading-none">
          {done ? "Done" : s.count}{" "}
          {!done && <span className="text-[16px] text-muted">/ {cur.target}</span>}
        </span>
        <span className="text-[12px] text-muted">{done ? "Alhamdulillah · tap to restart" : `${cur.label} · tap to count`}</span>
      </div>
    </button>
  );
}
