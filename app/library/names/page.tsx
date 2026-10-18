"use client";

import { useEffect, useMemo, useState } from "react";
import LibHeader from "@/components/library/LibHeader";
import { IconClose, IconSearch } from "@/components/Icons";
import { fetchNames, nameOfDayIndex, type Name99 } from "@/lib/names";

export default function NamesPage() {
  const [names, setNames] = useState<Name99[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const todayIdx = nameOfDayIndex();

  useEffect(() => {
    fetchNames()
      .then(setNames)
      .catch((e: Error) => setError(e.message));
  }, []);

  const list = useMemo(() => {
    if (!names) return [];
    const s = q.trim().toLowerCase();
    if (!s) return names;
    return names.filter((n) => n.transliteration.toLowerCase().includes(s) || n.meaning.toLowerCase().includes(s) || n.arabic.includes(q.trim()) || String(n.number) === s);
  }, [names, q]);

  const today = names?.[todayIdx];

  return (
    <main className="flex flex-col gap-4 px-5 pb-[120px]">
      <LibHeader title="99 Names of Allah" sub="Asma ul-Husna — tap a name for its meaning" />

      {today && !q && (
        <button type="button" onClick={() => setOpen(today.number)} className="relative overflow-hidden rounded-hero bg-em-900 p-[18px] text-left text-ivory shadow-hero">
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-gold-500">Name of the day · {today.number}</span>
          <span className="mt-2 block text-right font-arabic text-[40px] leading-[1.3] text-gold-200" lang="ar" dir="rtl">
            {today.arabic}
          </span>
          <span className="block font-display text-[22px] font-medium">{today.transliteration}</span>
          <span className="block text-[13px] text-ivory/70">{today.meaning}</span>
        </button>
      )}

      <label className="relative block">
        <span className="sr-only">Search names</span>
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted">
          <IconSearch size={18} />
        </span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by meaning, e.g. mercy" className="h-12 w-full rounded-full border border-ink/10 bg-white pl-11 pr-11 text-[15px] text-ink outline-none focus:border-em-900 [&::-webkit-search-cancel-button]:hidden" />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label="Clear" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted">
            <IconClose size={18} />
          </button>
        )}
      </label>

      {error && <p className="text-[13px] text-muted">{error}</p>}
      {!names && !error && <p className="text-[13px] text-muted">Loading…</p>}

      <ul className="grid grid-cols-2 gap-2">
        {list.map((n) => {
          const isOpen = open === n.number;
          return (
            <li key={n.number} className={isOpen ? "col-span-2" : ""}>
              <button type="button" onClick={() => setOpen(isOpen ? null : n.number)} aria-expanded={isOpen} className={`card flex w-full flex-col items-center gap-1 p-3 text-center text-ink ${n.number === (today?.number ?? -1) ? "border-gold-500/40" : ""}`}>
                <span className="text-[10px] font-bold text-muted">{n.number}</span>
                <span className={`font-arabic leading-[1.4] text-em-900 ${isOpen ? "text-[40px]" : "text-[28px]"}`} lang="ar" dir="rtl">
                  {n.arabic}
                </span>
                <span className="text-[13px] font-bold">{n.transliteration}</span>
                <span className={`text-[11px] text-muted ${isOpen ? "" : "line-clamp-1"}`}>{n.meaning}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
