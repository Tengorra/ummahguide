/** Fasting log — Ramadan, sunnah and make-up (qada) fasts, plus fasts owed. */

import { useCallback, useEffect, useState } from "react";
import { readJSON, todayKey, writeJSON } from "./storage";

export type FastType = "ramadan" | "sunnah" | "makeup" | "missed";
export type FastLog = Record<string, { type: FastType; note?: string }>;

const LOG = "ug.fasting";
const OWED = "ug.fasting.owed"; // make-up fasts still owed, adjusted by hand or by "missed" entries

export const FAST_LABEL: Record<FastType, string> = { ramadan: "Ramadan fast", sunnah: "Sunnah fast", makeup: "Make-up (qada) fast", missed: "Missed Ramadan fast" };

export function loadFastLog(): FastLog {
  const v = readJSON<FastLog>(LOG, {});
  return v && typeof v === "object" ? v : {};
}

export function loadOwed(): number {
  const n = readJSON<number>(OWED, 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function emit() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ug:fasting"));
}

export function setFast(date: string, type: FastType | null, note?: string): void {
  const log = loadFastLog();
  const prev = log[date]?.type;
  if (type) log[date] = note ? { type, note } : { type };
  else delete log[date];
  writeJSON(LOG, log);
  // Owed count: a missed day adds one, a make-up day clears one; undoing reverses it.
  let owed = loadOwed();
  if (prev === "missed") owed = Math.max(0, owed - 1);
  if (prev === "makeup") owed += 1;
  if (type === "missed") owed += 1;
  if (type === "makeup") owed = Math.max(0, owed - 1);
  writeJSON(OWED, owed);
  emit();
}

export function setOwed(n: number): void {
  writeJSON(OWED, Math.max(0, Math.floor(n)));
  emit();
}

export function fastStats(log: FastLog, year: number): { total: number; ramadan: number; sunnah: number; makeup: number } {
  let total = 0;
  let ramadan = 0;
  let sunnah = 0;
  let makeup = 0;
  for (const [d, e] of Object.entries(log)) {
    if (!d.startsWith(String(year)) || e.type === "missed") continue;
    total++;
    if (e.type === "ramadan") ramadan++;
    else if (e.type === "sunnah") sunnah++;
    else if (e.type === "makeup") makeup++;
  }
  return { total, ramadan, sunnah, makeup };
}

export function useFasting() {
  const [log, setLog] = useState<FastLog>({});
  const [owed, setOwedState] = useState(0);
  const refresh = useCallback(() => {
    setLog(loadFastLog());
    setOwedState(loadOwed());
  }, []);
  useEffect(() => {
    refresh();
    window.addEventListener("ug:fasting", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("ug:fasting", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);
  return {
    log,
    owed,
    today: log[todayKey()] ?? null,
    mark: (date: string, type: FastType | null, note?: string) => setFast(date, type, note),
    setOwed: (n: number) => setOwed(n),
  };
}
