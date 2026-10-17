"use client";

import Pattern from "./Pattern";
import { useNow } from "@/lib/jamat";
import { countdown, fmt12, nextPrayer, PRAYERS, timeToDate, type Timings } from "@/lib/prayer";

export default function PrayerHero({ timings, place, methodName }: { timings: Timings; place: string; methodName: string }) {
  const now = useNow(30000);
  const nx = nextPrayer(timings, now);

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
      <div className="relative mt-2 grid grid-cols-6 gap-1">
        {PRAYERS.map((p) => {
          const active = p === nx.name;
          const passed = !active && timeToDate(timings[p], now).getTime() < now.getTime();
          return (
            <div key={p} className={`flex flex-col items-center gap-[2px] rounded-lg py-1.5 ${active ? "bg-gold-500/20 text-gold-200" : passed ? "text-ivory/45" : "text-ivory/85"}`}>
              <span className="text-[9px] font-bold uppercase tracking-[0.06em]">{p === "Sunrise" ? "Rise" : p}</span>
              <span className={`text-[11px] ${active ? "font-bold" : "font-semibold"}`}>{fmt12(timings[p], false)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
