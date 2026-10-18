"use client";

import { useEffect, useState } from "react";
import { IconClose } from "@/components/Icons";
import { fetchChapterInfo, revelationLabel, type Chapter } from "@/lib/quran";

/** Surah introduction from Quran.com (themes, context of revelation). */
export default function InfoSheet({ chapter, onClose }: { chapter: Chapter; onClose: () => void }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let live = true;
    fetchChapterInfo(chapter.id)
      .then((t) => live && setText(t))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [chapter.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div role="dialog" aria-modal="true" aria-label={`About Surah ${chapter.name_simple}`} className="relative flex max-h-[85dvh] w-full max-w-[430px] flex-col rounded-t-[28px] px-5 pt-3 shadow-sheet" style={{ background: "var(--qr-bg)", color: "var(--qr-fg)", paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}>
        <div className="mx-auto h-1 w-10 rounded-full" style={{ background: "var(--qr-line)" }} />
        <div className="mt-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-[22px] font-medium leading-tight">
              {chapter.name_simple} <span className="font-arabic text-[20px]" lang="ar">{chapter.name_arabic}</span>
            </h2>
            <p className="text-[12px]" style={{ color: "var(--qr-muted)" }}>
              {chapter.translated_name.name} · {revelationLabel(chapter.revelation_place)} · {chapter.verses_count} verses
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--qr-bg2)" }}>
            <IconClose size={18} />
          </button>
        </div>
        <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1 text-[14px] leading-relaxed">
          {!text && !error && <p style={{ color: "var(--qr-muted)" }}>Loading…</p>}
          {error && <p style={{ color: "var(--qr-muted)" }}>{error}</p>}
          {text?.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
          {text && (
            <p className="pt-2 text-[11px]" style={{ color: "var(--qr-muted)" }}>
              Source: Quran.com surah introduction.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
