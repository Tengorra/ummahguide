/** Pure prayer-time helpers: parsing, formatting, next-prayer maths. No network. */

export const PRAYERS = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
export const SALAH = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"] as const;
export type PrayerName = (typeof PRAYERS)[number];
export type SalahName = (typeof SALAH)[number];
export type Timings = Record<PrayerName, string>; // "HH:MM" 24h

/** "06:15 (CST)" → "06:15" */
export function cleanTime(raw: string): string {
  const m = raw.match(/\d{1,2}:\d{2}/);
  return m ? m[0].padStart(5, "0") : raw;
}

export function timeToDate(hhmm: string, base: Date = new Date()): Date {
  const [h, m] = cleanTime(hhmm).split(":").map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

export function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = cleanTime(hhmm).split(":").map(Number);
  const total = (((h * 60 + m + mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** "13:15" → "1:15 PM" */
export function fmt12(hhmm: string, withPeriod = true): string {
  const [h, m] = cleanTime(hhmm).split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")}${withPeriod ? ` ${period}` : ""}`;
}

export function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-CA", { weekday: "long", day: "numeric", month: "long" });
}

/** Milliseconds → "5h 17m" / "42m" / "now" */
export function countdown(ms: number): string {
  if (ms <= 0) return "now";
  const mins = Math.round(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export type NextPrayer = {
  name: SalahName;
  at: Date;
  prevName: PrayerName;
  prevAt: Date;
  progress: number; // 0..1 of the window between prevAt and at
  isTomorrow: boolean;
};

/** Which salah comes next, given today's timings. After Isha, rolls to tomorrow's Fajr (same clock time). */
export function nextPrayer(timings: Timings, now: Date = new Date()): NextPrayer {
  const order: PrayerName[] = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const times = order.map((n) => ({ name: n, at: timeToDate(timings[n], now) }));

  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    if (t.name === "Sunrise") continue;
    if (t.at.getTime() > now.getTime()) {
      const prev = i === 0 ? { name: "Isha" as PrayerName, at: new Date(timeToDate(timings.Isha, now).getTime() - 86400000) } : times[i - 1];
      const span = t.at.getTime() - prev.at.getTime();
      return {
        name: t.name as SalahName,
        at: t.at,
        prevName: prev.name,
        prevAt: prev.at,
        progress: span > 0 ? Math.min(1, Math.max(0, (now.getTime() - prev.at.getTime()) / span)) : 0,
        isTomorrow: false,
      };
    }
  }
  // After Isha: tomorrow's Fajr
  const fajr = timeToDate(timings.Fajr, now);
  fajr.setDate(fajr.getDate() + 1);
  const isha = timeToDate(timings.Isha, now);
  const span = fajr.getTime() - isha.getTime();
  return {
    name: "Fajr",
    at: fajr,
    prevName: "Isha",
    prevAt: isha,
    progress: span > 0 ? Math.min(1, (now.getTime() - isha.getTime()) / span) : 0,
    isTomorrow: true,
  };
}

/** Current prayer window (the last salah that has started). */
export function currentPrayer(timings: Timings, now: Date = new Date()): SalahName {
  let cur: SalahName = "Isha";
  for (const n of SALAH) {
    if (timeToDate(timings[n], now).getTime() <= now.getTime()) cur = n;
  }
  return cur;
}

const ARABIC_INDIC = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
export function toArabicIndic(n: number | string): string {
  return String(n)
    .split("")
    .map((c) => (/\d/.test(c) ? ARABIC_INDIC[Number(c)] : c))
    .join("");
}
