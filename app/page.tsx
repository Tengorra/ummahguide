"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconBell, IconMasjid, IconQuran } from "@/components/Icons";
import PrayerHero from "@/components/PrayerHero";
import VerseOfDay from "@/components/VerseOfDay";
import TasbeehCard from "@/components/TasbeehCard";
import MyMasjids from "@/components/MyMasjids";
import NearYou from "@/components/NearYou";
import { useLocationOnDemand } from "@/lib/location";
import { METHODS, cell, compassLabel, fetchQibla, useDayTimes, useSettings } from "@/lib/aladhan";
import { buildJamatDay, usePublished } from "@/lib/jamat";
import { useMyMasjids } from "@/lib/mymasjids";
import { readJSON } from "@/lib/storage";

type LastRead = { chapter: number; verse: number; name: string; versesCount?: number };

export default function HomePage() {
  const { loc, updatedAt, refreshing, gpsStatus, refresh } = useLocationOnDemand();
  const { settings } = useSettings();
  const { day, error } = useDayTimes(loc.lat, loc.lng, settings);
  const [qibla, setQibla] = useState<number | null>(null);
  const [last, setLast] = useState<LastRead | null>(null);
  const [today, setToday] = useState("");
  const [nearIds, setNearIds] = useState<string[]>([]);
  const qlat = cell(loc.lat);
  const qlng = cell(loc.lng);

  // The hero shows the Home masjid's Jamat (Work if no Home is set).
  const { home, work } = useMyMasjids();
  const heroMasjid = home ?? work;
  const heroSlot: "home" | "work" = home ? "home" : "work";
  const heroPublished = usePublished(heroMasjid?.id ?? null);
  const heroJamat =
    heroMasjid && day
      ? { masjidId: heroMasjid.id, masjidName: heroMasjid.name, slot: heroSlot, day: buildJamatDay(day.timings, heroPublished, day.tz) }
      : null;

  useEffect(() => {
    setToday(new Date().toLocaleDateString("en-CA", { weekday: "short", day: "numeric", month: "short" }));
    setLast(readJSON<LastRead | null>("ug.quran.last", null));
  }, []);

  useEffect(() => {
    fetchQibla(qlat, qlng).then(setQibla).catch(() => setQibla(null));
  }, [qlat, qlng]);

  const methodName = METHODS.find((m) => m.id === settings.method)?.name.split(" ")[0] ?? "ISNA";

  return (
    <main className="flex flex-col gap-3 px-5 pb-[110px] pt-12">
      <header className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-[3px]">
          <h1 className="m-0 font-display text-[26px] font-medium leading-[1.05] tracking-[-0.01em]">Assalamu alaikum</h1>
          <span className="text-[12px] font-semibold text-muted">
            {today}
            {day ? (
              <>
                {" · "}
                <span className="text-gold-700">
                  {day.hijri.day} {day.hijri.month} {day.hijri.year}
                </span>
              </>
            ) : null}
          </span>
        </div>
        <Link href="/more#alerts" aria-label="Azan and reminder settings" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink/10 bg-white text-em-900 shadow-card">
          <IconBell />
        </Link>
      </header>

      {day ? (
        <PrayerHero timings={day.timings} place={loc.city} methodName={methodName} jamat={heroJamat} tz={day.tz} />
      ) : (
        <section className="relative h-[176px] overflow-hidden rounded-hero bg-em-900 p-[18px] text-ivory shadow-hero">
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-gold-500">Next prayer</span>
          <p className="mt-3 text-[14px] text-ivory/70">{error ? `Couldn’t load prayer times (${error}).` : "Loading prayer times…"}</p>
        </section>
      )}

      <NearYou
        lat={loc.lat}
        lng={loc.lng}
        timings={day?.timings ?? null}
        tz={day?.tz}
        updatedAt={updatedAt}
        refreshing={refreshing}
        gpsStatus={gpsStatus}
        onRefresh={() => void refresh()}
        onNearIds={setNearIds}
      />

      <MyMasjids lat={loc.lat} lng={loc.lng} timings={day?.timings ?? null} tz={day?.tz} excludeIds={[...nearIds, ...(heroMasjid ? [heroMasjid.id] : [])]} />

      <VerseOfDay />

      <div className="grid grid-cols-4 gap-2">
        <Link href="/qibla" className="card flex flex-col items-center justify-between gap-1 px-1 py-2.5 text-ink">
          <svg width="34" height="34" viewBox="0 0 44 44" aria-hidden="true">
            <circle cx="22" cy="22" r="20" fill="#E3EFEA" />
            <circle cx="22" cy="22" r="20" fill="none" stroke="#146B5A" strokeOpacity="0.3" />
            <g transform={`rotate(${qibla ?? 0} 22 22)`}>
              <path d="M22 6l5 16-5-3-5 3z" fill="#C9A44C" />
              <path d="M22 38l-5-16 5 3 5-3z" fill="#0B3D33" fillOpacity="0.25" />
            </g>
            <circle cx="22" cy="22" r="2.5" fill="#0B3D33" />
          </svg>
          <span className="text-[10px] font-bold">Qibla</span>
          <span className="text-[9px] font-semibold text-muted">{qibla != null ? `${Math.round(qibla)}° ${compassLabel(qibla)}` : "…"}</span>
        </Link>

        <Link href={last ? `/quran/${last.chapter}?verse=${last.verse}` : "/quran"} className="card flex flex-col items-center justify-between gap-1 px-1 py-2.5 text-ink">
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-em-100 text-em-900">
            <IconQuran size={18} />
          </span>
          <span className="max-w-full truncate text-[10px] font-bold">{last ? last.name : "Quran"}</span>
          <span className="text-[9px] font-semibold text-muted">{last ? `verse ${last.verse}` : "start reading"}</span>
        </Link>

        <TasbeehCard />

        <Link href="/masjid" className="card flex flex-col items-center justify-between gap-1 px-1 py-2.5 text-ink">
          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-em-100 text-em-900">
            <IconMasjid size={18} />
          </span>
          <span className="text-[10px] font-bold">Map</span>
          <span className="text-[9px] font-semibold text-muted">all masjids</span>
        </Link>
      </div>
    </main>
  );
}
