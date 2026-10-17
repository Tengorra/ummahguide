"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconBell, IconQuran } from "@/components/Icons";
import PrayerHero from "@/components/PrayerHero";
import VerseOfDay from "@/components/VerseOfDay";
import TasbeehCard from "@/components/TasbeehCard";
import NearestMasjid from "@/components/NearestMasjid";
import { useLocation } from "@/lib/location";
import { METHODS, compassLabel, fetchQibla, useDayTimes, useSettings } from "@/lib/aladhan";
import { fmtDate } from "@/lib/prayer";
import { readJSON } from "@/lib/storage";

type LastRead = { chapter: number; verse: number; name: string; versesCount?: number };

export default function HomePage() {
  const { loc } = useLocation();
  const { settings } = useSettings();
  const { day, error } = useDayTimes(loc.lat, loc.lng, settings);
  const [qibla, setQibla] = useState<number | null>(null);
  const [last, setLast] = useState<LastRead | null>(null);
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(fmtDate(new Date()));
    setLast(readJSON<LastRead | null>("ug.quran.last", null));
  }, []);

  useEffect(() => {
    fetchQibla(loc.lat, loc.lng).then(setQibla).catch(() => setQibla(null));
  }, [loc.lat, loc.lng]);

  const methodName = METHODS.find((m) => m.id === settings.method)?.name.split(" ")[0] ?? "ISNA";

  return (
    <main className="flex flex-col gap-4 px-5 pb-[120px] pt-14">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-[5px]">
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{today}</span>
          <h1 className="m-0 font-display text-[30px] font-medium leading-[1.05] tracking-[-0.01em]">Assalamu alaikum</h1>
          <span className="text-[13px] font-semibold text-gold-700">
            {day ? `${day.hijri.day} ${day.hijri.month} ${day.hijri.year} AH` : " "}
          </span>
        </div>
        <Link
          href="/more#alerts"
          aria-label="Azan and reminder settings"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/10 bg-white text-em-900 shadow-card"
        >
          <IconBell />
        </Link>
      </header>

      {day ? (
        <PrayerHero timings={day.timings} place={loc.city} methodName={methodName} />
      ) : (
        <section className="relative h-[230px] overflow-hidden rounded-hero bg-em-900 p-5 text-ivory shadow-hero">
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-gold-500">Next prayer</span>
          <p className="mt-3 text-[14px] text-ivory/70">{error ? `Couldn’t load prayer times (${error}).` : "Loading prayer times…"}</p>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link href="/prayer#qibla" className="card flex flex-col gap-3.5 p-4 text-ink">
          <div className="flex items-center justify-between">
            <span className="label">Qibla</span>
            <svg width="40" height="40" viewBox="0 0 44 44" aria-hidden="true">
              <circle cx="22" cy="22" r="20" fill="#E3EFEA" />
              <circle cx="22" cy="22" r="20" fill="none" stroke="#146B5A" strokeOpacity="0.3" />
              <g transform={`rotate(${qibla ?? 0} 22 22)`}>
                <path d="M22 6l5 16-5-3-5 3z" fill="#C9A44C" />
                <path d="M22 38l-5-16 5 3 5-3z" fill="#0B3D33" fillOpacity="0.25" />
              </g>
              <circle cx="22" cy="22" r="2.5" fill="#0B3D33" />
            </svg>
          </div>
          <div className="flex flex-col gap-[3px]">
            <span className="font-display text-[26px] font-medium leading-none">
              {qibla != null ? `${Math.round(qibla)}° ${compassLabel(qibla)}` : "—"}
            </span>
            <span className="text-[12px] text-muted">Toward Makkah</span>
          </div>
        </Link>

        <NearestMasjid lat={loc.lat} lng={loc.lng} timings={day?.timings ?? null} />

        <Link
          href={last ? `/quran/${last.chapter}?verse=${last.verse}` : "/quran"}
          className="flex flex-col gap-3 rounded-card border border-em-600/10 bg-em-100 p-4 text-em-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-em-600">{last ? "Continue reading" : "Read Quran"}</span>
            <IconQuran className="text-em-600" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-display text-[24px] font-medium leading-none">{last ? last.name : "Al-Fatiha"}</span>
            <span className="text-[12px] text-em-600">{last ? `Verse ${last.verse}` : "Start from the opening"}</span>
          </div>
          {last?.versesCount ? (
            <div className="h-[5px] rounded-full bg-em-600/15">
              <div className="h-[5px] rounded-full bg-em-600" style={{ width: `${Math.min(100, Math.round((last.verse / last.versesCount) * 100))}%` }} />
            </div>
          ) : null}
        </Link>

        <TasbeehCard />
      </div>

      <VerseOfDay />
    </main>
  );
}
