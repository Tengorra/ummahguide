"use client";

import { useEffect, useState } from "react";
import LibHeader from "@/components/library/LibHeader";
import { IconChevronLeft, IconChevronRight, IconCopy } from "@/components/Icons";
import { HADITH_COLLECTIONS, fetchHadith, fetchHadithOfDay, type Hadith } from "@/lib/hadith";

export default function HadithPage() {
  const [today, setToday] = useState<Hadith | null>(null);
  const [col, setCol] = useState(HADITH_COLLECTIONS[0].slug);
  const [num, setNum] = useState(1);
  const [browse, setBrowse] = useState<Hadith | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchHadithOfDay()
      .then(setToday)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    fetchHadith(col, num)
      .then((h) => live && setBrowse(h))
      .catch((e: Error) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [col, num]);

  const c = HADITH_COLLECTIONS.find((x) => x.slug === col)!;

  async function copy(h: Hadith) {
    try {
      await navigator.clipboard.writeText(`${h.arabic ? h.arabic + "\n\n" : ""}${h.text}\n— ${h.collection}, ${h.reference}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  const Card = ({ h, label }: { h: Hadith; label: string }) => (
    <article className="card flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        <button type="button" onClick={() => copy(h)} aria-label="Copy hadith" className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 bg-white text-em-900">
          <IconCopy size={17} />
        </button>
      </div>
      {h.arabic && (
        <p dir="rtl" lang="ar" className="m-0 text-right font-arabic text-[22px] leading-[1.8] text-em-900">
          {h.arabic}
        </p>
      )}
      <p className="m-0 text-[14px] leading-[1.6] text-[#3D4744]">{h.text}</p>
      <span className="text-[12px] font-semibold text-muted">
        {h.collection} · {h.reference}
      </span>
    </article>
  );

  return (
    <main className="flex flex-col gap-4 px-5 pb-[120px]">
      <LibHeader title="Hadith" sub="Forty Hadith of an-Nawawi, Hadith Qudsi, Bukhari, Muslim" />
      {copied && <p className="m-0 rounded-2xl bg-em-100 px-3 py-2 text-center text-[12px] font-bold text-em-900">Copied</p>}

      {today ? <Card h={today} label="Hadith of the day" /> : <p className="text-[13px] text-muted">Loading today’s hadith…</p>}

      <section className="flex flex-col gap-3" aria-label="Browse">
        <span className="label px-1">Browse</span>
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          {HADITH_COLLECTIONS.map((x) => (
            <button
              key={x.slug}
              type="button"
              aria-pressed={col === x.slug}
              onClick={() => {
                setCol(x.slug);
                setNum(1);
              }}
              className={`${col === x.slug ? "chip-active" : "chip"} shrink-0`}
            >
              {x.name}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <button type="button" disabled={num <= c.from} onClick={() => setNum((n) => n - 1)} aria-label="Previous hadith" className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-white text-em-900 disabled:opacity-30">
            <IconChevronLeft size={18} />
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = Number((e.currentTarget.elements.namedItem("n") as HTMLInputElement).value);
              if (v >= c.from && v <= c.to) setNum(v);
            }}
            className="flex items-center gap-2 text-[13px] font-bold text-muted"
          >
            Hadith
            <input name="n" key={`${col}-${num}`} defaultValue={num} inputMode="numeric" aria-label="Hadith number" className="h-10 w-16 rounded-xl border border-ink/10 bg-white text-center text-[14px] font-bold text-ink outline-none" />
            of {c.to}
          </form>
          <button type="button" disabled={num >= c.to} onClick={() => setNum((n) => n + 1)} aria-label="Next hadith" className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-white text-em-900 disabled:opacity-30">
            <IconChevronRight size={18} />
          </button>
        </div>
        {loading && !browse && <p className="text-[13px] text-muted">Loading…</p>}
        {error && <p className="text-[13px] text-muted">{error}</p>}
        {browse && <Card h={browse} label={`${c.name} · ${num}`} />}
        <p className="m-0 px-1 text-[11px] leading-[1.6] text-muted">Numbering follows the standard editions (Bukhari 1–7563, Muslim 1–3032). Type a number to jump.</p>
      </section>
    </main>
  );
}
