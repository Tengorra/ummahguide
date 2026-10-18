/** Hadith of the day — fawazahmed0/hadith-api on jsDelivr (public domain, no key). English + Arabic, cached per day. */

import { cached, todayKey } from "./storage";

const CDN = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions";

export type Hadith = {
  collection: string; // "Forty Hadith of an-Nawawi" | "Sahih al-Bukhari" | …
  number: number;
  text: string;
  arabic: string;
  reference: string; // "Nawawi 3" / "Bukhari 1, Book 1 Hadith 1"
};

/** Pools we draw the daily hadith from: short, well-known, every-Muslim content first. */
const POOLS: { slug: string; name: string; short: string; from: number; to: number; total: number }[] = [
  { slug: "nawawi", name: "Forty Hadith of an-Nawawi", short: "Nawawi", from: 1, to: 42, total: 42 },
  { slug: "qudsi", name: "Forty Hadith Qudsi", short: "Hadith Qudsi", from: 1, to: 40, total: 40 },
  { slug: "bukhari", name: "Sahih al-Bukhari", short: "Bukhari", from: 1, to: 120, total: 7563 },
  { slug: "muslim", name: "Sahih Muslim", short: "Muslim", from: 1, to: 120, total: 3032 },
];

function dayNumber(d = new Date()): number {
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
}

/** Deterministic pick for a given day so everyone sees the same hadith and it survives reloads. */
export function pickForDay(d = new Date()): { pool: (typeof POOLS)[number]; number: number } {
  const n = dayNumber(d);
  // Weight Nawawi/Qudsi more heavily — they are short and foundational.
  const weights = [3, 2, 1, 1];
  const total = weights.reduce((a, b) => a + b, 0);
  let r = (n * 7919) % total;
  let idx = 0;
  while (r >= weights[idx]) {
    r -= weights[idx];
    idx++;
  }
  const pool = POOLS[idx];
  const span = pool.to - pool.from + 1;
  const number = pool.from + ((n * 104729 + idx * 31) % span);
  return { pool, number };
}

type Raw = { hadiths?: { hadithnumber: number; text: string; reference?: { book?: number; hadith?: number } }[] };

async function getJSON(url: string): Promise<Raw> {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error("Could not load the hadith");
  return (await r.json()) as Raw;
}

async function fetchOne(slug: string, number: number, lang: "eng" | "ara"): Promise<Raw> {
  try {
    return await getJSON(`${CDN}/${lang}-${slug}/${number}.min.json`);
  } catch {
    return await getJSON(`${CDN}/${lang}-${slug}/${number}.json`);
  }
}

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

export async function fetchHadithOfDay(d = new Date()): Promise<Hadith> {
  const { pool, number } = pickForDay(d);
  return cached(`ug.hadith.${todayKey(d)}`, 36 * 3600_000, async () => {
    const [en, ar] = await Promise.all([fetchOne(pool.slug, number, "eng"), fetchOne(pool.slug, number, "ara").catch(() => null)]);
    const h = en.hadiths?.[0];
    if (!h?.text) throw new Error("Could not load the hadith");
    const a = ar?.hadiths?.[0]?.text ?? "";
    const ref = h.reference?.book && h.reference?.hadith ? `${pool.short} ${number} · Book ${h.reference.book}, Hadith ${h.reference.hadith}` : `${pool.short} ${number}`;
    return { collection: pool.name, number, text: clean(h.text), arabic: clean(a), reference: ref };
  });
}

/** One specific hadith (used by the Library → Hadith browser). */
export async function fetchHadith(slug: string, number: number): Promise<Hadith> {
  const pool = POOLS.find((p) => p.slug === slug) ?? POOLS[0];
  const [en, ar] = await Promise.all([fetchOne(slug, number, "eng"), fetchOne(slug, number, "ara").catch(() => null)]);
  const h = en.hadiths?.[0];
  if (!h?.text) throw new Error("Could not load the hadith");
  return { collection: pool.name, number, text: clean(h.text), arabic: clean(ar?.hadiths?.[0]?.text ?? ""), reference: `${pool.short} ${number}` };
}

export const HADITH_COLLECTIONS = POOLS.map((p) => ({ slug: p.slug, name: p.name, from: 1, to: p.total }));
