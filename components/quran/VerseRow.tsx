"use client";

import { memo } from "react";
import { IconBookmark, IconClose, IconCopy, IconPause, IconPlay, IconShare } from "@/components/Icons";
import { AyahMark, TajweedText, WordByWord } from "./ArabicText";
import type { Verse, Word } from "@/lib/quran";

export type TafsirState = { key: string; text: string | null; error: string | null };

export type VerseRowProps = {
  verse: Verse;
  words?: Word[];
  isCurrent: boolean;
  arabicSize: number;
  translationSize: number;
  wordByWord: boolean;
  transliteration: boolean;
  tajweed: boolean;
  memorise: boolean;
  revealed: boolean; // memorise mode: this verse has been tapped open
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
  onCopy: (v: Verse) => void;
};

/** Translation-mode row. Memoised so audio time updates don't re-render 286 rows. */
const VerseRow = memo(function VerseRow({
  verse,
  words,
  isCurrent,
  arabicSize,
  translationSize,
  wordByWord,
  transliteration,
  tajweed,
  memorise,
  revealed,
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
  onCopy,
}: VerseRowProps) {
  const tafsirOpen = isCurrent && tafsir?.key === verse.verse_key;
  const hidden = memorise && !revealed;
  const hideTranslation = memorise;

  return (
    <li
      id={`verse-${verse.id}`}
      className="rounded-[22px] border p-4 transition-colors"
      style={isCurrent ? { borderColor: "color-mix(in srgb, var(--qr-accent) 35%, transparent)", background: "color-mix(in srgb, var(--qr-accent) 9%, transparent)" } : { borderColor: "transparent" }}
    >
      <button type="button" onClick={() => onSelect(verse.id)} aria-current={isCurrent ? "true" : undefined} className="relative block w-full overflow-hidden rounded-[14px] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60">
        {hidden && (
          <span className="absolute inset-0 z-10 flex items-center justify-center rounded-[14px] text-[12px] font-bold" style={{ background: "var(--qr-bg2)", color: "var(--qr-muted)" }}>
            Verse {verse.verse_number} · tap to reveal
          </span>
        )}
        {wordByWord ? (
          <WordByWord verse={verse} words={words} arabicSize={arabicSize} transliteration={transliteration} tajweed={tajweed} />
        ) : (
          <span className="font-arabic block text-right" dir="rtl" lang="ar" style={{ fontSize: arabicSize, lineHeight: 1.9, color: "var(--qr-fg)" }}>
            <TajweedText verse={verse} enabled={tajweed} />
            <AyahMark n={verse.verse_number} />
          </span>
        )}
        {!hideTranslation && (
          <span className="mt-2 block leading-relaxed" style={{ fontSize: translationSize, color: isCurrent ? "var(--qr-fg)" : "var(--qr-muted)" }}>
            {verse.translation}
          </span>
        )}
      </button>

      {isCurrent && (
        <>
          <div className="mt-3 flex items-center gap-2">
            <button type="button" onClick={() => onPlay(verse)} aria-label={isPlaying ? `Pause verse ${verse.verse_number}` : `Play verse ${verse.verse_number}`} className="flex h-10 w-10 items-center justify-center rounded-full active:scale-95" style={{ background: "var(--qr-accent)", color: "var(--qr-accent-fg)" }}>
              {isPlaying ? <IconPause size={18} /> : <IconPlay size={20} />}
            </button>
            <button type="button" onClick={() => onBookmark(verse)} aria-pressed={bookmarked} aria-label={bookmarked ? "Remove bookmark" : "Bookmark this verse"} className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--qr-bg2)", color: bookmarked ? "var(--qr-accent)" : "var(--qr-fg)" }}>
              <IconBookmark size={20} fill={bookmarked ? "currentColor" : "none"} />
            </button>
            <button type="button" onClick={() => onToggleTafsir(verse)} aria-expanded={tafsirOpen} className="inline-flex h-10 items-center rounded-full border px-4 text-[13px] font-bold" style={tafsirOpen ? { background: "var(--qr-accent)", color: "var(--qr-accent-fg)", borderColor: "transparent" } : { borderColor: "color-mix(in srgb, var(--qr-accent) 45%, transparent)", color: "var(--qr-accent)", background: "var(--qr-bg2)" }}>
              Tafsir
            </button>
            <span className="flex-1" />
            <button type="button" onClick={() => onCopy(verse)} aria-label="Copy verse text" className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--qr-bg2)", color: "var(--qr-fg)" }}>
              <IconCopy size={19} />
            </button>
            <button type="button" onClick={() => onShare(verse)} aria-label="Share verse as image" className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--qr-bg2)", color: "var(--qr-fg)" }}>
              <IconShare size={20} />
            </button>
          </div>
          {copied && (
            <p role="status" className="mt-2 text-right text-[12px] font-semibold" style={{ color: "var(--qr-accent)" }}>
              {copied}
            </p>
          )}

          {tafsirOpen && tafsir && (
            <div className="mt-3 rounded-[16px] border p-3" role="region" aria-label="Tafsir Ibn Kathir" style={{ borderColor: "var(--qr-line)", background: "var(--qr-bg2)" }}>
              <div className="flex items-center justify-between">
                <p className="label" style={{ color: "var(--qr-accent)" }}>
                  Tafsir Ibn Kathir
                </p>
                <button type="button" onClick={() => onToggleTafsir(verse)} aria-label="Close tafsir" className="flex h-8 w-8 items-center justify-center rounded-full" style={{ color: "var(--qr-muted)" }}>
                  <IconClose size={16} />
                </button>
              </div>
              {tafsir.text === null && tafsir.error === null && (
                <div className="mt-2 space-y-2" aria-busy="true" aria-label="Loading tafsir">
                  <div className="h-3 w-full animate-pulse rounded" style={{ background: "var(--qr-line)" }} />
                  <div className="h-3 w-11/12 animate-pulse rounded" style={{ background: "var(--qr-line)" }} />
                  <div className="h-3 w-4/5 animate-pulse rounded" style={{ background: "var(--qr-line)" }} />
                </div>
              )}
              {tafsir.error && (
                <p className="mt-2 text-[13px]" style={{ color: "var(--qr-muted)" }}>
                  {tafsir.error}.{" "}
                  <button type="button" onClick={() => onLoadTafsir(verse)} className="font-bold underline underline-offset-2" style={{ color: "var(--qr-accent)" }}>
                    Retry
                  </button>
                </p>
              )}
              {tafsir.text && (
                <div className="mt-2 max-h-[320px] space-y-2.5 overflow-y-auto pr-1 text-[13px] leading-relaxed" style={{ color: "var(--qr-fg)" }}>
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

export default VerseRow;
