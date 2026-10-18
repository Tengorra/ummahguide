/** Hijri calendar: curated Islamic dates + sunnah fasting days, converted with Aladhan's hToG (no key). */

import { cached } from "./storage";

export type IslamicEvent = {
  id: string;
  name: string;
  sub: string;
  hMonth: number; // 1..12
  hDay: number;
  kind: "eid" | "holy" | "fast" | "hajj" | "ramadan";
  spanDays?: number; // e.g. Hajj 8–13
};

/** Only dates every school recognises; contested observances are left out on purpose. */
export const ISLAMIC_EVENTS: IslamicEvent[] = [
  { id: "newyear", name: "Islamic New Year", sub: "1 Muharram", hMonth: 1, hDay: 1, kind: "holy" },
  { id: "tasua", name: "Fast of Tasu'a", sub: "9 Muharram — sunnah fast with Ashura", hMonth: 1, hDay: 9, kind: "fast" },
  { id: "ashura", name: "Day of Ashura", sub: "10 Muharram — sunnah fast, expiates the past year", hMonth: 1, hDay: 10, kind: "fast" },
  { id: "rajab", name: "Rajab begins", sub: "One of the four sacred months", hMonth: 7, hDay: 1, kind: "holy" },
  { id: "shaban", name: "Sha'ban begins", sub: "The Prophet ﷺ fasted most of this month", hMonth: 8, hDay: 1, kind: "holy" },
  { id: "ramadan", name: "Ramadan begins", sub: "1 Ramadan — fasting starts", hMonth: 9, hDay: 1, kind: "ramadan" },
  { id: "last10", name: "Last ten nights", sub: "Seek Laylat al-Qadr on the odd nights", hMonth: 9, hDay: 21, kind: "ramadan", spanDays: 10 },
  { id: "qadr27", name: "27th night", sub: "Most widely sought night of Laylat al-Qadr", hMonth: 9, hDay: 27, kind: "ramadan" },
  { id: "eidfitr", name: "Eid al-Fitr", sub: "1 Shawwal — fasting is forbidden", hMonth: 10, hDay: 1, kind: "eid" },
  { id: "shawwal6", name: "Six days of Shawwal", sub: "Any six days after Eid — like fasting the whole year", hMonth: 10, hDay: 2, kind: "fast", spanDays: 28 },
  { id: "dhulhijjah10", name: "First ten days of Dhul Hijjah", sub: "The best days of the year for good deeds", hMonth: 12, hDay: 1, kind: "holy", spanDays: 10 },
  { id: "hajj", name: "Hajj", sub: "8–13 Dhul Hijjah", hMonth: 12, hDay: 8, kind: "hajj", spanDays: 6 },
  { id: "arafah", name: "Day of Arafah", sub: "9 Dhul Hijjah — sunnah fast for those not on Hajj", hMonth: 12, hDay: 9, kind: "fast" },
  { id: "eidadha", name: "Eid al-Adha", sub: "10 Dhul Hijjah — Qurbani", hMonth: 12, hDay: 10, kind: "eid" },
  { id: "tashreeq", name: "Days of Tashreeq", sub: "11–13 Dhul Hijjah — eating and dhikr, no fasting", hMonth: 12, hDay: 11, kind: "holy", spanDays: 3 },
];

export const HIJRI_MONTHS = [
  "Muharram",
  "Safar",
  "Rabi al-Awwal",
  "Rabi al-Thani",
  "Jumada al-Ula",
  "Jumada al-Akhirah",
  "Rajab",
  "Sha'ban",
  "Ramadan",
  "Shawwal",
  "Dhul Qa'dah",
  "Dhul Hijjah",
];

export type UpcomingEvent = IslamicEvent & { date: Date; hijriYear: number; daysAway: number };

type HToG = { data?: { gregorian?: { date?: string } } };

async function hToG(day: number, month: number, year: number): Promise<Date | null> {
  const key = `ug.htog.${year}-${month}-${day}`;
  const iso = await cached(key, 365 * 24 * 3600_000, async () => {
    const r = await fetch(`https://api.aladhan.com/v1/hToG/${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}-${year}`);
    if (!r.ok) throw new Error("Calendar unavailable");
    const j = (await r.json()) as HToG;
    const g = j.data?.gregorian?.date; // "DD-MM-YYYY"
    if (!g) throw new Error("Calendar unavailable");
    const [dd, mm, yy] = g.split("-");
    return `${yy}-${mm}-${dd}`;
  }).catch(() => null);
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Upcoming events over the next ~13 months, nearest first. Needs the current Hijri year (from Aladhan timings). */
export async function upcomingEvents(hijriYear: number, now = new Date()): Promise<UpcomingEvent[]> {
  const today = startOfDay(now);
  const out: UpcomingEvent[] = [];
  for (const hy of [hijriYear, hijriYear + 1]) {
    const dates = await Promise.all(ISLAMIC_EVENTS.map((e) => hToG(e.hDay, e.hMonth, hy)));
    ISLAMIC_EVENTS.forEach((e, i) => {
      const date = dates[i];
      if (!date) return;
      const end = new Date(date);
      end.setDate(end.getDate() + (e.spanDays ?? 1) - 1);
      if (end < today) return; // fully past
      const daysAway = Math.round((date.getTime() - today.getTime()) / 86400000);
      out.push({ ...e, date, hijriYear: hy, daysAway });
    });
  }
  return out
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .filter((e, i, arr) => arr.findIndex((x) => x.id === e.id && x.hijriYear === e.hijriYear) === i)
    .slice(0, 12);
}

/** Sunnah fasting helpers for a given Hijri day / weekday. */
export function isWhiteDay(hDay: number): boolean {
  return hDay === 13 || hDay === 14 || hDay === 15;
}
export function isMondayOrThursday(d: Date): boolean {
  const w = d.getDay();
  return w === 1 || w === 4;
}

/** The sunnah fast (if any) for a date, as a short label. */
export function sunnahFast(d: Date, hDay: number, hMonth: number): string | null {
  if (hMonth === 9) return null; // Ramadan itself
  if (hMonth === 1 && (hDay === 9 || hDay === 10)) return hDay === 9 ? "Tasu'a" : "Ashura";
  if (hMonth === 12 && hDay === 9) return "Arafah";
  if (hMonth === 10 && hDay === 1) return null;
  if (hMonth === 12 && hDay >= 10 && hDay <= 13) return null; // Eid + Tashreeq, no fasting
  if (isWhiteDay(hDay)) return "White day";
  if (isMondayOrThursday(d)) return d.getDay() === 1 ? "Monday fast" : "Thursday fast";
  return null;
}

export function fmtDay(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
