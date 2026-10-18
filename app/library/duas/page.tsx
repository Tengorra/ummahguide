"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LibHeader from "@/components/library/LibHeader";
import { IconChevronRight } from "@/components/Icons";
import { DUA_CATEGORIES, categoryDone, getDuaCounts, loadDuas, suggestedAdhkar } from "@/lib/dua";

export default function DuasPage() {
  const [pct, setPct] = useState<Record<string, number>>({});
  const suggested = suggestedAdhkar();

  useEffect(() => {
    const counts = getDuaCounts();
    DUA_CATEGORIES.forEach((c) => {
      loadDuas(c.slug)
        .then((d) => setPct((p) => ({ ...p, [c.slug]: categoryDone(c.slug, d, counts) })))
        .catch(() => {});
    });
  }, []);

  return (
    <main className="flex flex-col gap-4 px-5 pb-[120px]">
      <LibHeader title="Duas & adhkar" sub="From Hisn al-Muslim — Arabic, transliteration, meaning" />
      <ul className="flex flex-col gap-2">
        {DUA_CATEGORIES.map((c) => {
          const p = pct[c.slug] ?? 0;
          const isNow = c.slug === suggested;
          return (
            <li key={c.slug}>
              <Link href={`/library/duas/${c.slug}`} className={`card flex items-center gap-3 p-4 text-ink ${isNow ? "border-gold-500/40" : ""}`}>
                <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
                  <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90" aria-hidden="true">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="#E3EFEA" strokeWidth="4" />
                    <circle cx="24" cy="24" r="20" fill="none" stroke="#C9A44C" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 20 * Math.min(1, p)} ${2 * Math.PI * 20}`} />
                  </svg>
                  <span className="absolute text-[11px] font-black text-em-900">{p >= 1 ? "✓" : `${c.count}`}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-bold">{c.name}</span>
                    {isNow && <span className="gold-pill">Now</span>}
                  </span>
                  <span className="block truncate text-[12px] text-muted">{c.sub}</span>
                </span>
                <IconChevronRight className="text-muted" />
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="m-0 px-1 text-[11px] leading-[1.6] text-muted">Counts reset every day. Morning adhkar are from Fajr to sunrise, evening from Asr to Maghrib; reciting them a little later is still fine.</p>
    </main>
  );
}
