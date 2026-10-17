"use client";

import { useEffect, useState } from "react";
import { readJSON, writeJSON } from "./storage";
import { addMinutes, timeToDate, type SalahName, type Timings, SALAH } from "./prayer";

/**
 * Jamat (congregation) times for a masjid.
 *
 * Two sources:
 *  - PUBLISHED: a masjid admin set them (Verified). Stored per masjid.
 *  - ESTIMATED: calculated adhan + a default offset, shown clearly as an estimate.
 *
 * Storage is localStorage today behind a small interface, so swapping to Supabase
 * later means replacing loadPublished/savePublished only.
 */

export type MaghribMode = "offset" | "fixed";
export type Published = {
  masjidId: string;
  masjidName: string;
  times: Record<SalahName, string>; // "HH:MM"; for Maghrib in offset mode this is ignored
  maghribMode: MaghribMode;
  maghribOffset: number; // minutes after adhan when maghribMode === "offset"
  jumuah: string[]; // ["13:15", "14:15"]
  scope: "today" | "week" | "until-changed";
  updatedAt: string; // ISO
  verified: true;
};

export const DEFAULT_OFFSETS: Record<SalahName, number> = { Fajr: 20, Dhuhr: 15, Asr: 15, Maghrib: 5, Isha: 15 };

const key = (id: string) => `ug.jamat.${id}`;

export function loadPublished(masjidId: string): Published | null {
  const p = readJSON<Published | null>(key(masjidId), null);
  if (!p) return null;
  // Expire narrow scopes.
  const ageDays = (Date.now() - new Date(p.updatedAt).getTime()) / 86400000;
  if (p.scope === "today" && ageDays > 1) return null;
  if (p.scope === "week" && ageDays > 7) return null;
  return p;
}

export function savePublished(p: Published) {
  writeJSON(key(p.masjidId), p);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ug:jamat", { detail: p.masjidId }));
}

export type JamatRow = { prayer: SalahName; adhan: string; jamat: string; source: "published" | "estimated" };
export type JamatDay = { rows: JamatRow[]; jumuah: string[]; verified: boolean; updatedAt?: string };

/** Build today's Adhan vs Jamat table for a masjid. */
export function buildJamatDay(timings: Timings, published: Published | null): JamatDay {
  const rows: JamatRow[] = SALAH.map((p) => {
    const adhan = timings[p];
    if (published) {
      if (p === "Maghrib" && published.maghribMode === "offset") {
        return { prayer: p, adhan, jamat: addMinutes(adhan, published.maghribOffset), source: "published" };
      }
      return { prayer: p, adhan, jamat: published.times[p] || addMinutes(adhan, DEFAULT_OFFSETS[p]), source: "published" };
    }
    return { prayer: p, adhan, jamat: addMinutes(adhan, DEFAULT_OFFSETS[p]), source: "estimated" };
  });
  return { rows, jumuah: published?.jumuah ?? [], verified: !!published, updatedAt: published?.updatedAt };
}

export type NextJamat = { prayer: SalahName; time: string; at: Date; msUntil: number; isTomorrow: boolean; source: JamatRow["source"] };

/** The next Jamat from now; after Isha, tomorrow's Fajr. */
export function nextJamat(day: JamatDay, now: Date = new Date()): NextJamat {
  for (const r of day.rows) {
    const at = timeToDate(r.jamat, now);
    if (at.getTime() > now.getTime()) {
      return { prayer: r.prayer, time: r.jamat, at, msUntil: at.getTime() - now.getTime(), isTomorrow: false, source: r.source };
    }
  }
  const fajr = day.rows[0];
  const at = timeToDate(fajr.jamat, now);
  at.setDate(at.getDate() + 1);
  return { prayer: "Fajr", time: fajr.jamat, at, msUntil: at.getTime() - now.getTime(), isTomorrow: true, source: fajr.source };
}

export function usePublished(masjidId: string | null) {
  const [p, setP] = useState<Published | null>(null);
  useEffect(() => {
    if (!masjidId) return;
    setP(loadPublished(masjidId));
    const on = (e: Event) => {
      if ((e as CustomEvent<string>).detail === masjidId) setP(loadPublished(masjidId));
    };
    window.addEventListener("ug:jamat", on);
    return () => window.removeEventListener("ug:jamat", on);
  }, [masjidId]);
  return p;
}

/** Ticks every 30 s so countdowns stay honest. */
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
