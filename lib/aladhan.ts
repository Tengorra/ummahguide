"use client";

import { useEffect, useState } from "react";
import { cached, readJSON, todayKey, writeJSON } from "./storage";
import { cleanTime, type Timings } from "./prayer";

/** Aladhan (api.aladhan.com) — free, no key. Calculation methods and settings. */

export const METHODS = [
  { id: 2, name: "ISNA (North America)" },
  { id: 3, name: "Muslim World League" },
  { id: 5, name: "Egyptian General Authority" },
  { id: 1, name: "University of Karachi" },
  { id: 4, name: "Umm al-Qura, Makkah" },
  { id: 15, name: "Moonsighting Committee" },
] as const;

export type Settings = { method: number; school: 0 | 1 }; // school: 0 Shafi/Maliki/Hanbali Asr, 1 Hanafi Asr
const SETTINGS_KEY = "ug.settings";
export const DEFAULT_SETTINGS: Settings = { method: 2, school: 0 };

export function loadSettings(): Settings {
  return readJSON<Settings>(SETTINGS_KEY, DEFAULT_SETTINGS);
}
export function saveSettings(s: Settings) {
  writeJSON(SETTINGS_KEY, s);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ug:settings", { detail: s }));
}
export function useSettings() {
  const [settings, setState] = useState<Settings>(DEFAULT_SETTINGS);
  useEffect(() => {
    setState(loadSettings());
    const on = (e: Event) => setState((e as CustomEvent<Settings>).detail);
    window.addEventListener("ug:settings", on);
    return () => window.removeEventListener("ug:settings", on);
  }, []);
  const update = (patch: Partial<Settings>) => {
    const next = { ...loadSettings(), ...patch };
    saveSettings(next);
    setState(next);
  };
  return { settings, update };
}

export type Hijri = { day: number; month: string; year: number; weekday: string; monthNumber: number };
export type DayTimes = { date: string; timings: Timings; hijri: Hijri; gregorianWeekday: string };

type RawDay = {
  timings: Record<string, string>;
  date: {
    gregorian: { date: string; weekday: { en: string } };
    hijri: { day: string; month: { en: string; number: number }; year: string; weekday: { en: string } };
  };
};

function toDay(raw: RawDay, isoDate: string): DayTimes {
  const t = raw.timings;
  return {
    date: isoDate,
    timings: {
      Fajr: cleanTime(t.Fajr),
      Sunrise: cleanTime(t.Sunrise),
      Dhuhr: cleanTime(t.Dhuhr),
      Asr: cleanTime(t.Asr),
      Maghrib: cleanTime(t.Maghrib),
      Isha: cleanTime(t.Isha),
    },
    hijri: {
      day: Number(raw.date.hijri.day),
      month: raw.date.hijri.month.en,
      monthNumber: raw.date.hijri.month.number,
      year: Number(raw.date.hijri.year),
      weekday: raw.date.hijri.weekday.en,
    },
    gregorianWeekday: raw.date.gregorian.weekday.en,
  };
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;

export async function fetchDay(lat: number, lng: number, date: Date, s: Settings): Promise<DayTimes> {
  const iso = todayKey(date);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const key = `ug.day.${iso}.${r3(lat)}.${r3(lng)}.${s.method}.${s.school}`;
  return cached(key, 6 * 3600_000, async () => {
    const url = `https://api.aladhan.com/v1/timings/${dd}-${mm}-${date.getFullYear()}?latitude=${lat}&longitude=${lng}&method=${s.method}&school=${s.school}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error("Prayer times unavailable");
    const j = await r.json();
    return toDay(j.data as RawDay, iso);
  });
}

/** The next 7 days starting today (pulls one or two calendar months). */
export async function fetchWeek(lat: number, lng: number, s: Settings): Promise<DayTimes[]> {
  const today = new Date();
  const months = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    months.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
  }
  const all: DayTimes[] = [];
  for (const ym of Array.from(months)) {
    const [y, m] = ym.split("-").map(Number);
    const key = `ug.month.${ym}.${r3(lat)}.${r3(lng)}.${s.method}.${s.school}`;
    const days = await cached(key, 24 * 3600_000, async () => {
      const r = await fetch(
        `https://api.aladhan.com/v1/calendar/${y}/${m}?latitude=${lat}&longitude=${lng}&method=${s.method}&school=${s.school}`,
      );
      if (!r.ok) throw new Error("Calendar unavailable");
      const j = await r.json();
      return (j.data as RawDay[]).map((raw) => {
        const [dd, mo, yy] = raw.date.gregorian.date.split("-");
        return toDay(raw, `${yy}-${mo}-${dd}`);
      });
    });
    all.push(...days);
  }
  const start = todayKey(today);
  const end = new Date(today);
  end.setDate(today.getDate() + 6);
  const endKey = todayKey(end);
  return all.filter((d) => d.date >= start && d.date <= endKey).sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchQibla(lat: number, lng: number): Promise<number> {
  const key = `ug.qibla.${r3(lat)}.${r3(lng)}`;
  return cached(key, 30 * 24 * 3600_000, async () => {
    const r = await fetch(`https://api.aladhan.com/v1/qibla/${lat}/${lng}`);
    const j = await r.json();
    return Number(j.data.direction);
  });
}

/** Today's times for a location + settings, re-fetched when either changes. */
export function useDayTimes(lat: number, lng: number, s: Settings) {
  const [day, setDay] = useState<DayTimes | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setError(null);
    fetchDay(lat, lng, new Date(), s)
      .then((d) => live && setDay(d))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [lat, lng, s.method, s.school]); // eslint-disable-line react-hooks/exhaustive-deps
  return { day, error };
}

/** Haversine distance in km between two points, and great-circle distance to the Kaaba. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
export const KAABA = { lat: 21.422487, lng: 39.826206 };
export function kmToMakkah(lat: number, lng: number): number {
  return haversineKm(lat, lng, KAABA.lat, KAABA.lng);
}
export function compassLabel(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}
