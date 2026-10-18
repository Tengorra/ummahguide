"use client";

import { useEffect, useState } from "react";
import LibHeader from "@/components/library/LibHeader";
import { IconCheck, IconChevronLeft, IconChevronRight, IconMoon } from "@/components/Icons";
import { fetchDay, fetchMonth, useSettings, type DayTimes } from "@/lib/aladhan";
import { FAST_LABEL, fastStats, useFasting, type FastType } from "@/lib/fasting";
import { sunnahFast } from "@/lib/hijri";
import { useLocation } from "@/lib/location";
import { fmt12 } from "@/lib/prayer";
import { todayKey } from "@/lib/storage";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export default function FastingPage() {
  const { loc } = useLocation();
  const { settings } = useSettings();
  const { log, owed, today, mark, setOwed } = useFasting();
  const [day, setDay] = useState<DayTimes | null>(null);
  const [cal, setCal] = useState(() => ({ y: new Date().getFullYear(), m: new Date().getMonth() + 1 }));
  const [monthDays, setMonthDays] = useState<DayTimes[] | null>(null);
  const [picker, setPicker] = useState<string | null>(null); // date being edited

  useEffect(() => {
    fetchDay(loc.lat, loc.lng, new Date(), settings).then(setDay).catch(() => {});
  }, [loc.lat, loc.lng, settings]);

  useEffect(() => {
    let live = true;
    setMonthDays(null);
    fetchMonth(loc.lat, loc.lng, cal.y, cal.m, settings)
      .then((d) => live && setMonthDays(d))
      .catch(() => live && setMonthDays([]));
    return () => {
      live = false;
    };
  }, [cal.y, cal.m, loc.lat, loc.lng, settings]);

  const t = todayKey();
  const ramadan = day?.hijri.monthNumber === 9;
  const suggested = day ? sunnahFast(new Date(), day.hijri.day, day.hijri.monthNumber) : null;
  const defaultType: FastType = ramadan ? "ramadan" : owed > 0 ? "makeup" : "sunnah";
  const stats = fastStats(log, cal.y);
  const byDate = new Map((monthDays ?? []).map((d) => [d.date, d]));
  const first = new Date(cal.y, cal.m - 1, 1);
  const daysInMonth = new Date(cal.y, cal.m, 0).getDate();
  const lead = first.getDay();

  const colour: Record<FastType, string> = { ramadan: "bg-gold-500 text-night", sunnah: "bg-em-600 text-ivory", makeup: "bg-em-900 text-ivory", missed: "bg-[#C9594C] text-ivory" };

  return (
    <main className="flex flex-col gap-4 px-5 pb-[120px]">
      <LibHeader title="Fasting" sub={ramadan ? `Ramadan · day ${day?.hijri.day}` : "Sunnah days, Ramadan and make-up fasts"} />

      {/* Today */}
      <section className="relative overflow-hidden rounded-hero bg-em-900 p-[18px] text-ivory shadow-hero">
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-gold-500">Today</span>
        <div className="mt-1 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 font-display text-[22px] font-medium leading-tight">{today ? FAST_LABEL[today.type] : suggested ? `${suggested} — sunnah fast` : ramadan ? "Ramadan fast" : "Not fasting"}</p>
            <p className="m-0 mt-1 text-[12px] text-ivory/65">{day ? `Suhoor ends ${fmt12(day.timings.Fajr)} · Iftar ${fmt12(day.timings.Maghrib)}` : "…"}</p>
          </div>
          <button type="button" onClick={() => (today ? mark(t, null) : mark(t, defaultType))} aria-pressed={!!today} className={`flex h-12 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-bold ${today ? "bg-gold-500 text-night" : "border border-white/20 bg-white/10 text-ivory"}`}>
            {today ? <IconCheck size={16} /> : <IconMoon size={16} />}
            {today ? "Fasting" : "I’m fasting"}
          </button>
        </div>
        {today && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(["ramadan", "sunnah", "makeup"] as FastType[]).map((ty) => (
              <button key={ty} type="button" aria-pressed={today.type === ty} onClick={() => mark(t, ty)} className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${today.type === ty ? "bg-ivory text-em-900" : "bg-white/10 text-ivory/80"}`}>
                {FAST_LABEL[ty]}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Owed */}
      <section className="card flex items-center gap-3 p-4">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[15px] font-bold">Fasts to make up</p>
          <p className="m-0 text-[12px] text-muted">Missed Ramadan days (travel, illness, menstruation). Each make-up fast you log clears one.</p>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setOwed(owed - 1)} aria-label="Fewer" className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 bg-white text-em-900">
            <IconChevronLeft size={16} />
          </button>
          <span className="w-8 text-center font-display text-[22px] font-medium text-em-900">{owed}</span>
          <button type="button" onClick={() => setOwed(owed + 1)} aria-label="More" className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 bg-white text-em-900">
            <IconChevronRight size={16} />
          </button>
        </div>
      </section>

      {/* Month */}
      <section className="card flex flex-col gap-3 p-4" aria-label="Month">
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => setCal((c) => ({ y: c.m === 1 ? c.y - 1 : c.y, m: c.m === 1 ? 12 : c.m - 1 }))} aria-label="Previous month" className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 bg-white text-em-900">
            <IconChevronLeft size={16} />
          </button>
          <span className="text-[14px] font-bold">{first.toLocaleDateString("en-CA", { month: "long", year: "numeric" })}</span>
          <button type="button" onClick={() => setCal((c) => ({ y: c.m === 12 ? c.y + 1 : c.y, m: c.m === 12 ? 1 : c.m + 1 }))} aria-label="Next month" className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 bg-white text-em-900">
            <IconChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-7 text-center text-[10px] font-bold uppercase text-muted">
          {WEEKDAYS.map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: lead }, (_, i) => (
            <span key={`l${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const d = i + 1;
            const iso = `${cal.y}-${String(cal.m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const e = log[iso];
            const dt = byDate.get(iso);
            const sug = dt ? sunnahFast(new Date(cal.y, cal.m - 1, d), dt.hijri.day, dt.hijri.monthNumber) : null;
            const isRam = dt?.hijri.monthNumber === 9;
            const future = iso > t;
            return (
              <button key={iso} type="button" disabled={future} onClick={() => setPicker(iso)} aria-label={`${iso}${e ? `: ${FAST_LABEL[e.type]}` : sug ? `: ${sug} suggested` : ""}`} className={`flex flex-col items-center rounded-xl py-1 disabled:opacity-40 ${iso === t ? "bg-em-100" : ""}`}>
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-semibold ${e ? colour[e.type] : sug || isRam ? "border border-dashed border-em-600/50 text-em-900" : "text-ink"}`}>{d}</span>
                <span className="text-[8px] text-muted">{dt?.hijri.day ?? ""}</span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-muted">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-gold-500" /> Ramadan
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-em-600" /> Sunnah
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-em-900" /> Make-up
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-[#C9594C]" /> Missed
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full border border-dashed border-em-600" /> Suggested
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2 border-t border-ink/5 pt-3 text-center">
          {[
            [stats.total, `fasts in ${cal.y}`],
            [stats.sunnah, "sunnah"],
            [stats.makeup, "made up"],
          ].map(([v, l]) => (
            <div key={String(l)}>
              <span className="block font-display text-[20px] font-medium text-em-900">{v}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-muted">{l}</span>
            </div>
          ))}
        </div>
      </section>

      {picker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button type="button" aria-label="Close" onClick={() => setPicker(null)} className="absolute inset-0 bg-night/50" />
          <section className="relative flex w-full max-w-[430px] flex-col gap-3 rounded-t-[28px] bg-white px-5 pb-6 pt-2.5 text-ink shadow-sheet" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}>
            <span className="mx-auto h-[5px] w-10 rounded-full bg-ink/15" />
            <h2 className="m-0 font-display text-[22px] font-medium">{new Date(picker + "T12:00:00").toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}</h2>
            {(["ramadan", "sunnah", "makeup", "missed"] as FastType[]).map((ty) => (
              <button
                key={ty}
                type="button"
                onClick={() => {
                  mark(picker, ty);
                  setPicker(null);
                }}
                className={`flex h-12 items-center justify-between rounded-2xl px-4 text-[14px] font-bold ${log[picker]?.type === ty ? "bg-em-900 text-ivory" : "bg-ivory text-ink"}`}
              >
                {FAST_LABEL[ty]}
                {log[picker]?.type === ty && <IconCheck size={18} />}
              </button>
            ))}
            {log[picker] && (
              <button
                type="button"
                onClick={() => {
                  mark(picker, null);
                  setPicker(null);
                }}
                className="text-[13px] font-bold text-muted"
              >
                Clear this day
              </button>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
