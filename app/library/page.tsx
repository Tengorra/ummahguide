"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconBeads, IconCalendar, IconChevronRight, IconCompass, IconGear, IconHands, IconMoon, IconScale, IconScroll, IconSparkle } from "@/components/Icons";
import { DUA_CATEGORIES, categoryDone, getDuaCounts, loadDuas, suggestedAdhkar, type Dua } from "@/lib/dua";
import { fetchHadithOfDay, type Hadith } from "@/lib/hadith";
import { fetchNames, nameOfDayIndex, type Name99 } from "@/lib/names";
import { useFasting } from "@/lib/fasting";
import { loadTasbih } from "@/lib/tasbih";

const TILES = [
  { href: "/library/duas", title: "Duas & adhkar", sub: "Morning, evening, daily", Icon: IconHands },
  { href: "/library/tasbih", title: "Tasbih", sub: "Counter with presets", Icon: IconBeads },
  { href: "/library/hadith", title: "Hadith", sub: "Nawawi 40, Bukhari, Muslim", Icon: IconScroll },
  { href: "/library/names", title: "99 Names", sub: "Asma ul-Husna", Icon: IconSparkle },
  { href: "/library/fasting", title: "Fasting", sub: "Log, sunnah days, qada", Icon: IconMoon },
  { href: "/library/zakat", title: "Zakat", sub: "Calculator", Icon: IconScale },
  { href: "/prayer", title: "Islamic dates", sub: "Calendar & events", Icon: IconCalendar },
  { href: "/qibla", title: "Qibla", sub: "Compass", Icon: IconCompass },
];

export default function LibraryPage() {
  const [hadith, setHadith] = useState<Hadith | null>(null);
  const [name, setName] = useState<Name99 | null>(null);
  const [adhkar, setAdhkar] = useState<{ slug: string; name: string; pct: number } | null>(null);
  const [tasbihToday, setTasbihToday] = useState(0);
  const { today: fastToday, owed } = useFasting();

  useEffect(() => {
    fetchHadithOfDay().then(setHadith).catch(() => {});
    fetchNames()
      .then((ns) => setName(ns[nameOfDayIndex()] ?? null))
      .catch(() => {});
    const slug = suggestedAdhkar();
    const cat = DUA_CATEGORIES.find((c) => c.slug === slug)!;
    loadDuas(slug)
      .then((d: Dua[]) => setAdhkar({ slug, name: cat.name, pct: categoryDone(slug, d, getDuaCounts()) }))
      .catch(() => setAdhkar({ slug, name: cat.name, pct: 0 }));
    setTasbihToday(loadTasbih().todayTotal);
  }, []);

  return (
    <main className="flex flex-col gap-4 px-5 pb-[120px] pt-12">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-[3px]">
          <h1 className="m-0 font-display text-[30px] font-medium leading-[1.05]">Library</h1>
          <span className="text-[12px] font-semibold text-muted">Duas, dhikr, hadith and tools</span>
        </div>
        <Link href="/more" aria-label="Settings" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink/10 bg-white text-em-900 shadow-card">
          <IconGear />
        </Link>
      </header>

      {/* Right now: the adhkar of this part of the day */}
      {adhkar && (
        <Link href={`/library/duas/${adhkar.slug}`} className="relative overflow-hidden rounded-hero bg-em-900 p-[18px] text-ivory shadow-hero">
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-gold-500">{adhkar.slug === "morning-dhikr" ? "This morning" : "This evening"}</span>
          <div className="mt-1 flex items-end justify-between gap-3">
            <div>
              <p className="m-0 font-display text-[24px] font-medium leading-tight">{adhkar.name}</p>
              <p className="m-0 mt-1 text-[12px] text-ivory/65">{adhkar.pct >= 1 ? "Completed today — mashaAllah" : adhkar.pct > 0 ? `${Math.round(adhkar.pct * 100)}% done · continue` : "Tap each dhikr to count it"}</p>
            </div>
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center">
              <svg width="48" height="48" viewBox="0 0 48 48" className="-rotate-90" aria-hidden="true">
                <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(244,241,234,0.15)" strokeWidth="4" />
                <circle cx="24" cy="24" r="20" fill="none" stroke="#C9A44C" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 20 * Math.min(1, adhkar.pct)} ${2 * Math.PI * 20}`} />
              </svg>
              <IconMoon size={18} className="absolute text-gold-200" />
            </span>
          </div>
        </Link>
      )}

      {/* Hadith of the day */}
      <Link href="/library/hadith" className="card flex flex-col gap-2 px-4 py-3.5 text-ink">
        <div className="flex items-center justify-between">
          <span className="label">Hadith of the day</span>
          <span className="text-[12px] font-semibold text-em-600">{hadith ? hadith.reference.split(" · ")[0] : ""} →</span>
        </div>
        {hadith ? (
          <>
            {hadith.arabic && (
              <p dir="rtl" lang="ar" className="m-0 line-clamp-2 text-right font-arabic text-[20px] leading-[1.7] text-em-900">
                {hadith.arabic}
              </p>
            )}
            <p className="m-0 line-clamp-4 text-[13px] leading-[1.5] text-[#3D4744]">{hadith.text}</p>
            <span className="text-[11px] font-semibold text-muted">{hadith.collection}</span>
          </>
        ) : (
          <p className="m-0 text-[13px] text-muted">Loading…</p>
        )}
      </Link>

      {/* Name of the day */}
      <Link href="/library/names" className="card flex items-center gap-4 px-4 py-3.5 text-ink">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-em-100 font-arabic text-[26px] text-em-900" lang="ar">
          {name?.arabic ?? "…"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="label">Name of the day · {name ? `${name.number} of 99` : ""}</span>
          <span className="mt-0.5 block truncate text-[16px] font-bold">{name?.transliteration ?? ""}</span>
          <span className="block truncate text-[12px] text-muted">{name?.meaning ?? ""}</span>
        </span>
        <IconChevronRight className="text-muted" />
      </Link>

      {/* Tiles */}
      <div className="grid grid-cols-2 gap-2">
        {TILES.map((t) => (
          <Link key={t.href + t.title} href={t.href} className="card flex items-center gap-3 p-3 text-ink">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-em-100 text-em-900" aria-hidden="true">
              <t.Icon size={20} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-bold leading-tight">{t.title}</span>
              <span className="block truncate text-[11px] text-muted">
                {t.href === "/library/tasbih" && tasbihToday > 0 ? `${tasbihToday} today` : t.href === "/library/fasting" ? (fastToday ? "Fasting today" : owed > 0 ? `${owed} to make up` : t.sub) : t.sub}
              </span>
            </span>
          </Link>
        ))}
      </div>

      <p className="m-0 px-1 text-[11px] leading-[1.6] text-muted">Dua texts: Hisn al-Muslim selection (MIT, Fitrahive). Hadith: fawazahmed0 hadith-api (public domain). Names: Aladhan.</p>
    </main>
  );
}
