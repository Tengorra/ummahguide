"use client";

import { memo } from "react";
import { AyahMark, TajweedText } from "./ArabicText";
import { BISMILLAH, hasBismillah, type Chapter, type Verse } from "@/lib/quran";

/**
 * Reading (mushaf-style) mode: continuous Arabic, one block per mushaf page, surah headers
 * where a surah begins, verse markers inline. Tap a verse to select it (audio/bookmark act on it).
 */
const ReadingView = memo(function ReadingView({
  verses,
  chapters,
  currentId,
  arabicSize,
  tajweed,
  onSelect,
}: {
  verses: Verse[];
  chapters: Chapter[];
  currentId: number;
  arabicSize: number;
  tajweed: boolean;
  onSelect: (id: number) => void;
}) {
  const pages: { page: number; verses: Verse[] }[] = [];
  for (const v of verses) {
    const last = pages[pages.length - 1];
    if (last && last.page === v.page_number) last.verses.push(v);
    else pages.push({ page: v.page_number, verses: [v] });
  }
  const nameOf = (id: number) => chapters.find((c) => c.id === id);

  return (
    <div className="flex flex-col gap-5">
      {pages.map(({ page, verses: vs }) => (
        <section key={page} aria-label={`Page ${page}`} className="rounded-[22px] border px-4 pb-4 pt-3" style={{ borderColor: "var(--qr-line)", background: "var(--qr-bg2)" }}>
          <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--qr-muted)" }}>
            Page {page}
          </p>
          <p className="font-arabic text-justify" dir="rtl" lang="ar" style={{ fontSize: arabicSize, lineHeight: 2, color: "var(--qr-fg)" }}>
            {vs.map((v) => {
              const ch = v.verse_number === 1 ? nameOf(v.chapter_id) : undefined;
              const active = v.id === currentId;
              return (
                <span key={v.id}>
                  {ch && (
                    <span className="my-3 block text-center" dir="rtl">
                      <span className="inline-block rounded-full border px-5 py-1 font-arabic text-[0.85em]" style={{ borderColor: "var(--qr-accent)", color: "var(--qr-accent)" }}>
                        سورة {ch.name_arabic}
                      </span>
                      {hasBismillah(ch.id) && (
                        <span className="mt-2 block text-center text-[0.95em]" style={{ color: "var(--qr-accent)" }}>
                          {BISMILLAH}
                        </span>
                      )}
                    </span>
                  )}
                  <span
                    id={`verse-${v.id}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect(v.id)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(v.id)}
                    className="rounded-md"
                    style={active ? { background: "color-mix(in srgb, var(--qr-accent) 18%, transparent)" } : undefined}
                  >
                    <TajweedText verse={v} enabled={tajweed} />
                    <AyahMark n={v.verse_number} size={Math.round(arabicSize * 0.95)} />
                  </span>{" "}
                </span>
              );
            })}
          </p>
        </section>
      ))}
    </div>
  );
});

export default ReadingView;
