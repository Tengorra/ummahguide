/** Duas & adhkar — bundled JSON (MIT, see data/dua/LICENSE.txt) plus per-day completion state. */

import { readJSON, todayKey, writeJSON } from "./storage";

export type DuaCategory = { slug: string; name: string; sub: string; count: number };

export type Dua = {
  id: string;
  title: string;
  arabic: string;
  latin: string;
  translation: string;
  notes: string;
  benefit: string;
  source: string;
  repeat: number;
};

export const DUA_CATEGORIES: DuaCategory[] = [
  { slug: "morning-dhikr", name: "Morning adhkar", sub: "After Fajr until sunrise", count: 19 },
  { slug: "evening-dhikr", name: "Evening adhkar", sub: "After Asr until Maghrib", count: 19 },
  { slug: "dhikr-after-salah", name: "After every salah", sub: "Straight after the tasleem", count: 13 },
  { slug: "daily-dua", name: "Daily duas", sub: "Waking, eating, travelling, sleeping…", count: 38 },
  { slug: "selected-dua", name: "Selected duas", sub: "From the Quran and Sunnah", count: 8 },
];

const loaders: Record<string, () => Promise<{ default: Dua[] }>> = {
  "morning-dhikr": () => import("@/data/dua/morning-dhikr.json"),
  "evening-dhikr": () => import("@/data/dua/evening-dhikr.json"),
  "dhikr-after-salah": () => import("@/data/dua/dhikr-after-salah.json"),
  "daily-dua": () => import("@/data/dua/daily-dua.json"),
  "selected-dua": () => import("@/data/dua/selected-dua.json"),
};

export function categoryOf(slug: string): DuaCategory | undefined {
  return DUA_CATEGORIES.find((c) => c.slug === slug);
}

/** Loads one category (code-split so the Quran/Prayer tabs never pay for it). */
export async function loadDuas(slug: string): Promise<Dua[]> {
  const load = loaders[slug];
  if (!load) throw new Error("Unknown dua category");
  return (await load()).default;
}

/** Which adhkar set fits the current hour: morning until noon, evening after Asr-ish, otherwise none. */
export function suggestedAdhkar(now = new Date()): "morning-dhikr" | "evening-dhikr" {
  const h = now.getHours();
  return h < 12 ? "morning-dhikr" : "evening-dhikr";
}

/* ---------- Per-day progress (counts per dua, reset daily) ---------- */

type DayProgress = { date: string; counts: Record<string, number> };
const KEY = "ug.dua.progress";

function load(): DayProgress {
  const v = readJSON<DayProgress | null>(KEY, null);
  const t = todayKey();
  return v && v.date === t && v.counts ? v : { date: t, counts: {} };
}

export function getDuaCounts(): Record<string, number> {
  return load().counts;
}

export function bumpDuaCount(id: string, target: number): Record<string, number> {
  const p = load();
  const cur = p.counts[id] ?? 0;
  p.counts[id] = cur >= target ? 0 : cur + 1; // tap past the target resets, like a tasbih
  writeJSON(KEY, p);
  return p.counts;
}

export function resetDuaCounts(slug: string): Record<string, number> {
  const p = load();
  for (const k of Object.keys(p.counts)) if (k.startsWith(slug + "-")) delete p.counts[k];
  writeJSON(KEY, p);
  return p.counts;
}

export function categoryDone(slug: string, duas: Dua[], counts: Record<string, number>): number {
  if (!duas.length) return 0;
  const done = duas.filter((d) => (counts[d.id] ?? 0) >= d.repeat).length;
  return done / duas.length;
}
