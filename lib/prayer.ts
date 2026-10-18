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

/** Calendar fields of an instant as seen in an IANA time zone. */
function zoneParts(date: Date, tz: string): { y: number; m: number; d: number; hh: number; mm: number; ss: number } {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", { timeZone: tz, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
      .formatToParts(date)
      .map((x) => [x.type, x.value]),
  );
  return { y: +p.year, m: +p.month, d: +p.day, hh: +p.hour % 24, mm: +p.minute, ss: +p.second };
}

function zoneOffsetMs(date: Date, tz: string): number {
  const z = zoneParts(date, tz);
  return Date.UTC(z.y, z.m - 1, z.d, z.hh, z.mm, z.ss) - date.getTime();
}

/** The instant at which a wall-clock date/time occurs in a time zone. */
export function zonedToInstant(y: number, m: number, d: number, hh: number, mm: number, tz: string): Date {
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let off = zoneOffsetMs(new Date(guess), tz);
  off = zoneOffsetMs(new Date(guess - off), tz);
  return new Date(guess - off);
}

/**
 * "HH:MM" on the day of `base` → an absolute instant. When `tz` (the LOCATION's zone) is given,
 * the time is interpreted in that zone, so a London phone looking at Saskatoon still counts
 * down correctly. Without `tz`, the phone's own zone is used.
 */
export function timeToDate(hhmm: string, base: Date = new Date(), tz?: string): Date {
  const [h, m] = cleanTime(hhmm).split(":").map(Number);
  if (tz) {
    try {
      const z = zoneParts(base, tz);
      return zonedToInstant(z.y, z.m, z.d, h, m, tz);
    } catch {
      /* unknown zone: fall through to local */
    }
  }
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

const DAY_MS = 86400000;

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
export function nextPrayer(timings: Timings, now: Date = new Date(), tz?: string): NextPrayer {
  const order: PrayerName[] = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Maghrib", "Isha"];
  const times = order.map((n) => ({ name: n, at: timeToDate(timings[n], now, tz) }));

  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    if (t.name === "Sunrise") continue;
    if (t.at.getTime() > now.getTime()) {
      const prev = i === 0 ? { name: "Isha" as PrayerName, at: new Date(timeToDate(timings.Isha, now, tz).getTime() - DAY_MS) } : times[i - 1];
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
  const fajr = new Date(timeToDate(timings.Fajr, now, tz).getTime() + DAY_MS);
  const isha = timeToDate(timings.Isha, now, tz);
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

/** Milliseconds → "2:14:05" (h:mm:ss) for live countdowns. */
export function countdownClock(ms: number): string {
  if (ms <= 0) return "0:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/**
 * Islamic night times from Maghrib to the next Fajr (today's Fajr stands in for tomorrow's, ±1–2 min):
 * midnight (halfway) and the start of the last third — when Tahajjud is most virtuous.
 */
export function nightTimes(timings: Timings, base: Date = new Date(), tz?: string): { midnight: Date; lastThird: Date; nightMs: number } {
  const maghrib = timeToDate(timings.Maghrib, base, tz);
  let fajr = timeToDate(timings.Fajr, base, tz);
  if (fajr.getTime() <= maghrib.getTime()) fajr = new Date(fajr.getTime() + DAY_MS);
  const nightMs = fajr.getTime() - maghrib.getTime();
  return { midnight: new Date(maghrib.getTime() + nightMs / 2), lastThird: new Date(fajr.getTime() - nightMs / 3), nightMs };
}

/** "7:42 PM" from a Date, in the location's zone when given. */
export function fmtInstant(d: Date, tz?: string): string {
  try {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
  } catch {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
}

/** Current prayer window (the last salah that has started). */
export function currentPrayer(timings: Timings, now: Date = new Date(), tz?: string): SalahName {
  let cur: SalahName = "Isha";
  for (const n of SALAH) {
    if (timeToDate(timings[n], now, tz).getTime() <= now.getTime()) cur = n;
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
