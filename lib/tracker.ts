/** Prayer tracker — which of the 5 salah were prayed each day, excused days, streaks and monthly stats. localStorage, one key. */

import { useCallback, useEffect, useState } from "react";
import { SALAH, type SalahName } from "./prayer";
import { readJSON, todayKey, writeJSON } from "./storage";

export type PrayedHow = "ontime" | "jamat" | "late";
export type DayLog = Partial<Record<SalahName, PrayedHow>> & { excused?: true };
export type TrackerLog = Record<string, DayLog>; // "2026-10-18" → { Fajr: "jamat", … }

const KEY = "ug.tracker";
const EXCUSED_MODE = "ug.tracker.excusedMode";

export function loadLog(): TrackerLog {
  const v = readJSON<TrackerLog>(KEY, {});
  return v && typeof v === "object" ? v : {};
}

function save(log: TrackerLog) {
  writeJSON(KEY, log);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ug:tracker"));
}

export function setPrayed(date: string, p: SalahName, how: PrayedHow | null): TrackerLog {
  const log = loadLog();
  const day: DayLog = { ...(log[date] ?? {}) };
  if (how) day[p] = how;
  else delete day[p];
  if (Object.keys(day).length) log[date] = day;
  else delete log[date];
  save(log);
  return log;
}

export function setExcused(date: string, on: boolean): TrackerLog {
  const log = loadLog();
  const day: DayLog = { ...(log[date] ?? {}) };
  if (on) day.excused = true;
  else delete day.excused;
  if (Object.keys(day).length) log[date] = day;
  else delete log[date];
  save(log);
  return log;
}

/** Excused mode (illness, menstruation, travel…): while on, each new day is marked excused so streaks pause instead of breaking. */
export function getExcusedMode(): boolean {
  return readJSON<boolean>(EXCUSED_MODE, false) === true;
}
export function setExcusedMode(on: boolean) {
  writeJSON(EXCUSED_MODE, on);
  setExcused(todayKey(), on);
}

/** Cycle on tap: none → on time → in Jamat → late → none. */
export function nextState(cur: PrayedHow | undefined): PrayedHow | null {
  if (!cur) return "ontime";
  if (cur === "ontime") return "jamat";
  if (cur === "jamat") return "late";
  return null;
}

export const HOW_LABEL: Record<PrayedHow, string> = { ontime: "On time", jamat: "In Jamat", late: "Late" };

export function countDone(day: DayLog | undefined): number {
  if (!day) return 0;
  return SALAH.filter((p) => day[p]).length;
}

export function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number);
  return todayKey(new Date(y, m - 1, d + delta));
}

/**
 * Consecutive days with all 5 prayed, ending today (or yesterday when today isn't complete yet).
 * Excused days neither count nor break the chain.
 */
export function streak(log: TrackerLog, today = todayKey()): number {
  let day = countDone(log[today]) === 5 ? today : shiftDay(today, -1);
  let n = 0;
  let guard = 0;
  while (guard++ < 3650) {
    const d = log[day];
    if (d?.excused && countDone(d) < 5) {
      day = shiftDay(day, -1);
      continue;
    }
    if (countDone(d) !== 5) break;
    n++;
    day = shiftDay(day, -1);
  }
  return n;
}

export type MonthStats = { prayed: number; possible: number; jamat: number; fullDays: number; excusedDays: number; perPrayer: Record<SalahName, number> };

/** Stats for a calendar month (1-based), counting only days up to today. */
export function monthStats(log: TrackerLog, year: number, month: number, today = new Date()): MonthStats {
  const daysInMonth = new Date(year, month, 0).getDate();
  const isCurrent = today.getFullYear() === year && today.getMonth() + 1 === month;
  const isPast = today.getFullYear() > year || (today.getFullYear() === year && today.getMonth() + 1 > month);
  const lastDay = isCurrent ? today.getDate() : isPast ? daysInMonth : 0;
  const perPrayer = { Fajr: 0, Dhuhr: 0, Asr: 0, Maghrib: 0, Isha: 0 } as Record<SalahName, number>;
  let prayed = 0;
  let jamat = 0;
  let fullDays = 0;
  let excusedDays = 0;
  for (let d = 1; d <= lastDay; d++) {
    const key = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const day = log[key];
    if (!day) continue;
    if (day.excused) excusedDays++;
    let n = 0;
    for (const p of SALAH) {
      if (day[p]) {
        n++;
        perPrayer[p]++;
        if (day[p] === "jamat") jamat++;
      }
    }
    prayed += n;
    if (n === 5) fullDays++;
  }
  return { prayed, possible: Math.max(0, lastDay - excusedDays) * 5, jamat, fullDays, excusedDays, perPrayer };
}

export function useTracker() {
  const [log, setLog] = useState<TrackerLog>({});
  const [excusedMode, setMode] = useState(false);
  useEffect(() => {
    setLog(loadLog());
    setMode(getExcusedMode());
    const refresh = () => setLog(loadLog());
    window.addEventListener("storage", refresh);
    window.addEventListener("ug:tracker", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("ug:tracker", refresh);
    };
  }, []);
  // Excused mode marks each new day as it arrives.
  useEffect(() => {
    if (excusedMode) {
      const t = todayKey();
      if (!loadLog()[t]?.excused) setLog(setExcused(t, true));
    }
  }, [excusedMode]);
  const toggle = useCallback((date: string, p: SalahName) => {
    const cur = loadLog()[date]?.[p];
    setLog(setPrayed(date, p, nextState(cur)));
  }, []);
  const mark = useCallback((date: string, p: SalahName, how: PrayedHow | null) => setLog(setPrayed(date, p, how)), []);
  const toggleExcusedMode = useCallback(() => {
    const next = !getExcusedMode();
    setExcusedMode(next);
    setMode(next);
    setLog(loadLog());
  }, []);
  const toggleExcusedDay = useCallback((date: string) => setLog(setExcused(date, !loadLog()[date]?.excused)), []);
  return { log, toggle, mark, excusedMode, toggleExcusedMode, toggleExcusedDay };
}
