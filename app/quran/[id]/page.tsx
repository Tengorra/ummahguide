"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import AudioPlayer from "@/components/AudioPlayer";
import { IconBack, IconChevronLeft, IconChevronRight, IconInfo, IconSliders } from "@/components/Icons";
import InfoSheet from "@/components/quran/InfoSheet";
import ReaderSettings from "@/components/quran/ReaderSettings";
import ReadingView from "@/components/quran/ReadingView";
import RepeatSheet, { type RepeatSettings } from "@/components/quran/RepeatSheet";
import VerseRow, { type TafsirState } from "@/components/quran/VerseRow";
import {
  BISMILLAH,
  DEFAULT_ARABIC_SIZE,
  DEFAULT_PREFS,
  DEFAULT_RECITER,
  DEFAULT_TRANSLATION,
  THEMES,
  fetchChapters,
  fetchRecitations,
  fetchTafsir,
  fetchTranslationList,
  fetchVerses,
  fetchWords,
  getArabicSize,
  getBookmarks,
  getLastRead,
  getPrefs,
  getReciterId,
  getTranslationId,
  hasBismillah,
  isBookmarked,
  parseScope,
  revelationLabel,
  scopePath,
  setArabicSize,
  setLastRead,
  setPrefs,
  setReciterId,
  setTranslationId,
  toggleBookmark,
  type Bookmark,
  type Chapter,
  type ReaderPrefs,
  type Scope,
  type Verse,
  type Word,
} from "@/lib/quran";

function initials(name: string): string {
  return name
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function ReaderPage() {
  const params = useParams<{ id: string }>();
  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const scope = useMemo(() => parseScope(rawId), [rawId]);
  const scopeKey = scope ? `${scope.type}.${scope.id}` : "";

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [verses, setVerses] = useState<Verse[] | null>(null);
  const [words, setWords] = useState<Map<string, Word[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [prefsReady, setPrefsReady] = useState(false);
  const [prefs, setPrefsState] = useState<ReaderPrefs>(DEFAULT_PREFS);
  const [current, setCurrent] = useState<number>(0); // verse id
  const [translationId, setTranslation] = useState(DEFAULT_TRANSLATION);
  const [reciterId, setReciter] = useState(DEFAULT_RECITER);
  const [arabicSize, setArabic] = useState(DEFAULT_ARABIC_SIZE);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [tafsir, setTafsir] = useState<TafsirState | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [sheet, setSheet] = useState<null | "display" | "translation" | "reciter">(null);
  const [repeatOpen, setRepeatOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [names, setNames] = useState<{ reciter: string; translation: string }>({ reciter: "", translation: "" });

  const [playing, setPlaying] = useState(false);
  const [loadedKey, setLoadedKeyState] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeat, setRepeat] = useState<RepeatSettings>({ each: 1, range: null, speed: 1 });
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadedKeyRef = useRef<string | null>(null);
  const versesRef = useRef<Verse[] | null>(null);
  const currentRef = useRef(0);
  const repeatRef = useRef(repeat);
  const playsRef = useRef(0);
  const playingRef = useRef(false);
  const scrollPendingRef = useRef<ScrollBehavior | null>(null);
  const endedRef = useRef<() => void>(() => {});
  const copiedTimerRef = useRef<number | null>(null);

  useEffect(() => {
    versesRef.current = verses;
    currentRef.current = current;
    repeatRef.current = repeat;
    playingRef.current = playing;
  });

  const setLoadedKey = useCallback((key: string | null) => {
    loadedKeyRef.current = key;
    setLoadedKeyState(key);
  }, []);

  /* Preferences, bookmarks, starting verse (?verse=N for surahs, ?id=<verse id> otherwise, else last read, else first). */
  useEffect(() => {
    setPrefsState(getPrefs());
    setTranslation(getTranslationId());
    setReciter(getReciterId());
    setArabic(getArabicSize());
    setBookmarks(getBookmarks());
    setPrefsReady(true);
  }, [scopeKey]);

  /* Chapter list + verses for the scope. */
  useEffect(() => {
    if (!scope || !prefsReady) return;
    let live = true;
    setLoading(true);
    setError(null);
    Promise.all([fetchChapters(), fetchVerses(scope, translationId, reciterId)])
      .then(([chs, vs]) => {
        if (!live) return;
        setChapters(chs);
        setVerses(vs);
        setLoading(false);
        setCurrent((cur) => {
          if (cur && vs.some((v) => v.id === cur)) return cur;
          const q = new URLSearchParams(window.location.search);
          const vn = Number(q.get("verse"));
          const vid = Number(q.get("id"));
          let pick: Verse | undefined;
          if (scope.type === "chapter" && Number.isInteger(vn) && vn > 0) pick = vs.find((v) => v.verse_number === vn);
          else if (Number.isInteger(vid) && vid > 0) pick = vs.find((v) => v.id === vid);
          else if (scope.type === "chapter") {
            const last = getLastRead();
            if (last && last.chapter === scope.id && last.verse > 0) pick = vs.find((v) => v.verse_number === last.verse);
          }
          if (pick && pick.id !== vs[0]?.id) scrollPendingRef.current = "auto";
          return pick?.id ?? vs[0]?.id ?? 0;
        });
      })
      .catch((e: Error) => {
        if (!live) return;
        setError(e.message || "Could not load these verses");
        setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [scope, scopeKey, translationId, reciterId, attempt, prefsReady]);

  /* Word-by-word data only when the mode is on. */
  useEffect(() => {
    if (!scope || !prefs.wordByWord) return;
    let live = true;
    fetchWords(scope)
      .then((m) => live && setWords(m))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [scope, scopeKey, prefs.wordByWord]);

  /* Names for the player / chips (from the cached catalogues). */
  useEffect(() => {
    let live = true;
    Promise.all([fetchRecitations().catch(() => []), fetchTranslationList().catch(() => [])]).then(([rs, ts]) => {
      if (!live) return;
      setNames({ reciter: rs.find((r) => r.id === reciterId)?.name ?? "", translation: ts.find((t) => t.id === translationId)?.name ?? "" });
    });
    return () => {
      live = false;
    };
  }, [reciterId, translationId]);

  /* Scroll to the current verse when a navigation asked for it. */
  useEffect(() => {
    if (!verses) return;
    const behavior = scrollPendingRef.current;
    if (!behavior) return;
    const el = document.getElementById(`verse-${current}`);
    if (!el) return;
    scrollPendingRef.current = null;
    requestAnimationFrame(() => el.scrollIntoView({ block: "center", behavior }));
  }, [current, verses, prefs.mode]);

  /* Persist last-read (debounced). */
  useEffect(() => {
    if (!verses || !current) return;
    const v = verses.find((x) => x.id === current);
    const ch = v ? chapters.find((c) => c.id === v.chapter_id) : undefined;
    if (!v || !ch) return;
    const t = window.setTimeout(() => setLastRead({ chapter: ch.id, verse: v.verse_number, name: ch.name_simple, versesCount: ch.verses_count }), 400);
    return () => window.clearTimeout(t);
  }, [verses, chapters, current]);

  useEffect(() => {
    setTafsir(null);
    setCopied(null);
  }, [current]);

  /* One audio element for the whole reader. */
  useEffect(() => {
    const a = new Audio();
    a.preload = "auto";
    audioRef.current = a;
    const onTime = () => setCurrentTime(a.currentTime);
    const onDur = () => setDuration(Number.isFinite(a.duration) ? a.duration : 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => endedRef.current();
    const onError = () => {
      setPlaying(false);
      setAudioError("Audio unavailable right now");
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onDur);
    a.addEventListener("durationchange", onDur);
    a.addEventListener("play", onPlay);
    a.addEventListener("playing", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onDur);
      a.removeEventListener("durationchange", onDur);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("playing", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onError);
      a.pause();
      a.removeAttribute("src");
      a.load();
      audioRef.current = null;
      if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = repeat.speed;
  }, [repeat.speed]);

  /* ---------- Playback ---------- */

  const indexOf = (vs: Verse[], id: number) => vs.findIndex((v) => v.id === id);

  const selectVerse = useCallback(
    (id: number, scroll: ScrollBehavior | null) => {
      const vs = versesRef.current;
      if (!vs || !vs.length) return;
      const v = vs.find((x) => x.id === id);
      if (!v) return;
      if (scroll) scrollPendingRef.current = scroll;
      setCurrent(id);
      if (!playingRef.current && loadedKeyRef.current !== v.verse_key) {
        setLoadedKey(null);
        setCurrentTime(0);
        setDuration(0);
      }
    },
    [setLoadedKey],
  );

  const playVerse = useCallback(
    (id: number, scroll: ScrollBehavior | null) => {
      const a = audioRef.current;
      const vs = versesRef.current;
      if (!a || !vs || !vs.length) return;
      const v = vs.find((x) => x.id === id);
      if (!v) return;
      if (scroll) scrollPendingRef.current = scroll;
      setCurrent(id);
      if (!v.audio) {
        a.pause();
        setLoadedKey(null);
        setAudioError("No audio for this verse");
        return;
      }
      if (loadedKeyRef.current !== v.verse_key) {
        a.src = v.audio;
        setLoadedKey(v.verse_key);
        setCurrentTime(0);
        setDuration(0);
        playsRef.current = 1;
      }
      a.playbackRate = repeatRef.current.speed;
      setAudioError(null);
      a.play().catch(() => {
        setPlaying(false);
        setAudioError("Could not start playback");
      });
    },
    [setLoadedKey],
  );

  const togglePlay = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playingRef.current) {
      a.pause();
      return;
    }
    playVerse(currentRef.current, null);
  }, [playVerse]);

  const step = useCallback(
    (delta: number) => {
      const vs = versesRef.current;
      if (!vs) return;
      const i = indexOf(vs, currentRef.current) + delta;
      if (i < 0 || i >= vs.length) return;
      if (playingRef.current) playVerse(vs[i].id, "smooth");
      else selectVerse(vs[i].id, "smooth");
    },
    [playVerse, selectVerse],
  );

  // Auto-advance with per-verse repeat and range loop.
  useEffect(() => {
    endedRef.current = () => {
      const a = audioRef.current;
      const vs = versesRef.current;
      if (!a || !vs) return;
      const r = repeatRef.current;
      if (r.each === Infinity || playsRef.current < r.each) {
        playsRef.current++;
        a.currentTime = 0;
        a.play().catch(() => setPlaying(false));
        return;
      }
      const i = indexOf(vs, currentRef.current);
      let next = i + 1;
      if (r.range) {
        const toIdx = indexOf(vs, r.range.to);
        const fromIdx = indexOf(vs, r.range.from);
        if (toIdx !== -1 && fromIdx !== -1 && (i >= toIdx || next > toIdx)) next = fromIdx;
      }
      if (next < vs.length) playVerse(vs[next].id, "smooth");
      else {
        setPlaying(false);
        setCurrentTime(0);
      }
    };
  }, [playVerse]);

  /* ---------- Verse actions ---------- */

  const onVerseTap = useCallback(
    (id: number) => {
      if (playingRef.current) playVerse(id, null);
      else selectVerse(id, null);
    },
    [playVerse, selectVerse],
  );

  const onVersePlay = useCallback(
    (v: Verse) => {
      if (playingRef.current && loadedKeyRef.current === v.verse_key) audioRef.current?.pause();
      else playVerse(v.id, null);
    },
    [playVerse],
  );

  const onBookmark = useCallback(
    (v: Verse) => {
      const ch = chapters.find((c) => c.id === v.chapter_id);
      setBookmarks(toggleBookmark({ verse_key: v.verse_key, chapter: v.chapter_id, verse: v.verse_number, name: ch?.name_simple ?? `Surah ${v.chapter_id}`, text_uthmani: v.text_uthmani, translation: v.translation }));
    },
    [chapters],
  );

  const loadTafsir = useCallback((v: Verse) => {
    setTafsir({ key: v.verse_key, text: null, error: null });
    fetchTafsir(v.verse_key)
      .then((text) => setTafsir((s) => (s?.key === v.verse_key ? { key: v.verse_key, text, error: null } : s)))
      .catch((e: Error) => setTafsir((s) => (s?.key === v.verse_key ? { key: v.verse_key, text: null, error: e.message || "Could not load the tafsir" } : s)));
  }, []);

  const toggleTafsir = useCallback(
    (v: Verse) => {
      if (tafsir?.key === v.verse_key) setTafsir(null);
      else loadTafsir(v);
    },
    [tafsir, loadTafsir],
  );

  const onShare = useCallback(async (v: Verse) => {
    const text = `${v.text_uthmani}\n\n${v.translation}\n— Quran ${v.verse_key} · https://ummah.tengorra.com/quran/${v.chapter_id}?verse=${v.verse_number}`;
    let msg = "Copied";
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ text });
        msg = "Shared";
      } else {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      msg = "Could not share";
    }
    setCopied(msg);
    if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = window.setTimeout(() => setCopied(null), 1600);
  }, []);

  const updatePrefs = (patch: Partial<ReaderPrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefsState(next);
    setPrefs(next);
  };
  const chooseArabic = (px: number) => {
    setArabic(px);
    setArabicSize(px);
  };
  const chooseTranslation = (id: number) => {
    setTranslationId(id);
    setTranslation(id);
  };
  const chooseReciter = (id: number) => {
    setReciterId(id);
    setReciter(id);
    audioRef.current?.pause();
    setLoadedKey(null);
    setCurrentTime(0);
    setDuration(0);
    setAudioError(null);
  };

  /* ---------- Derived ---------- */

  const theme = THEMES[prefs.theme];
  const vars = { "--qr-bg": theme.bg, "--qr-bg2": theme.bg2, "--qr-fg": theme.fg, "--qr-muted": theme.muted, "--qr-line": theme.line, "--qr-accent": theme.accent, "--qr-accent-fg": theme.accentFg, colorScheme: theme.scheme } as CSSProperties;

  if (!scope) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-night px-6 text-center text-ivory">
        <p className="font-display text-[22px]">Not found</p>
        <p className="mt-2 text-[14px] text-ivory/60">Surahs are 1–114, juz 1–30, pages 1–604.</p>
        <Link href="/quran" className="mt-5 inline-flex h-11 items-center rounded-full bg-gold-500 px-5 text-[14px] font-bold text-night">
          Back to the Quran
        </Link>
      </main>
    );
  }

  const chapter = scope.type === "chapter" ? chapters.find((c) => c.id === scope.id) : undefined;
  const currentVerse = verses?.find((v) => v.id === current) ?? null;
  const curIdx = verses && currentVerse ? verses.indexOf(currentVerse) : -1;
  const firstCh = verses?.[0] ? chapters.find((c) => c.id === verses[0].chapter_id) : undefined;
  const lastCh = verses?.length ? chapters.find((c) => c.id === verses[verses.length - 1].chapter_id) : undefined;

  const title = scope.type === "chapter" ? (chapter?.name_simple ?? (loading ? "Loading" : `Surah ${scope.id}`)) : scope.type === "juz" ? `Juz ${scope.id}` : `Page ${scope.id}`;
  const subtitle =
    scope.type === "chapter"
      ? [chapter?.translated_name.name, chapter ? revelationLabel(chapter.revelation_place) : null, verses?.[0] ? `Juz ${verses[0].juz_number}` : null, chapter ? `${chapter.verses_count} verses` : null].filter(Boolean).join(" · ")
      : verses?.length
        ? `${firstCh?.name_simple ?? ""} ${verses[0].verse_number} – ${lastCh?.name_simple ?? ""} ${verses[verses.length - 1].verse_number}`
        : "";

  const prevScope: Scope | null = scope.id > 1 ? { ...scope, id: scope.id - 1 } : null;
  const maxId = scope.type === "chapter" ? 114 : scope.type === "juz" ? 30 : 604;
  const nextScope: Scope | null = scope.id < maxId ? { ...scope, id: scope.id + 1 } : null;
  const nameOfScope = (s: Scope) => (s.type === "chapter" ? (chapters.find((c) => c.id === s.id)?.name_simple ?? `Surah ${s.id}`) : s.type === "juz" ? `Juz ${s.id}` : `Page ${s.id}`);

  const repeatSummary = repeat.range
    ? `Loop ${verses?.find((v) => v.id === repeat.range!.from)?.verse_key ?? ""}–${verses?.find((v) => v.id === repeat.range!.to)?.verse_key ?? ""}`
    : repeat.each !== 1
      ? repeat.each === Infinity
        ? "Repeat ∞"
        : `${repeat.each}× each`
      : null;

  const reciterName = names.reciter || "Reciter";

  return (
    <main className="min-h-dvh pb-[190px]" style={{ ...vars, background: "var(--qr-bg)", color: "var(--qr-fg)" }}>
      <header className="sticky top-0 z-30 border-b px-4 pb-3 backdrop-blur-md" style={{ paddingTop: "max(12px, env(safe-area-inset-top))", borderColor: "var(--qr-line)", background: "color-mix(in srgb, var(--qr-bg) 90%, transparent)" }}>
        <div className="flex items-center gap-2">
          <Link href="/quran" aria-label="Back to the Quran" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--qr-bg2)" }}>
            <IconBack />
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="font-display truncate text-[20px] font-medium leading-tight">{title}</h1>
            <p className="truncate text-[12px]" style={{ color: "var(--qr-muted)" }}>
              {subtitle}
            </p>
          </div>
          {chapter ? (
            <button type="button" onClick={() => setInfoOpen(true)} aria-label="About this surah" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--qr-bg2)" }}>
              <IconInfo size={20} />
            </button>
          ) : (
            <span className="w-11" />
          )}
          <button type="button" onClick={() => setSheet("display")} aria-label="Reading settings" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--qr-bg2)" }}>
            <IconSliders size={20} />
          </button>
        </div>
      </header>

      <div className="-mx-0 flex gap-2 overflow-x-auto px-4 pt-3 [scrollbar-width:none]">
        <div role="group" aria-label="Mode" className="flex shrink-0 rounded-full p-0.5" style={{ background: "var(--qr-bg2)" }}>
          {(
            [
              ["translation", "Translation"],
              ["reading", "Reading"],
            ] as const
          ).map(([v, label]) => (
            <button key={v} type="button" aria-pressed={prefs.mode === v} onClick={() => updatePrefs({ mode: v })} className="h-7 rounded-full px-3 text-[12px] font-bold" style={prefs.mode === v ? { background: "var(--qr-accent)", color: "var(--qr-accent-fg)" } : { color: "var(--qr-muted)" }}>
              {label}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setSheet("translation")} className="inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-[12px] font-semibold" style={{ borderColor: "var(--qr-line)", background: "var(--qr-bg2)" }}>
          {names.translation ? names.translation.split(" (")[0] : "Translation"}
        </button>
        <button type="button" onClick={() => setSheet("reciter")} className="inline-flex h-8 shrink-0 items-center rounded-full border px-3 text-[12px] font-semibold" style={{ borderColor: "var(--qr-line)", background: "var(--qr-bg2)" }}>
          {reciterName.split(" (")[0]}
        </button>
        {prefs.wordByWord && prefs.mode === "translation" && (
          <span className="inline-flex h-8 shrink-0 items-center rounded-full px-3 text-[12px] font-bold" style={{ background: "color-mix(in srgb, var(--qr-accent) 15%, transparent)", color: "var(--qr-accent)" }}>
            Word by word
          </span>
        )}
        {prefs.tajweed && (
          <span className="inline-flex h-8 shrink-0 items-center rounded-full px-3 text-[12px] font-bold" style={{ background: "color-mix(in srgb, var(--qr-accent) 15%, transparent)", color: "var(--qr-accent)" }}>
            Tajweed
          </span>
        )}
      </div>

      <section className="px-4 pt-4" aria-label="Verses">
        {error && !verses && (
          <div className="rounded-[22px] border p-4 text-center" style={{ borderColor: "var(--qr-line)", background: "var(--qr-bg2)" }}>
            <p className="text-[14px]">{error}. Check your connection and try again.</p>
            <button type="button" onClick={() => setAttempt((a) => a + 1)} className="mt-3 inline-flex h-10 items-center rounded-full px-5 text-[13px] font-bold" style={{ background: "var(--qr-accent)", color: "var(--qr-accent-fg)" }}>
              Retry
            </button>
          </div>
        )}

        {!verses && !error && (
          <div className="space-y-3" aria-busy="true" aria-label="Loading verses">
            <div className="mx-auto h-8 w-2/3 animate-pulse rounded" style={{ background: "var(--qr-bg2)" }} />
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="rounded-[22px] p-4">
                <div className="ml-auto h-7 w-[90%] animate-pulse rounded" style={{ background: "var(--qr-bg2)" }} />
                <div className="ml-auto mt-3 h-7 w-[70%] animate-pulse rounded" style={{ background: "var(--qr-bg2)" }} />
                <div className="mt-4 h-3.5 w-full animate-pulse rounded" style={{ background: "var(--qr-bg2)" }} />
              </div>
            ))}
          </div>
        )}

        {verses && (
          <>
            {error && (
              <p className="mb-3 text-center text-[12px]" style={{ color: "var(--qr-accent)" }}>
                {error}.{" "}
                <button type="button" onClick={() => setAttempt((a) => a + 1)} className="font-bold underline underline-offset-2">
                  Retry
                </button>
              </p>
            )}
            {loading && !error && (
              <p className="mb-3 text-center text-[12px]" style={{ color: "var(--qr-muted)" }}>
                Updating…
              </p>
            )}

            {prefs.mode === "reading" ? (
              <ReadingView verses={verses} chapters={chapters} currentId={current} arabicSize={arabicSize} tajweed={prefs.tajweed} onSelect={onVerseTap} />
            ) : (
              <ol className="space-y-2">
                {verses.map((v, i) => {
                  const showHeader = v.verse_number === 1 && (scope.type !== "chapter" || i === 0);
                  const ch = showHeader ? chapters.find((c) => c.id === v.chapter_id) : undefined;
                  return (
                    <li key={v.verse_key} className="list-none">
                      {showHeader && (
                        <div className="mb-3 mt-2 text-center">
                          {scope.type !== "chapter" && ch && (
                            <Link href={`/quran/${ch.id}`} className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[13px] font-bold" style={{ borderColor: "var(--qr-accent)", color: "var(--qr-accent)" }}>
                              <span className="font-arabic text-[16px]" lang="ar">
                                {ch.name_arabic}
                              </span>
                              {ch.name_simple}
                            </Link>
                          )}
                          {hasBismillah(v.chapter_id) && (
                            <p className="font-arabic mt-3 text-[24px] leading-[1.9]" dir="rtl" lang="ar" style={{ color: "var(--qr-accent)" }}>
                              {BISMILLAH}
                            </p>
                          )}
                        </div>
                      )}
                      <ol>
                        <VerseRow
                          verse={v}
                          words={words?.get(v.verse_key)}
                          isCurrent={v.id === current}
                          arabicSize={arabicSize}
                          translationSize={prefs.translationSize}
                          wordByWord={prefs.wordByWord}
                          transliteration={prefs.transliteration}
                          tajweed={prefs.tajweed}
                          bookmarked={isBookmarked(v.verse_key, bookmarks)}
                          isPlaying={playing && loadedKey === v.verse_key}
                          tafsir={v.id === current ? tafsir : null}
                          copied={v.id === current ? copied : null}
                          onSelect={onVerseTap}
                          onPlay={onVersePlay}
                          onBookmark={onBookmark}
                          onToggleTafsir={toggleTafsir}
                          onLoadTafsir={loadTafsir}
                          onShare={onShare}
                        />
                      </ol>
                    </li>
                  );
                })}
              </ol>
            )}

            {/* Selected-verse actions in reading mode */}
            {prefs.mode === "reading" && currentVerse && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl border px-3 py-2.5" style={{ borderColor: "var(--qr-line)", background: "var(--qr-bg2)" }}>
                <span className="text-[12px] font-bold" style={{ color: "var(--qr-muted)" }}>
                  {currentVerse.verse_key}
                </span>
                <span className="flex-1 truncate text-[12px]" style={{ color: "var(--qr-fg)" }}>
                  {currentVerse.translation}
                </span>
                <button type="button" onClick={() => onBookmark(currentVerse)} className="text-[12px] font-bold" style={{ color: "var(--qr-accent)" }}>
                  {isBookmarked(currentVerse.verse_key, bookmarks) ? "Saved" : "Save"}
                </button>
              </div>
            )}

            <nav aria-label="Continue" className="mt-6 grid grid-cols-2 gap-2">
              {prevScope ? (
                <Link href={scopePath(prevScope)} className="flex h-12 items-center gap-1 rounded-2xl px-3 text-[13px] font-bold" style={{ background: "var(--qr-bg2)" }}>
                  <IconChevronLeft size={18} />
                  <span className="truncate">{nameOfScope(prevScope)}</span>
                </Link>
              ) : (
                <span />
              )}
              {nextScope && (
                <Link href={scopePath(nextScope)} className="flex h-12 items-center justify-end gap-1 rounded-2xl px-3 text-[13px] font-bold" style={{ background: "var(--qr-accent)", color: "var(--qr-accent-fg)" }}>
                  <span className="truncate">{nameOfScope(nextScope)}</span>
                  <IconChevronRight size={18} />
                </Link>
              )}
            </nav>
          </>
        )}
      </section>

      {verses && verses.length > 0 && currentVerse && (
        <AudioPlayer
          reciterName={reciterName}
          reciterInitials={initials(reciterName)}
          verseLabel={currentVerse.verse_key}
          currentTime={currentTime}
          duration={duration}
          playing={playing}
          repeatSummary={repeatSummary}
          speed={repeat.speed}
          canPrev={curIdx > 0}
          canNext={curIdx !== -1 && curIdx < verses.length - 1}
          error={audioError}
          onToggle={togglePlay}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onRepeatPress={() => setRepeatOpen(true)}
          onSeek={(s) => {
            const a = audioRef.current;
            if (a && loadedKeyRef.current) a.currentTime = s;
          }}
          onReciterPress={() => setSheet("reciter")}
        />
      )}

      {sheet && <ReaderSettings prefs={prefs} onPrefs={updatePrefs} arabicSize={arabicSize} onArabicSize={chooseArabic} translationId={translationId} onTranslation={chooseTranslation} reciterId={reciterId} onReciter={chooseReciter} initialTab={sheet} onClose={() => setSheet(null)} />}
      {repeatOpen && verses && <RepeatSheet value={repeat} verses={verses} currentId={current} onChange={(patch) => setRepeat((r) => ({ ...r, ...patch }))} onClose={() => setRepeatOpen(false)} />}
      {infoOpen && chapter && <InfoSheet chapter={chapter} onClose={() => setInfoOpen(false)} />}
    </main>
  );
}
