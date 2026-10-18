"use client";

import { memo } from "react";
import { toArabicIndic } from "@/lib/prayer";
import { parseTajweed, TAJWEED_COLORS, type Verse, type Word } from "@/lib/quran";

/** Verse-end marker: the ayah number inside a ring, rendered inline with the text. */
export function AyahMark({ n, size = 28 }: { n: number; size?: number }) {
  return (
    <span
      className="mx-1 inline-flex items-center justify-center rounded-full border align-middle font-sans leading-none"
      style={{ width: size, height: size, fontSize: size * 0.46, borderColor: "var(--qr-accent)", color: "var(--qr-accent)" }}
      aria-label={`verse ${n}`}
    >
      {toArabicIndic(n)}
    </span>
  );
}

/** Arabic with tajweed colouring when available, otherwise plain Uthmani. */
export function TajweedText({ verse, enabled }: { verse: Verse; enabled: boolean }) {
  if (!enabled || !verse.text_tajweed) return <>{verse.text_uthmani}</>;
  const segs = parseTajweed(verse.text_tajweed);
  if (!segs.length) return <>{verse.text_uthmani}</>;
  return (
    <>
      {segs.map((s, i) =>
        s.cls && TAJWEED_COLORS[s.cls] ? (
          <span key={i} style={{ color: TAJWEED_COLORS[s.cls] }}>
            {s.text}
          </span>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}

/**
 * Word-by-word: each Arabic word stacked over its meaning (and transliteration), flowing right-to-left.
 * Falls back to the plain verse while words are loading.
 */
export const WordByWord = memo(function WordByWord({
  verse,
  words,
  arabicSize,
  transliteration,
  tajweed,
}: {
  verse: Verse;
  words: Word[] | undefined;
  arabicSize: number;
  transliteration: boolean;
  tajweed: boolean;
}) {
  if (!words || !words.length) {
    return (
      <span className="font-arabic block text-right" dir="rtl" lang="ar" style={{ fontSize: arabicSize, lineHeight: 1.9, color: "var(--qr-fg)" }}>
        <TajweedText verse={verse} enabled={tajweed} />
        <AyahMark n={verse.verse_number} />
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-end justify-start gap-x-1 gap-y-3" dir="rtl">
      {words.map((w, i) => (
        <span key={i} className="flex min-w-[44px] flex-col items-center rounded-lg px-1 py-0.5" style={{ background: "var(--qr-bg2)" }}>
          <span className="font-arabic leading-[1.5]" lang="ar" style={{ fontSize: arabicSize, color: "var(--qr-fg)" }}>
            {w.text}
          </span>
          {transliteration && w.transliteration && (
            <span className="max-w-[120px] truncate text-center text-[10px] italic leading-tight" dir="ltr" style={{ color: "var(--qr-muted)" }}>
              {w.transliteration}
            </span>
          )}
          <span className="max-w-[120px] text-center text-[11px] font-semibold leading-tight" dir="ltr" style={{ color: "var(--qr-muted)" }}>
            {w.translation}
          </span>
        </span>
      ))}
      <span className="flex items-center self-center">
        <AyahMark n={verse.verse_number} />
      </span>
    </span>
  );
});
