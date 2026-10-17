"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import AudioPlayer from "@/components/AudioPlayer";
import { IconBack, IconBookmark, IconCheck, IconClose, IconPause, IconPlay, IconShare } from "@/components/Icons";
import { toArabicIndic } from "@/lib/prayer";
import {
  ARABIC_SIZES,
  BISMILLAH,
  DEFAULT_ARABIC_SIZE,
  DEFAULT_RECITER,
  DEFAULT_TRANSLATION,
  RECITERS,
  TRANSLATIONS,
  fetchChapterVerses,
  fetchChapters,
  fetchTafsir,
  getArabicSize,
  getBookmarks,
  getLastRead,
  getReciterId,
  getTranslationId,
  hasBismillah,
  isBookmarked,
  revelationLabel,
  setArabicSize,
  setLastRead,
  setReciterId,
  setTranslationId,
  toggleBookmark,
  type Bookmark,
  type Chapter,
  type Verse,
} from "@/lib/quran";

type TafsirState = { key: string; text: string | null; error: string | null };

/* ---------- Verse row (memoised so audio time updates do not re-render 286 rows) ---------- */

type VerseRowProps = {
  verse: Verse;
  isCurrent: boolean;
  arabicSize: number;
  bookmarked: boolean;
  isPlaying: boolean;
  tafsir: TafsirState | null;
  copied: string | null;
  onSelect: (n: number) => void;
  onPlay: (v: Verse) => void;
  onBookmark: (v: Verse) => void;
  onToggleTafsir: (v: Verse) => void;
  onLoadTafsir: (v: Verse) => void;
  onShare: (v: Verse) => void;
};

const VerseRow = memo(function VerseRow({
  verse,
  isCurrent,
  arabicSize,
  bookmarked,
  isPlaying,
  tafsir,
  copied,
  onSelect,
  onPlay,
  onBookmark,
  onToggleTafsir,
  onLoadTafsir,
  onShare,
}: VerseRowProps) {
  const tafsirOpen = isCurrent && tafsir?.key === verse.verse_key;

  return (
    <li
      id={`verse-${verse.verse_number}`}
      className={`rounded-[22px] border p-4 transition-colors ${
        isCurrent ? "border-gold-500/[0.28] bg-gold-500/[0.08]" : "border-transparent"
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(verse.verse_number)}
        aria-current={isCurrent ? "true" : undefined}
        className="block w-full rounded-[14px] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60"
      >
        <span
          className="font-arabic block text-right text-ivory"
          dir="rtl"
          lang="ar"
          style={{ fontSize: `${arabicSize}px`, lineHeight: 1.9 }}
        >
          {verse.text_uthmani}
          <span className="mx-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-gold-500 align-middle text-[13px] leading-none text-gold-200">
            {toArabicIndic(verse.verse_number)}
          </span>
        </span>
        <span className={`mt-2 block text-[14px] leading-relaxed ${isCurrent ? "text-ivory/[0.78]" : "text-ivory/[0.62]"}`}>
          {verse.translation}
        </span>
      </button>

      {isCurrent && (
        <>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPlay(verse)}
              aria-label={isPlaying ? `Pause verse ${verse.verse_number}` : `Play verse ${verse.verse_number}`}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-500 text-night active:scale-95"
            >
              {isPlaying ? <IconPause size={18} /> : <IconPlay size={20} />}
            </button>
            <button
              type="button"
              onClick={() => onBookmark(verse)}
              aria-pressed={bookmarked}
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark this verse"}
              className={`flex h-10 w-10 items-center justify-center rounded-full bg-white/5 ${bookmarked ? "text-gold-500" : "text-ivory/80"}`}
            >
              <IconBookmark size={20} fill={bookmarked ? "currentColor" : "none"} />
            </button>
            <button
              type="button"
              onClick={() => onToggleTafsir(verse)}
              aria-expanded={tafsirOpen}
              className={`inline-flex h-10 items-center rounded-full px-4 text-[13px] font-bold ${
                tafsirOpen ? "bg-gold-500 text-night" : "border border-gold-500/40 bg-white/5 text-gold-200"
              }`}
            >
              Tafsir
            </button>
            <span className="flex-1" />
            <button
              type="button"
              onClick={() => onShare(verse)}
              aria-label="Copy verse and translation"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-ivory/80"
            >
              <IconShare size={20} />
            </button>
          </div>
          {copied && (
            <p role="status" className="mt-2 text-right text-[12px] font-semibold text-gold-200">
              {copied}
            </p>
          )}

          {tafsirOpen && tafsir && (
            <div className="mt-3 rounded-[16px] border border-white/10 bg-white/5 p-3" role="region" aria-label="Tafsir Ibn Kathir">
              <div className="flex items-center justify-between">
                <p className="label text-gold-500">Tafsir Ibn Kathir</p>
                <button
                  type="button"
                  onClick={() => onToggleTafsir(verse)}
                  aria-label="Close tafsir"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-ivory/60 active:bg-white/10"
                >
                  <IconClose size={16} />
                </button>
              </div>
              {tafsir.text === null && tafsir.error === null && (
                <div className="mt-2 space-y-2" aria-busy="true" aria-label="Loading tafsir">
                  <div className="h-3 w-full animate-pulse rounded bg-white/5" />
                  <div className="h-3 w-11/12 animate-pulse rounded bg-white/5" />
                  <div className="h-3 w-4/5 animate-pulse rounded bg-white/5" />
                </div>
              )}
              {tafsir.error && (
                <p className="mt-2 text-[13px] text-ivory/75">
                  {tafsir.error}.{" "}
                  <button type="button" onClick={() => onLoadTafsir(verse)} className="font-bold text-gold-200 underline underline-offset-2">
                    Retry
                  </button>
                </p>
              )}
              {tafsir.text && (
                <div className="mt-2 max-h-[320px] space-y-2.5 overflow-y-auto pr-1 text-[13px] leading-relaxed text-ivory/75">
                  {tafsir.text.split("\n\n").map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </li>
  );
});

/* ---------- Page ---------- */

export default function SurahReaderPage() {
  const params = useParams<{ id: string }>();
  const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const chapterId = Number(rawId);
  const validId = Number.isInteger(chapterId) && chapterId >= 1 && chapterId <= 114;

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [verses, setVerses] = useState<Verse[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const [prefsReady, setPrefsReady] = useState(false);
  const [current, setCurrent] = useState(1);
  const [translationId, setTranslation] = useState(DEFAULT_TRANSLATION);
  const [reciterId, setReciter] = useState(DEFAULT_RECITER);
  const [arabicSize, setArabic] = useState(DEFAULT_ARABIC_SIZE);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [tafsir, setTafsir] = useState<TafsirState | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);

  const [playing, setPlaying] = useState(false);
  const [loadedKey, setLoadedKeyState] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeat, setRepeat] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [audioError, setAudioError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadedKeyRef = useRef<string | null>(null);
  const versesRef = useRef<Verse[] | null>(null);
  const currentRef = useRef(1);
  const repeatRef = useRef(false);
  const speedRef = useRef(1);
  const playingRef = useRef(false);
  const scrollPendingRef = useRef<ScrollBehavior | null>(null);
  const endedRef = useRef<() => void>(() => {});
  const copiedTimerRef = useRef<number | null>(null);

  // Mirror the latest state into refs for the audio event handlers.
  useEffect(() => {
    versesRef.current = verses;
    currentRef.current = current;
    repeatRef.current = repeat;
    speedRef.current = speed;
    playingRef.current = playing;
  });

  const setLoadedKey = useCallback((key: string | null) => {
    loadedKeyRef.current = key;
    setLoadedKeyState(key);
  }, []);

  /* Preferences, bookmarks, and the starting verse (?verse=N, else last read, else 1). */
  useEffect(() => {
    setTranslation(getTranslationId());
    setReciter(getReciterId());
    setArabic(getArabicSize());
    setBookmarks(getBookmarks());

    let initial = 1;
    const q = new URLSearchParams(window.location.search).get("verse");
    const qn = q ? Number(q) : NaN;
    if (Number.isInteger(qn) && qn > 0) {
      initial = qn;
    } else {
      const last = getLastRead();
      if (last && last.chapter === chapterId && last.verse > 0) initial = last.verse;
    }
    setCurrent(initial);
    if (initial > 1) scrollPendingRef.current = "auto";
    setPrefsReady(true);
  }, [chapterId]);

  /* Chapter meta + all verses for the chosen translation/reciter. */
  useEffect(() => {
    if (!validId || !prefsReady) return;
    let live = true;
    setLoading(true);
    setError(null);
    Promise.all([fetchChapters(), fetchChapterVerses(chapterId, translationId, reciterId)])
      .then(([chapters, vs]) => {
        if (!live) return;
        setChapter(chapters.find((c) => c.id === chapterId) ?? null);
        setVerses(vs);
        setLoading(false);
      })
      .catch((e: Error) => {
        if (!live) return;
        setError(e.message || "Could not load this surah");
        setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [chapterId, translationId, reciterId, attempt, validId, prefsReady]);

  /* Keep the current verse inside the surah once we know its length. */
  useEffect(() => {
    if (verses && current > verses.length) setCurrent(verses.length);
  }, [verses, current]);

  /* Scroll to the current verse when a navigation asked for it. */
  useEffect(() => {
    if (!verses) return;
    const behavior = scrollPendingRef.current;
    if (!behavior) return;
    const el = document.getElementById(`verse-${current}`);
    if (!el) return; // wait for the clamp/render, flag stays set
    scrollPendingRef.current = null;
    requestAnimationFrame(() => el.scrollIntoView({ block: "center", behavior }));
  }, [current, verses]);

  /* Persist last-read position (debounced). */
  useEffect(() => {
    if (!chapter || !verses) return;
    const t = window.setTimeout(() => setLastRead({ chapter: chapter.id, verse: current, name: chapter.name_simple, versesCount: chapter.verses_count }), 400);
    return () => window.clearTimeout(t);
  }, [chapter, verses, current]);

  /* Close the tafsir panel and the copy toast when the verse changes. */
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
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  /* ---------- Playback ---------- */

  const selectVerse = useCallback(
    (n: number, scroll: ScrollBehavior | null) => {
      const vs = versesRef.current;
      if (!vs || vs.length === 0) return;
      const clamped = Math.min(Math.max(1, n), vs.length);
      if (scroll) scrollPendingRef.current = scroll;
      setCurrent(clamped);
      // Paused on a different verse: forget it so the next Play starts the selected verse from the top.
      if (!playingRef.current && loadedKeyRef.current !== vs[clamped - 1].verse_key) {
        setLoadedKey(null);
        setCurrentTime(0);
        setDuration(0);
      }
    },
    [setLoadedKey],
  );

  const playVerse = useCallback(
    (n: number, scroll: ScrollBehavior | null) => {
      const a = audioRef.current;
      const vs = versesRef.current;
      if (!a || !vs || vs.length === 0) return;
      const clamped = Math.min(Math.max(1, n), vs.length);
      const v = vs[clamped - 1];
      if (scroll) scrollPendingRef.current = scroll;
      setCurrent(clamped);
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
      }
      a.playbackRate = speedRef.current;
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
      const n = currentRef.current + delta;
      if (n < 1 || n > vs.length) return;
      if (playingRef.current) playVerse(n, "smooth");
      else selectVerse(n, "smooth");
    },
    [playVerse, selectVerse],
  );

  // Auto-advance on 'ended' (or repeat); stop at the end of the surah.
  useEffect(() => {
    endedRef.current = () => {
      const a = audioRef.current;
      const vs = versesRef.current;
      if (!a || !vs) return;
      if (repeatRef.current) {
        a.currentTime = 0;
        a.play().catch(() => setPlaying(false));
        return;
      }
      const next = currentRef.current + 1;
      if (next <= vs.length) playVerse(next, "smooth");
      else {
        setPlaying(false);
        setCurrentTime(0);
      }
    };
  }, [playVerse]);

  /* ---------- Verse actions ---------- */

  const onVerseTap = useCallback(
    (n: number) => {
      if (playingRef.current) playVerse(n, null);
      else selectVerse(n, null);
    },
    [playVerse, selectVerse],
  );

  const onVersePlay = useCallback(
    (v: Verse) => {
      if (playingRef.current && loadedKeyRef.current === v.verse_key) audioRef.current?.pause();
      else playVerse(v.verse_number, null);
    },
    [playVerse],
  );

  const onBookmark = useCallback(
    (v: Verse) => {
      if (!chapter) return;
      setBookmarks(
        toggleBookmark({
          verse_key: v.verse_key,
          chapter: chapter.id,
          verse: v.verse_number,
          name: chapter.name_simple,
          text_uthmani: v.text_uthmani,
          translation: v.translation,
        }),
      );
    },
    [chapter],
  );

  const loadTafsir = useCallback((v: Verse) => {
    setTafsir({ key: v.verse_key, text: null, error: null });
    fetchTafsir(v.verse_key)
      .then((text) => setTafsir((s) => (s?.key === v.verse_key ? { key: v.verse_key, text, error: null } : s)))
      .catch((e: Error) =>
        setTafsir((s) => (s?.key === v.verse_key ? { key: v.verse_key, text: null, error: e.message || "Could not load the tafsir" } : s)),
      );
  }, []);

  const toggleTafsir = useCallback(
    (v: Verse) => {
      setTafsir((s) => {
        if (s?.key === v.verse_key) return null;
        return s;
      });
      if (tafsir?.key !== v.verse_key) loadTafsir(v);
    },
    [tafsir, loadTafsir],
  );

  const onShare = useCallback(async (v: Verse) => {
    const text = `${v.text_uthmani} — ${v.translation} (${v.verse_key})`;
    let msg = "Copied";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      msg = "Could not copy";
    }
    setCopied(msg);
    if (copiedTimerRef.current) window.clearTimeout(copiedTimerRef.current);
    copiedTimerRef.current = window.setTimeout(() => setCopied(null), 1600);
  }, []);

  const cycleArabicSize = () => {
    const sizes = ARABIC_SIZES as readonly number[];
    const next = sizes[(sizes.indexOf(arabicSize) + 1) % sizes.length];
    setArabic(next);
    setArabicSize(next);
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

  /* ---------- Render ---------- */

  if (!validId) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-night px-6 text-center text-ivory">
        <p className="font-display text-[22px]">Surah not found</p>
        <p className="mt-2 text-[14px] text-ivory/60">Surahs are numbered 1 to 114.</p>
        <Link href="/quran" className="mt-5 inline-flex h-11 items-center rounded-full bg-gold-500 px-5 text-[14px] font-bold text-night">
          Back to the Quran
        </Link>
      </main>
    );
  }

  const translation = TRANSLATIONS.find((t) => t.id === translationId) ?? TRANSLATIONS[0];
  const reciter = RECITERS.find((r) => r.id === reciterId) ?? RECITERS[0];
  const juz = verses?.[0]?.juz_number;
  const subtitle = [`Surah ${chapterId}`, juz ? `Juz ${juz}` : null, chapter ? revelationLabel(chapter.revelation_place) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="min-h-dvh bg-night pb-[190px] text-ivory">
      <header
        className="sticky top-0 z-30 border-b border-white/[0.06] bg-night/90 px-4 pb-3 backdrop-blur-md"
        style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-2">
          <Link
            href="/quran"
            aria-label="Back to surah list"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/5 text-ivory active:bg-white/10"
          >
            <IconBack />
          </Link>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="font-display truncate text-[20px] font-medium leading-tight">
              {chapter?.name_simple ?? (loading ? "Loading" : `Surah ${chapterId}`)}
            </h1>
            <p className="text-[12px] text-ivory/55">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={cycleArabicSize}
            aria-label={`Arabic text size ${arabicSize} pixels. Change size`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/5 text-[15px] font-bold text-ivory active:bg-white/10"
          >
            Aa
          </button>
        </div>
      </header>

      <div className="flex gap-2 px-4 pt-3">
        <button
          type="button"
          onClick={() => setSheet(true)}
          className="inline-flex h-8 items-center rounded-full border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-ivory/80"
        >
          Translation · {translation.short}
        </button>
        <button
          type="button"
          onClick={() => setSheet(true)}
          className="inline-flex h-8 items-center rounded-full border border-white/10 bg-white/5 px-3 text-[12px] font-semibold text-ivory/80"
        >
          Reciter · {reciter.short}
        </button>
      </div>

      <section className="px-4 pt-4" aria-label="Verses">
        {error && !verses && (
          <div className="rounded-[22px] border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-[14px] text-ivory/80">{error}. Check your connection and try again.</p>
            <button
              type="button"
              onClick={() => setAttempt((a) => a + 1)}
              className="mt-3 inline-flex h-10 items-center rounded-full bg-gold-500 px-5 text-[13px] font-bold text-night"
            >
              Retry
            </button>
          </div>
        )}

        {!verses && !error && (
          <div className="space-y-3" aria-busy="true" aria-label="Loading verses">
            <div className="mx-auto h-8 w-2/3 animate-pulse rounded bg-white/5" />
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="rounded-[22px] p-4">
                <div className="ml-auto h-7 w-[90%] animate-pulse rounded bg-white/5" />
                <div className="ml-auto mt-3 h-7 w-[70%] animate-pulse rounded bg-white/5" />
                <div className="mt-4 h-3.5 w-full animate-pulse rounded bg-white/5" />
                <div className="mt-2 h-3.5 w-3/4 animate-pulse rounded bg-white/5" />
              </div>
            ))}
          </div>
        )}

        {verses && (
          <>
            {hasBismillah(chapterId) && (
              <p className="font-arabic mb-4 text-center text-[24px] leading-[1.9] text-gold-500" dir="rtl" lang="ar">
                {BISMILLAH}
              </p>
            )}
            {error && (
              <p className="mb-3 text-center text-[12px] text-gold-200">
                {error}.{" "}
                <button type="button" onClick={() => setAttempt((a) => a + 1)} className="font-bold underline underline-offset-2">
                  Retry
                </button>
              </p>
            )}
            {loading && !error && <p className="mb-3 text-center text-[12px] text-ivory/50">Updating translation</p>}
            <ol className="space-y-2">
              {verses.map((v) => {
                const isCurrent = v.verse_number === current;
                return (
                  <VerseRow
                    key={v.verse_key}
                    verse={v}
                    isCurrent={isCurrent}
                    arabicSize={arabicSize}
                    bookmarked={isBookmarked(v.verse_key, bookmarks)}
                    isPlaying={playing && loadedKey === v.verse_key}
                    tafsir={isCurrent ? tafsir : null}
                    copied={isCurrent ? copied : null}
                    onSelect={onVerseTap}
                    onPlay={onVersePlay}
                    onBookmark={onBookmark}
                    onToggleTafsir={toggleTafsir}
                    onLoadTafsir={loadTafsir}
                    onShare={onShare}
                  />
                );
              })}
            </ol>
          </>
        )}
      </section>

      {verses && verses.length > 0 && (
        <AudioPlayer
          reciterName={reciter.name}
          reciterInitials={reciter.initials}
          verseNumber={current}
          currentTime={currentTime}
          duration={duration}
          playing={playing}
          repeat={repeat}
          speed={speed}
          canPrev={current > 1}
          canNext={current < verses.length}
          error={audioError}
          onToggle={togglePlay}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onToggleRepeat={() => setRepeat((r) => !r)}
          onToggleSpeed={() => setSpeed((s) => (s === 1 ? 0.75 : 1))}
          onSeek={(s) => {
            const a = audioRef.current;
            if (a && loadedKeyRef.current) a.currentTime = s;
          }}
          onReciterPress={() => setSheet(true)}
        />
      )}

      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button type="button" aria-label="Close settings" onClick={() => setSheet(false)} className="absolute inset-0 bg-black/60" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Reading settings"
            className="relative w-full max-w-[430px] rounded-t-[28px] bg-night-2 px-5 pt-3 shadow-sheet"
            style={{ paddingBottom: "calc(28px + env(safe-area-inset-bottom))" }}
          >
            <div className="mx-auto h-1 w-10 rounded-full bg-white/20" />
            <div className="mt-3 flex items-center justify-between">
              <h2 className="font-display text-[20px] font-medium">Reading settings</h2>
              <button
                type="button"
                onClick={() => setSheet(false)}
                aria-label="Close"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-ivory"
              >
                <IconClose size={18} />
              </button>
            </div>

            <p className="label mt-5 text-ivory/50">Translation</p>
            <div className="mt-2 space-y-1.5">
              {TRANSLATIONS.map((t) => {
                const active = t.id === translationId;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => chooseTranslation(t.id)}
                    aria-pressed={active}
                    className={`flex h-12 w-full items-center justify-between rounded-[14px] px-4 text-[14px] font-semibold ${
                      active ? "bg-gold-500 text-night" : "bg-white/5 text-ivory"
                    }`}
                  >
                    {t.name}
                    {active && <IconCheck size={18} />}
                  </button>
                );
              })}
            </div>

            <p className="label mt-5 text-ivory/50">Reciter</p>
            <div className="mt-2 space-y-1.5">
              {RECITERS.map((r) => {
                const active = r.id === reciterId;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => chooseReciter(r.id)}
                    aria-pressed={active}
                    className={`flex h-12 w-full items-center justify-between rounded-[14px] px-4 text-[14px] font-semibold ${
                      active ? "bg-gold-500 text-night" : "bg-white/5 text-ivory"
                    }`}
                  >
                    {r.name}
                    {active && <IconCheck size={18} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
