/** Quran habits — daily reading log, goal, streak and khatam plan. localStorage; synced to the account in a later batch. */

import { useCallback, useEffect, useState } from "react";
import { readJSON, todayKey, writeJSON } from "./storage";
import { shiftDay } from "./tracker";

export type DayRead = { verses: string[]; pages: number[]; seconds: number };
export type ReadLog = Record<string, DayRead>;

export type GoalType = "verses" | "pages" | "minutes";
export type Goal = { type: GoalType; target: number };
export type Khatam = { start: string; end: string; createdAt: string; pagesDone: number[] }; // pagesDone = unique pages read since start

const LOG = "ug.quran.log";
const GOAL = "ug.quran.goal";
const KHATAM = "ug.quran.khatam";
const TOTAL_PAGES = 604;

export const GOAL_PRESETS: { type: GoalType; target: number; label: string }[] = [
  { type: "verses", target: 10, label: "10 verses a day" },
  { type: "verses", target: 25, label: "25 verses a day" },
  { type: "pages", target: 1, label: "1 page a day" },
  { type: "pages", target: 4, label: "4 pages a day" },
  { type: "pages", target: 20, label: "1 juz a day" },
  { type: "minutes", target: 5, label: "5 minutes a day" },
  { type: "minutes", target: 15, label: "15 minutes a day" },
];

function emit() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ug:quran-habits"));
}

export function loadLog(): ReadLog {
  const v = readJSON<ReadLog>(LOG, {});
  return v && typeof v === "object" ? v : {};
}

/** Keep the last 400 days so storage stays small. */
function prune(log: ReadLog): ReadLog {
  const keys = Object.keys(log).sort();
  while (keys.length > 400) delete log[keys.shift()!];
  return log;
}

/** Record verses as read today (deduped) with their mushaf pages. */
export function logRead(verseKeys: string[], pages: number[]): void {
  if (!verseKeys.length) return;
  const log = loadLog();
  const t = todayKey();
  const day = log[t] ?? { verses: [], pages: [], seconds: 0 };
  const vs = new Set(day.verses);
  const ps = new Set(day.pages);
  let changed = false;
  for (const k of verseKeys) {
    if (!vs.has(k)) {
      vs.add(k);
      changed = true;
    }
  }
  for (const p of pages) {
    if (p > 0 && !ps.has(p)) {
      ps.add(p);
      changed = true;
    }
  }
  if (!changed) return;
  day.verses = Array.from(vs);
  day.pages = Array.from(ps);
  log[t] = day;
  writeJSON(LOG, prune(log));
  // Khatam progress follows the page log.
  const k = loadKhatam();
  if (k && t >= k.start) {
    const done = new Set(k.pagesDone);
    for (const p of pages) if (p > 0) done.add(p);
    if (done.size !== k.pagesDone.length) saveKhatam({ ...k, pagesDone: Array.from(done) });
  }
  emit();
}

export function logSeconds(seconds: number): void {
  if (seconds <= 0) return;
  const log = loadLog();
  const t = todayKey();
  const day = log[t] ?? { verses: [], pages: [], seconds: 0 };
  day.seconds += seconds;
  log[t] = day;
  writeJSON(LOG, prune(log));
  emit();
}

export function loadGoal(): Goal | null {
  const g = readJSON<Goal | null>(GOAL, null);
  return g && typeof g.target === "number" && g.target > 0 ? g : null;
}
export function saveGoal(g: Goal | null): void {
  writeJSON(GOAL, g);
  emit();
}

export function loadKhatam(): Khatam | null {
  const k = readJSON<Khatam | null>(KHATAM, null);
  return k && k.start && k.end ? { ...k, pagesDone: Array.isArray(k.pagesDone) ? k.pagesDone : [] } : null;
}
export function saveKhatam(k: Khatam | null): void {
  writeJSON(KHATAM, k);
  emit();
}

export function dayProgress(day: DayRead | undefined, goal: Goal | null): { value: number; target: number; done: boolean; label: string } {
  const verses = day?.verses.length ?? 0;
  const pages = day?.pages.length ?? 0;
  const minutes = Math.floor((day?.seconds ?? 0) / 60);
  if (!goal) return { value: verses, target: 0, done: false, label: verses === 1 ? "1 verse today" : `${verses} verses today` };
  const value = goal.type === "verses" ? verses : goal.type === "pages" ? pages : minutes;
  return { value, target: goal.target, done: value >= goal.target, label: `${value}/${goal.target} ${goal.type}` };
}

/** Consecutive days with at least one verse read, ending today or yesterday. */
export function readingStreak(log: ReadLog, today = todayKey()): number {
  const readOn = (d: string) => (log[d]?.verses.length ?? 0) > 0;
  let day = readOn(today) ? today : shiftDay(today, -1);
  let n = 0;
  while (readOn(day) && n < 3650) {
    n++;
    day = shiftDay(day, -1);
  }
  return n;
}

export function khatamStatus(k: Khatam, today = todayKey()): { pagesDone: number; pagesLeft: number; daysLeft: number; perDay: number; pct: number; behind: boolean } {
  const pagesDone = k.pagesDone.length;
  const pagesLeft = Math.max(0, TOTAL_PAGES - pagesDone);
  const [y, m, d] = k.end.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  const daysLeft = Math.max(1, Math.round((new Date(y, m - 1, d).getTime() - new Date(ty, tm - 1, td).getTime()) / 86400000) + 1);
  const perDay = Math.ceil(pagesLeft / daysLeft);
  const [sy, sm, sd] = k.start.split("-").map(Number);
  const totalDays = Math.max(1, Math.round((new Date(y, m - 1, d).getTime() - new Date(sy, sm - 1, sd).getTime()) / 86400000) + 1);
  const elapsed = totalDays - daysLeft;
  const expected = (TOTAL_PAGES / totalDays) * elapsed;
  return { pagesDone, pagesLeft, daysLeft, perDay, pct: pagesDone / TOTAL_PAGES, behind: pagesDone < expected - 2 };
}

/** Next mushaf page to read for a khatam: the lowest page not yet done. */
export function khatamNextPage(k: Khatam): number {
  const done = new Set(k.pagesDone);
  for (let p = 1; p <= TOTAL_PAGES; p++) if (!done.has(p)) return p;
  return TOTAL_PAGES;
}

export function useQuranHabits() {
  const [log, setLog] = useState<ReadLog>({});
  const [goal, setGoalState] = useState<Goal | null>(null);
  const [khatam, setKhatamState] = useState<Khatam | null>(null);
  const refresh = useCallback(() => {
    setLog(loadLog());
    setGoalState(loadGoal());
    setKhatamState(loadKhatam());
  }, []);
  useEffect(() => {
    refresh();
    window.addEventListener("ug:quran-habits", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("ug:quran-habits", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);
  const today = log[todayKey()];
  return {
    log,
    goal,
    khatam,
    today,
    progress: dayProgress(today, goal),
    streak: readingStreak(log),
    setGoal: (g: Goal | null) => saveGoal(g),
    setKhatam: (k: Khatam | null) => saveKhatam(k),
  };
}
