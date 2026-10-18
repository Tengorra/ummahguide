"use client";

import { IconChevronLeft, IconChevronRight } from "@/components/Icons";
import type { DayTimes } from "@/lib/aladhan";
import { sunnahFast, type UpcomingEvent } from "@/lib/hijri";
import { countDone, monthStats, type TrackerLog } from "@/lib/tracker";
import { todayKey } from "@/lib/storage";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/** Completion ring: 5 segments, one per salah. */
export function Ring({ done, excused, size = 34, stroke = 3 }: { done: number; excused?: boolean; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = 3;
  const seg = c / 5 - gap;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
      {Array.from({ length: 5 }, (_, i) => (
        <circle
          key={i}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={excused ? "rgba(244,241,234,0.25)" : i < done ? (done === 5 ? "#C9A44C" : "#E8CF8A") : "rgba(244,241,234,0.14)"}
          strokeWidth={stroke}
          strokeDasharray={`${seg} ${c - seg}`}
          strokeDashoffset={-(i * (seg + gap))}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
}

export default function MonthCalendar({
  year,
  month,
  days,
  log,
  events,
  selected,
  onSelect,
  onMonth,
}: {
  year: number;
  month: number; // 1-based
  days: DayTimes[] | null;
  log: TrackerLog;
  events: UpcomingEvent[];
  selected: string;
  onSelect: (iso: string) => void;
  onMonth: (delta: number) => void;
}) {
  const today = todayKey();
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const lead = first.getDay();
  const stats = monthStats(log, year, month);
  const byDate = new Map((days ?? []).map((d) => [d.date, d]));
  const eventDates = new Map<string, UpcomingEvent[]>();
  for (const e of events) {
    for (let i = 0; i < (e.spanDays ?? 1); i++) {
      const d = new Date(e.date);
      d.setDate(d.getDate() + i);
      const k = todayKey(d);
      eventDates.set(k, [...(eventDates.get(k) ?? []), e]);
    }
  }
  const title = first.toLocaleDateString("en-CA", { month: "long", year: "numeric" });
  const hijriSpan = days && days.length ? `${days[0].hijri.month} – ${days[days.length - 1].hijri.month} ${days[days.length - 1].hijri.year}`.replace(/^(\S+(?: \S+)*) – \1 /, "$1 ") : "";

  return (
    <section aria-label="Month" className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => onMonth(-1)} aria-label="Previous month" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-ivory">
          <IconChevronLeft size={18} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[16px] font-bold">{title}</span>
          <span className="text-[11px] font-semibold text-gold-200/80">{hijriSpan || "…"}</span>
        </div>
        <button type="button" onClick={() => onMonth(1)} aria-label="Next month" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-ivory">
          <IconChevronRight size={18} />
        </button>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-2">
        <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-ivory/45">
          {WEEKDAYS.map((w, i) => (
            <span key={i} className="py-1">
              {w}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: lead }, (_, i) => (
            <span key={`lead-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = i + 1;
            const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const future = iso > today;
            const isToday = iso === today;
            const isSel = iso === selected;
            const entry = log[iso];
            const done = countDone(entry);
            const dt = byDate.get(iso);
            const evs = eventDates.get(iso);
            const fast = evs?.some((e) => e.kind === "fast") || (dt ? !!sunnahFast(new Date(year, month - 1, d), dt.hijri.day, dt.hijri.monthNumber) : false);
            const holy = evs?.some((e) => e.kind !== "fast");
            return (
              <button
                key={iso}
                type="button"
                onClick={() => onSelect(iso)}
                aria-label={`${iso}${dt ? `, ${dt.hijri.day} ${dt.hijri.month}` : ""}${done ? `, ${done} of 5 prayed` : ""}${entry?.excused ? ", excused" : ""}`}
                aria-pressed={isSel}
                className={`relative flex flex-col items-center justify-center rounded-2xl py-1 ${isSel ? "bg-gold-500/20" : ""} ${future ? "opacity-45" : ""}`}
              >
                <span className="relative flex h-[34px] w-[34px] items-center justify-center">
                  {!future && <span className="absolute inset-0">{entry?.excused && done < 5 ? <Ring done={0} excused /> : <Ring done={done} />}</span>}
                  <span className={`text-[13px] ${isToday ? "font-black text-gold-200" : done === 5 ? "font-bold text-ivory" : "font-semibold text-ivory/85"}`}>{d}</span>
                </span>
                <span className="mt-[1px] flex h-3 items-center gap-[3px]">
                  <span className="text-[8.5px] font-semibold text-ivory/40">{dt ? dt.hijri.day : ""}</span>
                  {holy && <span className="h-[5px] w-[5px] rounded-full bg-gold-500" aria-hidden="true" />}
                  {fast && <span className="h-[5px] w-[5px] rounded-full bg-em-100" aria-hidden="true" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { v: `${stats.prayed}/${stats.possible}`, l: "prayed" },
          { v: String(stats.jamat), l: "in Jamat" },
          { v: String(stats.fullDays), l: "full days" },
        ].map((s) => (
          <div key={s.l} className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 py-2.5">
            <span className="font-display text-[20px] font-medium leading-none text-gold-200">{s.v}</span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-ivory/55">{s.l}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
