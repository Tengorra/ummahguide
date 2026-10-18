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
  prefs: "ug.quran.prefs",
  recitations: "ug.quran.recitations",
  translationsList: "ug.quran.translations",
  juzs: "ug.quran.juzs",
} as const;

/* ---------- Reader scope: a surah, a juz or a mushaf page ---------- */

export type Scope = { type: "chapter"; id: number } | { type: "juz"; id: number } | { type: "page"; id: number };

/** "2" → surah 2 · "juz-3" → juz 3 · "page-45" → page 45. Null when malformed. */
export function parseScope(raw: string | undefined): Scope | null {
  if (!raw) return null;
  const m = raw.match(/^(juz|page)-(\d+)$/);
  if (m) {
    const n = Number(m[2]);
    if (m[1] === "juz" && n >= 1 && n <= 30) return { type: "juz", id: n };
    if (m[1] === "page" && n >= 1 && n <= 604) return { type: "page", id: n };
    return null;
  }
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 114 ? { type: "chapter", id: n } : null;
}

export function scopePath(s: Scope): string {
  return s.type === "chapter" ? `/quran/${s.id}` : `/quran/${s.type}-${s.id}`;
}

/* ---------- Reader preferences (one object) ---------- */

export type ReaderMode = "translation" | "reading";
export type ReaderTheme = "night" | "sepia" | "light";
export type ReaderPrefs = {
  mode: ReaderMode;
  theme: ReaderTheme;
  wordByWord: boolean;
  transliteration: boolean; // word-by-word transliteration under each word
  tajweed: boolean;
  translationSize: number; // px
};
export const DEFAULT_PREFS: ReaderPrefs = { mode: "translation", theme: "night", wordByWord: false, transliteration: false, tajweed: false, translationSize: 14 };

export function getPrefs(): ReaderPrefs {
  return { ...DEFAULT_PREFS, ...readJSON<Partial<ReaderPrefs>>(KEYS.prefs, {}) };
}
export function setPrefs(p: ReaderPrefs): void {
  writeJSON(KEYS.prefs, p);
}

/** Colours for each theme — applied as CSS variables on the reader root. */
export const THEMES: Record<ReaderTheme, { bg: string; bg2: string; fg: string; muted: string; line: string; accent: string; accentFg: string; scheme: "dark" | "light" }> = {
  night: { bg: "#0C1A17", bg2: "#132622", fg: "#F4F1EA", muted: "rgba(244,241,234,0.6)", line: "rgba(255,255,255,0.08)", accent: "#C9A44C", accentFg: "#0C1A17", scheme: "dark" },
  sepia: { bg: "#F3EADA", bg2: "#EADFCA", fg: "#2B2419", muted: "rgba(43,36,25,0.6)", line: "rgba(43,36,25,0.1)", accent: "#8A6B1F", accentFg: "#FFF8EA", scheme: "light" },
  light: { bg: "#FFFFFF", bg2: "#F4F1EA", fg: "#141A18", muted: "rgba(20,26,24,0.58)", line: "rgba(20,26,24,0.09)", accent: "#0B3D33", accentFg: "#F4F1EA", scheme: "light" },
};

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
  chapter_id: number;
  juz_number: number;
  page_number: number;
  text_uthmani: string;
  text_tajweed: string; // Uthmani with <tajweed class=…> tags, "" when unavailable
  translation: string;
  audio: string | null;
};

/** One word for word-by-word mode. */
export type Word = { text: string; translation: string; transliteration: string };

export type Recitation = { id: number; name: string; style: string };
export type TranslationResource = { id: number; name: string; author: string; language: string };
export type Juz = { juz_number: number; first: string; chapters: { id: number; from: number; to: number }[] };

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

type RawWord = {
  char_type_name?: string;
  text_uthmani?: string;
  text?: string;
  translation?: { text?: string };
  transliteration?: { text?: string | null };
};

type RawVerse = {
  id: number;
  verse_key: string;
  verse_number: number;
  juz_number: number;
  page_number?: number;
  text_uthmani: string;
  text_uthmani_tajweed?: string;
  translations?: { text: string }[];
  audio?: { url: string } | null;
  words?: RawWord[];
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
export const ARABIC_SIZES = [22, 25, 28, 32, 36] as const;
export const DEFAULT_ARABIC_SIZE = 28;

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
    chapter_id: Number(raw.verse_key.split(":")[0]),
    juz_number: raw.juz_number,
    page_number: raw.page_number ?? 0,
    text_uthmani: raw.text_uthmani,
    text_tajweed: raw.text_uthmani_tajweed ?? "",
    translation: stripHtml(raw.translations?.[0]?.text ?? ""),
    audio: audioUrl(raw.audio?.url),
  };
}

function scopeBase(scope: Scope): string {
  return `${API}/verses/by_${scope.type === "chapter" ? "chapter" : scope.type}/${scope.id}`;
}

function versesPageUrl(scope: Scope, translationId: number, reciterId: number, page: number): string {
  return `${scopeBase(scope)}?language=en&words=false&translations=${translationId}&fields=text_uthmani,text_uthmani_tajweed,page_number&audio=${reciterId}&per_page=50&page=${page}`;
}

/** Walks every API page of a verses endpoint. */
async function loadAllPages<T>(url: (page: number) => string, fail: string, map: (raw: RawVerse) => T): Promise<T[]> {
  type Page = { verses: RawVerse[]; pagination?: RawPagination };
  const first = await getJSON<Page>(url(1), fail);
  const out: T[] = first.verses.map(map);
  const totalPages = first.pagination?.total_pages;
  if (typeof totalPages === "number" && totalPages > 1) {
    const rest = await Promise.all(Array.from({ length: totalPages - 1 }, (_, i) => getJSON<Page>(url(i + 2), fail)));
    for (const p of rest) out.push(...p.verses.map(map));
  } else {
    let next = first.pagination?.next_page ?? null;
    let guard = 0;
    while (next && guard++ < 20) {
      const p = await getJSON<Page>(url(next), fail);
      out.push(...p.verses.map(map));
      next = p.verses.length ? (p.pagination?.next_page ?? null) : null;
    }
  }
  return out;
}

const verseMemo = new Map<string, Promise<Verse[]>>();

/** All verses in a scope (surah / juz / page), with the chosen translation and reciter audio. Memoised for the session. */
export function fetchVerses(scope: Scope, translationId: number, reciterId: number): Promise<Verse[]> {
  const key = `${scope.type}.${scope.id}.${translationId}.${reciterId}`;
  const hit = verseMemo.get(key);
  if (hit) return hit;
  const p = loadAllPages((page) => versesPageUrl(scope, translationId, reciterId, page), "Could not load these verses", toVerse)
    .then((vs) => vs.sort((a, b) => a.id - b.id))
    .catch((e: unknown) => {
      verseMemo.delete(key);
      throw e;
    });
  verseMemo.set(key, p);
  return p;
}

/** Back-compat for callers that only know surahs. */
export function fetchChapterVerses(id: number, translationId: number, reciterId: number): Promise<Verse[]> {
  return fetchVerses({ type: "chapter", id }, translationId, reciterId);
}

const wordMemo = new Map<string, Promise<Map<string, Word[]>>>();

/** Word-by-word data for a scope, keyed by verse_key. Fetched only when the mode is on (it is several times the size of the verses). */
export function fetchWords(scope: Scope): Promise<Map<string, Word[]>> {
  const key = `${scope.type}.${scope.id}`;
  const hit = wordMemo.get(key);
  if (hit) return hit;
  const url = (page: number) => `${scopeBase(scope)}?language=en&words=true&word_fields=text_uthmani&translation_fields=text&per_page=50&page=${page}`;
  const p = loadAllPages(url, "Could not load word-by-word", (raw) => {
    const words: Word[] = (raw.words ?? [])
      .filter((w) => w.char_type_name !== "end")
      .map((w) => ({ text: w.text_uthmani ?? w.text ?? "", translation: w.translation?.text ?? "", transliteration: w.transliteration?.text ?? "" }));
    return [raw.verse_key, words] as const;
  })
    .then((pairs) => new Map(pairs))
    .catch((e: unknown) => {
      wordMemo.delete(key);
      throw e;
    });
  wordMemo.set(key, p);
  return p;
}

/* ---------- Catalogues (cached a week) ---------- */

/** Reciters we show first; everything else from the API follows alphabetically. */
const FEATURED_RECITERS = [7, 2, 1, 3, 4, 6, 9, 12, 5, 8, 10, 11];

export function fetchRecitations(): Promise<Recitation[]> {
  return cached(KEYS.recitations, 7 * 24 * 3600_000, async () => {
    const j = await getJSON<{ recitations: { id: number; reciter_name: string; style?: string | null }[] }>(`${API}/resources/recitations?language=en`, "Could not load reciters");
    const list = j.recitations.map((r) => ({ id: r.id, name: r.reciter_name, style: r.style ?? "" }));
    return list.sort((a, b) => {
      const ia = FEATURED_RECITERS.indexOf(a.id);
      const ib = FEATURED_RECITERS.indexOf(b.id);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return a.name.localeCompare(b.name);
    });
  });
}

/** Languages shown first in the translation picker. */
export const FEATURED_LANGUAGES = ["english", "urdu", "arabic", "french", "indonesian", "turkish", "bengali", "spanish", "german", "malay", "hindi", "persian", "somali", "swahili"];

export function fetchTranslationList(): Promise<TranslationResource[]> {
  return cached(KEYS.translationsList, 7 * 24 * 3600_000, async () => {
    const j = await getJSON<{ translations: { id: number; name: string; author_name: string; language_name: string }[] }>(`${API}/resources/translations?language=en`, "Could not load translations");
    return j.translations.map((t) => ({ id: t.id, name: t.name, author: t.author_name, language: t.language_name.toLowerCase() }));
  });
}

export function fetchJuzs(): Promise<Juz[]> {
  return cached(KEYS.juzs, 30 * 24 * 3600_000, async () => {
    const j = await getJSON<{ juzs: { juz_number: number; verse_mapping: Record<string, string> }[] }>(`${API}/juzs`, "Could not load the juz list");
    const seen = new Set<number>();
    const out: Juz[] = [];
    for (const z of j.juzs) {
      if (seen.has(z.juz_number)) continue;
      seen.add(z.juz_number);
      const chapters = Object.entries(z.verse_mapping)
        .map(([c, range]) => {
          const [from, to] = range.split("-").map(Number);
          return { id: Number(c), from, to };
        })
        .sort((a, b) => a.id - b.id);
      out.push({ juz_number: z.juz_number, first: chapters.length ? `${chapters[0].id}:${chapters[0].from}` : "1:1", chapters });
    }
    return out.sort((a, b) => a.juz_number - b.juz_number);
  });
}

const infoMemo = new Map<number, Promise<string>>();

/** Surah introduction (English), as plain paragraphs. */
export function fetchChapterInfo(id: number): Promise<string> {
  const hit = infoMemo.get(id);
  if (hit) return hit;
  const p = getJSON<{ chapter_info?: { text?: string } }>(`${API}/chapters/${id}/info?language=en`, "Could not load the surah introduction")
    .then((j) => {
      const text = stripHtml(j.chapter_info?.text ?? "", true);
      if (!text) throw new Error("No introduction available");
      return text;
    })
    .catch((e: unknown) => {
      infoMemo.delete(id);
      throw e;
    });
  infoMemo.set(id, p);
  return p;
}

/* ---------- Tajweed rendering ---------- */

/** quran.com tajweed rule classes → colours (the standard mushaf colour code). */
export const TAJWEED_COLORS: Record<string, string> = {
  ham_wasl: "#AAAAAA",
  slnt: "#AAAAAA",
  laam_shamsiyah: "#AAAAAA",
  madda_normal: "#537FFF",
  madda_permissible: "#4050FF",
  madda_necessary: "#000EBC",
  madda_obligatory: "#2144C1",
  qalaqah: "#DD0008",
  ikhafa_shafawi: "#D500B7",
  ikhafa: "#9400A8",
  idgham_shafawi: "#58B800",
  iqlab: "#26BFFD",
  idgham_ghunnah: "#169777",
  idgham_wo_ghunnah: "#169200",
  idgham_mutajanisayn: "#A1A1A1",
  idgham_mutaqaribayn: "#A1A1A1",
  ghunnah: "#FF7E1E",
};

export const TAJWEED_LEGEND: { cls: string; label: string }[] = [
  { cls: "ghunnah", label: "Ghunnah" },
  { cls: "ikhafa", label: "Ikhfa" },
  { cls: "iqlab", label: "Iqlab" },
  { cls: "idgham_ghunnah", label: "Idgham with ghunnah" },
  { cls: "idgham_wo_ghunnah", label: "Idgham without ghunnah" },
  { cls: "qalaqah", label: "Qalqalah" },
  { cls: "madda_normal", label: "Madd 2 counts" },
  { cls: "madda_permissible", label: "Madd 2/4/6" },
  { cls: "madda_necessary", label: "Madd 6 counts" },
  { cls: "ham_wasl", label: "Silent / hamzat wasl" },
];

export type TajweedSegment = { text: string; cls: string | null };

/** "<tajweed class=ikhafa>نْ</tajweed>" → segments; anything else in the markup is dropped. */
export function parseTajweed(html: string): TajweedSegment[] {
  const out: TajweedSegment[] = [];
  const re = /<tajweed\s+class=["']?([a-z_]+)["']?>([\s\S]*?)<\/tajweed>|<[^>]+>|([^<]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m[1] !== undefined) out.push({ text: decodeEntities(m[2]), cls: m[1] });
    else if (m[3] !== undefined) out.push({ text: decodeEntities(m[3]), cls: null });
  }
  return out;
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
  return Number.isInteger(v) && v > 0 ? v : DEFAULT_TRANSLATION;
}
export function setTranslationId(id: number): void {
  writeJSON(KEYS.translation, id);
}

export function getReciterId(): number {
  const v = readJSON<number>(KEYS.reciter, DEFAULT_RECITER);
  return Number.isInteger(v) && v > 0 ? v : DEFAULT_RECITER;
}
export function setReciterId(id: number): void {
  writeJSON(KEYS.reciter, id);
}

export function getArabicSize(): number {
  const v = readJSON<number>(KEYS.arabicSize, DEFAULT_ARABIC_SIZE);
  if ((ARABIC_SIZES as readonly number[]).includes(v)) return v;
  // older builds stored 24/27/32 — snap to the nearest step
  if (typeof v === "number") return (ARABIC_SIZES as readonly number[]).reduce((best, s) => (Math.abs(s - v) < Math.abs(best - v) ? s : best), DEFAULT_ARABIC_SIZE);
  return DEFAULT_ARABIC_SIZE;
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
