/** quran.com API v4 (free, no key, CORS-enabled) + local reading state. Chapters are cached 7 days; verses/tafsir are memoised per session. */

import { cached, readJSON, writeJSON } from "./storage";

const API = "https://api.quran.com/api/v4";
const AUDIO_BASE = "https://verses.quran.com/";
const TAFSIR_ID = 169; // Ibn Kathir (English)

const KEYS = {
  chapters: "ug.quran.chapters",
  translation: "ug.quran.translation",
  reciter: "ug.quran.reciter",
  arabicSize: "ug.quran.arabicSize",
  last: "ug.quran.last",
  bookmarks: "ug.quran.bookmarks",
} as const;

export type Chapter = {
  id: number;
  name_simple: string;
  name_arabic: string;
  revelation_place: string; // "makkah" | "madinah"
  verses_count: number;
  translated_name: { name: string };
};

/** Cleaned verse: translation already stripped of HTML, audio already absolute. */
export type Verse = {
  id: number;
  verse_key: string; // "2:255"
  verse_number: number;
  juz_number: number;
  text_uthmani: string;
  translation: string;
  audio: string | null;
};

export type LastRead = { chapter: number; verse: number; name: string; versesCount?: number };

export type Bookmark = {
  verse_key: string;
  chapter: number;
  verse: number;
  name: string;
  text_uthmani: string;
  translation: string;
  at: number;
};

export type VerseByKey = { text_uthmani: string; translation: string; verse_key: string; chapterName?: string };

type RawVerse = {
  id: number;
  verse_key: string;
  verse_number: number;
  juz_number: number;
  text_uthmani: string;
  translations?: { text: string }[];
  audio?: { url: string } | null;
};

type RawPagination = { next_page?: number | null; total_pages?: number };

export const TRANSLATIONS = [
  { id: 131, name: "The Clear Quran (Khattab)", short: "Khattab" },
  { id: 20, name: "Sahih International", short: "Sahih Intl" },
  { id: 19, name: "Pickthall", short: "Pickthall" },
  { id: 22, name: "Yusuf Ali", short: "Yusuf Ali" },
] as const;

export const RECITERS = [
  { id: 7, name: "Mishary Rashid Alafasy", short: "Alafasy", initials: "MA" },
  { id: 1, name: "AbdulBaset AbdulSamad (Mujawwad)", short: "AbdulBaset", initials: "AB" },
  { id: 3, name: "Abdur-Rahman as-Sudais", short: "Sudais", initials: "AS" },
] as const;

export const DEFAULT_TRANSLATION = 131;
export const DEFAULT_RECITER = 7;
export const ARABIC_SIZES = [24, 27, 32] as const;
export const DEFAULT_ARABIC_SIZE = 27;

export const BISMILLAH = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";

/** Surahs that do not open with a separate Bismillah line. */
export function hasBismillah(chapterId: number): boolean {
  return chapterId !== 1 && chapterId !== 9;
}

export function revelationLabel(place: string): "Makki" | "Madani" {
  return place.toLowerCase().startsWith("mad") ? "Madani" : "Makki";
}

export const VERSE_OF_DAY_KEYS = [
  "94:5",
  "2:286",
  "13:28",
  "65:3",
  "3:139",
  "39:53",
  "2:152",
  "21:87",
  "94:6",
  "2:45",
  "29:69",
  "16:128",
  "25:63",
  "93:5",
] as const;

/* ---------- HTML helpers ---------- */

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, ent: string) => {
    if (ent[0] === "#") {
      const hex = ent[1] === "x" || ent[1] === "X";
      const code = parseInt(hex ? ent.slice(2) : ent.slice(1), hex ? 16 : 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : match;
    }
    const v = NAMED_ENTITIES[ent.toLowerCase()];
    return v === undefined ? match : v;
  });
}

/**
 * Strip HTML to plain text. Footnote markers (<sup foot_note=…>1</sup>) are removed entirely so no stray digits remain.
 * With keepParagraphs, block boundaries become blank lines ("\n\n") so tafsir keeps its paragraphs.
 */
export function stripHtml(html: string, keepParagraphs = false): string {
  let s = html.replace(/<sup\b[^>]*>[\s\S]*?<\/sup>/gi, "");
  if (keepParagraphs) {
    s = s
      .replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, "\n\n")
      .replace(/<br\s*\/?>/gi, "\n");
  }
  s = decodeEntities(s.replace(/<[^>]+>/g, ""));
  if (keepParagraphs) {
    return s
      .split(/\n\s*\n/)
      .map((p) => p.replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").trim())
      .filter(Boolean)
      .join("\n\n");
  }
  return s.replace(/\s+/g, " ").trim();
}

/** Audio urls from the API are relative ("Alafasy/mp3/001001.mp3") unless already absolute. */
export function audioUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return AUDIO_BASE + url.replace(/^\/+/, "");
}

export function fmtClock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/* ---------- Network ---------- */

async function getJSON<T>(url: string, failMessage: string): Promise<T> {
  const r = await fetch(url, { headers: { Accept: "application/json" } });
  if (!r.ok) throw new Error(failMessage);
  return (await r.json()) as T;
}

let chaptersPromise: Promise<Chapter[]> | null = null;

export function fetchChapters(): Promise<Chapter[]> {
  if (!chaptersPromise) {
    chaptersPromise = cached(KEYS.chapters, 7 * 24 * 3600_000, async () => {
      const j = await getJSON<{ chapters: Chapter[] }>(`${API}/chapters?language=en`, "Could not load the surah list");
      return j.chapters.map((c) => ({
        id: c.id,
        name_simple: c.name_simple,
        name_arabic: c.name_arabic,
        revelation_place: c.revelation_place,
        verses_count: c.verses_count,
        translated_name: { name: c.translated_name?.name ?? "" },
      }));
    }).catch((e: unknown) => {
      chaptersPromise = null; // allow retry
      throw e;
    });
  }
  return chaptersPromise;
}

function toVerse(raw: RawVerse): Verse {
  return {
    id: raw.id,
    verse_key: raw.verse_key,
    verse_number: raw.verse_number,
    juz_number: raw.juz_number,
    text_uthmani: raw.text_uthmani,
    translation: stripHtml(raw.translations?.[0]?.text ?? ""),
    audio: audioUrl(raw.audio?.url),
  };
}

function versesPageUrl(id: number, translationId: number, reciterId: number, page: number): string {
  return `${API}/verses/by_chapter/${id}?language=en&words=false&translations=${translationId}&fields=text_uthmani&audio=${reciterId}&per_page=50&page=${page}`;
}

async function loadChapterPages(id: number, translationId: number, reciterId: number): Promise<Verse[]> {
  type Page = { verses: RawVerse[]; pagination?: RawPagination };
  const fail = "Could not load this surah";
  const first = await getJSON<Page>(versesPageUrl(id, translationId, reciterId, 1), fail);
  const out: Verse[] = first.verses.map(toVerse);

  const totalPages = first.pagination?.total_pages;
  if (typeof totalPages === "number" && totalPages > 1) {
    // Known page count: fetch the rest in parallel (Al-Baqarah is 6 pages).
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) => getJSON<Page>(versesPageUrl(id, translationId, reciterId, i + 2), fail)),
    );
    for (const p of rest) out.push(...p.verses.map(toVerse));
  } else {
    // Fallback: follow next_page until null.
    let next = first.pagination?.next_page ?? null;
    let guard = 0;
    while (next && guard++ < 20) {
      const p = await getJSON<Page>(versesPageUrl(id, translationId, reciterId, next), fail);
      out.push(...p.verses.map(toVerse));
      next = p.verses.length ? (p.pagination?.next_page ?? null) : null;
    }
  }
  return out.sort((a, b) => a.verse_number - b.verse_number);
}

const verseMemo = new Map<string, Promise<Verse[]>>();

/** All verses of a surah (every page), with the chosen translation and reciter audio. Memoised for the session. */
export function fetchChapterVerses(id: number, translationId: number, reciterId: number): Promise<Verse[]> {
  const key = `${id}.${translationId}.${reciterId}`;
  const hit = verseMemo.get(key);
  if (hit) return hit;
  const p = loadChapterPages(id, translationId, reciterId).catch((e: unknown) => {
    verseMemo.delete(key);
    throw e;
  });
  verseMemo.set(key, p);
  return p;
}

const tafsirMemo = new Map<string, Promise<string>>();

/** Ibn Kathir (English) tafsir for one verse, as plain text with paragraphs separated by blank lines. */
export function fetchTafsir(verseKey: string): Promise<string> {
  const hit = tafsirMemo.get(verseKey);
  if (hit) return hit;
  const p = getJSON<{ tafsir?: { text?: string } }>(`${API}/tafsirs/${TAFSIR_ID}/by_ayah/${verseKey}`, "Could not load the tafsir")
    .then((j) => {
      const text = stripHtml(j.tafsir?.text ?? "", true);
      if (!text) throw new Error("No tafsir available for this verse");
      return text;
    })
    .catch((e: unknown) => {
      tafsirMemo.delete(verseKey);
      throw e;
    });
  tafsirMemo.set(verseKey, p);
  return p;
}

/** One verse by key ("94:5"), used for Verse of the Day. Chapter name is best-effort from the cached chapter list. */
export async function fetchVerseByKey(key: string, translationId: number): Promise<VerseByKey> {
  const j = await getJSON<{ verse: RawVerse }>(
    `${API}/verses/by_key/${key}?language=en&translations=${translationId}&fields=text_uthmani`,
    "Could not load the verse",
  );
  const v = j.verse;
  const chapterId = Number(key.split(":")[0]);
  let chapterName: string | undefined;
  try {
    chapterName = (await fetchChapters()).find((c) => c.id === chapterId)?.name_simple;
  } catch {
    /* optional */
  }
  return {
    text_uthmani: v.text_uthmani,
    translation: stripHtml(v.translations?.[0]?.text ?? ""),
    verse_key: v.verse_key ?? key,
    chapterName,
  };
}

/* ---------- Persisted preferences ---------- */

export function getTranslationId(): number {
  const v = readJSON<number>(KEYS.translation, DEFAULT_TRANSLATION);
  return TRANSLATIONS.some((t) => t.id === v) ? v : DEFAULT_TRANSLATION;
}
export function setTranslationId(id: number): void {
  writeJSON(KEYS.translation, id);
}

export function getReciterId(): number {
  const v = readJSON<number>(KEYS.reciter, DEFAULT_RECITER);
  return RECITERS.some((r) => r.id === v) ? v : DEFAULT_RECITER;
}
export function setReciterId(id: number): void {
  writeJSON(KEYS.reciter, id);
}

export function getArabicSize(): number {
  const v = readJSON<number>(KEYS.arabicSize, DEFAULT_ARABIC_SIZE);
  return (ARABIC_SIZES as readonly number[]).includes(v) ? v : DEFAULT_ARABIC_SIZE;
}
export function setArabicSize(px: number): void {
  writeJSON(KEYS.arabicSize, px);
}

/* ---------- Last read + bookmarks ---------- */

export function getLastRead(): LastRead | null {
  const v = readJSON<LastRead | null>(KEYS.last, null);
  if (!v || typeof v.chapter !== "number" || typeof v.verse !== "number") return null;
  return {
    chapter: v.chapter,
    verse: v.verse,
    name: typeof v.name === "string" ? v.name : `Surah ${v.chapter}`,
    ...(typeof v.versesCount === "number" ? { versesCount: v.versesCount } : {}),
  };
}
export function setLastRead(v: LastRead): void {
  writeJSON(KEYS.last, v);
}

export function getBookmarks(): Bookmark[] {
  const v = readJSON<Bookmark[]>(KEYS.bookmarks, []);
  return Array.isArray(v) ? v : [];
}

/** Add or remove a bookmark; returns the new list (newest first). */
export function toggleBookmark(b: Omit<Bookmark, "at">): Bookmark[] {
  const list = getBookmarks();
  const next = list.some((x) => x.verse_key === b.verse_key)
    ? list.filter((x) => x.verse_key !== b.verse_key)
    : [{ ...b, at: Date.now() }, ...list];
  writeJSON(KEYS.bookmarks, next);
  return next;
}

export function isBookmarked(verseKey: string, list: Bookmark[] = getBookmarks()): boolean {
  return list.some((x) => x.verse_key === verseKey);
}
