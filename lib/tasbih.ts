/** Tasbih — presets, a daily total and a lifetime total. One key. */

import { useCallback, useEffect, useState } from "react";
import { readJSON, todayKey, writeJSON } from "./storage";

export type Preset = { id: string; label: string; arabic: string; target: number; sequence?: { label: string; arabic: string; target: number }[] };

export const PRESETS: Preset[] = [
  {
    id: "after-salah",
    label: "After salah",
    arabic: "سُبْحَانَ ٱللَّٰهِ · ٱلْحَمْدُ لِلَّٰهِ · ٱللَّٰهُ أَكْبَرُ",
    target: 100,
    sequence: [
      { label: "SubhanAllah", arabic: "سُبْحَانَ ٱللَّٰهِ", target: 33 },
      { label: "Alhamdulillah", arabic: "ٱلْحَمْدُ لِلَّٰهِ", target: 33 },
      { label: "Allahu Akbar", arabic: "ٱللَّٰهُ أَكْبَرُ", target: 34 },
    ],
  },
  { id: "istighfar", label: "Astaghfirullah", arabic: "أَسْتَغْفِرُ ٱللَّٰهَ", target: 100 },
  { id: "tahlil", label: "La ilaha illallah", arabic: "لَا إِلَٰهَ إِلَّا ٱللَّٰهُ", target: 100 },
  { id: "salawat", label: "Salawat", arabic: "ٱللَّٰهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ", target: 100 },
  { id: "subhan-bihamdihi", label: "SubhanAllahi wa bihamdihi", arabic: "سُبْحَانَ ٱللَّٰهِ وَبِحَمْدِهِ", target: 100 },
  { id: "hawqala", label: "La hawla wa la quwwata", arabic: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِٱللَّٰهِ", target: 100 },
  { id: "free", label: "Free count", arabic: "", target: 0 },
];

export type TasbihState = {
  presetId: string;
  count: number; // within the current step
  step: number; // index in sequence (0 when no sequence)
  day: string;
  todayTotal: number;
  lifetime: number;
  dailyGoal: number; // 0 = none
  vibrate: boolean;
};

const KEY = "ug.tasbih.v2";
const DEFAULT: TasbihState = { presetId: "after-salah", count: 0, step: 0, day: todayKey(), todayTotal: 0, lifetime: 0, dailyGoal: 300, vibrate: true };

export function loadTasbih(): TasbihState {
  const v = { ...DEFAULT, ...readJSON<Partial<TasbihState>>(KEY, {}) };
  if (v.day !== todayKey()) return { ...v, day: todayKey(), todayTotal: 0, count: 0, step: 0 };
  return v;
}

function save(s: TasbihState) {
  writeJSON(KEY, s);
}

export function presetOf(id: string): Preset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0];
}

export function currentTarget(s: TasbihState): { label: string; arabic: string; target: number; done: boolean } {
  const p = presetOf(s.presetId);
  if (p.sequence) {
    const done = s.step >= p.sequence.length;
    const cur = done ? p.sequence[p.sequence.length - 1] : p.sequence[s.step];
    return { ...cur, done };
  }
  return { label: p.label, arabic: p.arabic, target: p.target, done: p.target > 0 && s.count >= p.target };
}

export function useTasbih() {
  const [s, setS] = useState<TasbihState>(DEFAULT);
  useEffect(() => {
    setS(loadTasbih());
  }, []);

  const commit = useCallback((next: TasbihState) => {
    setS(next);
    save(next);
  }, []);

  const tap = useCallback(() => {
    setS((cur) => {
      const p = presetOf(cur.presetId);
      const t = currentTarget(cur);
      let next: TasbihState = { ...cur, count: cur.count + 1, todayTotal: cur.todayTotal + 1, lifetime: cur.lifetime + 1 };
      if (p.sequence && next.count >= t.target) next = { ...next, count: 0, step: cur.step + 1 };
      save(next);
      if (cur.vibrate && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(p.sequence && next.step !== cur.step ? [20, 40, 20] : 8);
      return next;
    });
  }, []);

  const reset = useCallback(() => setS((cur) => (save({ ...cur, count: 0, step: 0 }), { ...cur, count: 0, step: 0 })), []);
  const choose = useCallback((id: string) => setS((cur) => (save({ ...cur, presetId: id, count: 0, step: 0 }), { ...cur, presetId: id, count: 0, step: 0 })), []);
  const setGoal = useCallback((n: number) => setS((cur) => (save({ ...cur, dailyGoal: n }), { ...cur, dailyGoal: n })), []);
  const toggleVibrate = useCallback(() => setS((cur) => (save({ ...cur, vibrate: !cur.vibrate }), { ...cur, vibrate: !cur.vibrate })), []);

  return { state: s, preset: presetOf(s.presetId), target: currentTarget(s), tap, reset, choose, setGoal, toggleVibrate, commit };
}
