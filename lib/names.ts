/** The 99 Names of Allah — from Aladhan's asmaAlHusna endpoint (no key), cached for a year. */

import { cached } from "./storage";

export type Name99 = { number: number; arabic: string; transliteration: string; meaning: string };

type Raw = { data?: { name: string; transliteration: string; number: number; en: { meaning: string } }[] };

export async function fetchNames(): Promise<Name99[]> {
  return cached("ug.names99", 365 * 24 * 3600_000, async () => {
    const r = await fetch("https://api.aladhan.com/v1/asmaAlHusna");
    if (!r.ok) throw new Error("Could not load the names");
    const j = (await r.json()) as Raw;
    const list = (j.data ?? []).map((n) => ({ number: n.number, arabic: n.name, transliteration: n.transliteration, meaning: n.en?.meaning ?? "" }));
    if (list.length < 99) throw new Error("Could not load the names");
    return list.sort((a, b) => a.number - b.number);
  });
}

/** Name of the day — deterministic per day, same for everyone. */
export function nameOfDayIndex(d = new Date()): number {
  const n = Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
  return n % 99;
}
