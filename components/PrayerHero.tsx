"use client";

import Link from "next/link";
import Pattern from "./Pattern";
import { IconCheck, IconChevronRight } from "./Icons";
import { useNow, type JamatDay } from "@/lib/jamat";
import { countdown, fmt12, nextPrayer, PRAYERS, timeToDate, type SalahName, type Timings } from "@/lib/prayer";

type JamatHero = { masjidId: string; masjidName: string; slot: "home" | "work"; day: JamatDay };

function Strip({ items, activeKey }: { items: Array<{ key: string; label: string; time: string; passed: boolean }>; activeKey: string }) {
  return (
    <div className={`relative mt-2 grid gap-1 ${items.length === 6 ? "grid-cols-6" : "grid-cols-5"}`}>
      {items.map((it) => {
        const active = it.key === activeKey;
        return (
          <div key={it.key} className={`flex flex-col items-center gap-[2px] rounded-lg py-1.5 ${active ? "bg-gold-500/20 text-gold-200" : it.passed ? "text-ivory/45" : "text-ivory/85"}`}>
            <span className="text-[9px] font-bold uppercase tracking-[0.06em]">{it.label}</span>
            <span className={`text-[11px] ${active ? "font-bold" : "font-semibold"}`}>{fmt12(it.time, false)}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * The top card. With a Home (or Work) masjid chosen it shows THAT masjid's next Jamat and its
 * five Jamat times; the calculated adhan is the small secondary line. Without one it falls back
 * to calculated prayer times and invites the user to pick a masjid.
 */
export default function PrayerHero({ timings, place, methodName, jamat, tz }: { timings: Timings; place: string; methodName: string; jamat?: JamatHero | null; tz?: string }) {
  const now = useNow(30000);

  if (jamat) {
    const rows = jamat.day.rows;
    let idx = rows.findIndex((r) => timeToDate(r.jamat, now, jamat.day.tz).getTime() > now.getTime());
    const tomorrow = idx === -1;
    if (tomorrow) idx = 0;
    const next = rows[idx];
    const at = timeToDate(next.jamat, now, jamat.day.tz);
    if (tomorrow) at.setDate(at.getDate() + 1);
    const prevRow = idx > 0 ? rows[idx - 1] : rows[rows.length - 1];
    const prevAt = timeToDate(prevRow.jamat, now, jamat.day.tz);
    if (idx === 0) prevAt.setDate(prevAt.getDate() - 1);
    const span = at.getTime() - prevAt.getTime();
    const progress = span > 0 ? Math.min(1, Math.max(0, (now.getTime() - prevAt.getTime()) / span)) : 0;
    const adhan = timings[next.prayer as SalahName];

    return (
      <Link href={`/masjid/${encodeURIComponent(jamat.masjidId)}`} aria-label={`Next Jamat at ${jamat.masjidName}`} className="relative block overflow-hidden rounded-hero bg-em-900 px-[18px] pb-3 pt-4 text-ivory shadow-hero">
        <Pattern id="hero-pattern" />
        <div className="relative flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-gold-500">
            <span className="shrink-0">Next Jamat ·</span>
            <span className="truncate normal-case tracking-normal text-ivory">{jamat.masjidName}</span>
          </span>
          <span className="shrink-0 rounded-full bg-ivory/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ivory">{jamat.slot}</span>
        </div>
        <div className="relative mt-1.5 flex items-end justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-baseline gap-2.5">
              <span className="font-display text-[40px] font-medium leading-none tracking-[-0.02em]">{next.prayer}</span>
              <span className="font-display text-[22px] font-medium leading-none text-gold-200">{fmt12(next.jamat)}</span>
            </div>
            <span className="text-[11px] font-semibold text-ivory/60">
              Adhan {fmt12(adhan)}
              {tomorrow ? " · tomorrow" : ""}
              {" · "}
              {place} · {methodName}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ivory/60">In</span>
            <span className="font-display text-[26px] font-medium leading-none text-gold-200">{countdown(at.getTime() - now.getTime())}</span>
          </div>
        </div>
        <div className="relative mt-3 h-1 rounded-full bg-ivory/15">
          <div className="h-1 rounded-full bg-gold-500 transition-[width] duration-700" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <Strip
          activeKey={next.prayer}
          items={rows.map((r) => ({ key: r.prayer, label: r.prayer, time: r.jamat, passed: timeToDate(r.jamat, now, jamat.day.tz).getTime() < now.getTime() && !tomorrow }))}
        />
        <div className="relative mt-2 flex items-center justify-between text-[11px] font-semibold">
          {jamat.day.verified ? (
            <span className="flex items-center gap-1 text-gold-200">
              <IconCheck size={12} />
              Jamat times published by the masjid
            </span>
          ) : (
            <span className="text-ivory/60">Estimated · masjid hasn’t published yet</span>
          )}
          <span className="flex items-center gap-0.5 text-ivory/70">
            {jamat.day.jumuah.length ? `Jumu’ah ${jamat.day.jumuah.map((t) => fmt12(t, false)).join(" · ")}` : "Details"}
            <IconChevronRight size={14} />
          </span>
        </div>
      </Link>
    );
  }

  const nx = nextPrayer(timings, now, tz);
  return (
    <section aria-label="Next prayer" className="relative overflow-hidden rounded-hero bg-em-900 px-[18px] pb-3 pt-4 text-ivory shadow-hero">
      <Pattern id="hero-pattern" />
      <div className="relative flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-gold-500">Next prayer</span>
        <span className="text-[11px] font-semibold text-ivory/70">
          {place} · {methodName}
        </span>
      </div>
      <div className="relative mt-1.5 flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-2.5">
          <span className="font-display text-[40px] font-medium leading-none tracking-[-0.02em]">{nx.name}</span>
          <span className="text-[14px] font-medium text-ivory/80">
            {fmt12(timings[nx.name])}
            {nx.isTomorrow ? " · tmrw" : ""}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-ivory/60">In</span>
          <span className="font-display text-[26px] font-medium leading-none text-gold-200">{countdown(nx.at.getTime() - now.getTime())}</span>
        </div>
      </div>
      <div className="relative mt-3 h-1 rounded-full bg-ivory/15">
        <div className="h-1 rounded-full bg-gold-500 transition-[width] duration-700" style={{ width: `${Math.round(nx.progress * 100)}%` }} />
      </div>
      <Strip
        activeKey={nx.name}
        items={PRAYERS.map((p) => ({ key: p, label: p === "Sunrise" ? "Rise" : p, time: timings[p], passed: p !== nx.name && timeToDate(timings[p], now, tz).getTime() < now.getTime() }))}
      />
      <div className="relative mt-2 text-[11px] font-semibold text-ivory/60">Calculated times · set a Home masjid to see its Jamat here</div>
    </section>
  );
}
