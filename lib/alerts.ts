/** Per-prayer alert preferences: azan at the time + an optional reminder N minutes before. */

import { useCallback, useEffect, useState } from "react";
import { SALAH, type SalahName } from "./prayer";
import { readJSON, writeJSON } from "./storage";

export type LeadMin = 0 | 5 | 10 | 15 | 30;
export const LEAD_OPTIONS: LeadMin[] = [0, 5, 10, 15, 30];

export type PrayerAlert = { azan: boolean; before: LeadMin };
export type Alerts = Record<SalahName, PrayerAlert>;

const KEY = "ug.alerts";
const LEGACY = "ug.azan"; // older builds stored only the azan toggles here

const DEFAULT: Alerts = {
  Fajr: { azan: true, before: 0 },
  Dhuhr: { azan: true, before: 0 },
  Asr: { azan: true, before: 0 },
  Maghrib: { azan: true, before: 0 },
  Isha: { azan: true, before: 0 },
};

export function loadAlerts(): Alerts {
  const v = readJSON<Partial<Alerts> | null>(KEY, null);
  if (v) return { ...DEFAULT, ...v };
  const legacy = readJSON<Partial<Record<SalahName, boolean>> | null>(LEGACY, null);
  if (!legacy) return DEFAULT;
  const out = { ...DEFAULT };
  for (const p of SALAH) out[p] = { azan: legacy[p] !== false, before: 0 };
  return out;
}

export function saveAlerts(a: Alerts) {
  writeJSON(KEY, a);
  // keep the legacy key in step so older screens (Settings) stay correct
  writeJSON(LEGACY, Object.fromEntries(SALAH.map((p) => [p, a[p].azan])));
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ug:alerts", { detail: a }));
}

export function useAlerts() {
  const [alerts, setState] = useState<Alerts>(DEFAULT);
  useEffect(() => {
    setState(loadAlerts());
    const on = (e: Event) => setState((e as CustomEvent<Alerts>).detail);
    window.addEventListener("ug:alerts", on);
    return () => window.removeEventListener("ug:alerts", on);
  }, []);
  const update = useCallback((p: SalahName, patch: Partial<PrayerAlert>) => {
    const next = { ...loadAlerts() };
    next[p] = { ...next[p], ...patch };
    saveAlerts(next);
    setState(next);
  }, []);
  return { alerts, update };
}

export function alertSummary(a: PrayerAlert): string {
  if (!a.azan && !a.before) return "Off";
  const parts: string[] = [];
  if (a.azan) parts.push("Azan");
  if (a.before) parts.push(`${a.before} min before`);
  return parts.join(" · ");
}
