"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Pattern from "@/components/Pattern";
import AlertSheet from "@/components/prayer/AlertSheet";
import SettingsSheet from "@/components/prayer/SettingsSheet";
import MonthCalendar, { Ring } from "@/components/prayer/MonthCalendar";
import { IconBell, IconCheck, IconChevronLeft, IconChevronRight, IconCompass, IconDoubleCheck, IconFlame, IconGear, IconMoon, IconSunrise } from "@/components/Icons";
import { useLocation } from "@/lib/location";
import { METHODS, fetchDay, fetchMonth, useDayTimes, useSettings, type DayTimes } from "@/lib/aladhan";
import { useNow } from "@/lib/jamat";
import { useAlerts } from "@/lib/alerts";
import { fmtDay, sunnahFast, upcomingEvents, type UpcomingEvent } from "@/lib/hijri";
import { PRAYERS, countdown, countdownClock, currentPrayer, fmt12, fmtInstant, nextPrayer, nightTimes, timeToDate, type SalahName } from "@/lib/prayer";
import { todayKey } from "@/lib/storage";
import { HOW_LABEL, countDone, shiftDay, streak, useTracker } from "@/lib/tracker";

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysAwayLabel(n: number): string {
  if (n <= 0) return "Today";
  if (n === 1) return "Tomorrow";
  return `In ${n} days`;
}

export default function PrayerPage() {
  const { loc } = useLocation();
  const { settings, update } = useSettings();
  const { day: today, error } = useDayTimes(loc.lat, loc.lng, settings);
  const now = useNow(1000);
  const { log, toggle, excusedMode, toggleExcusedMode, toggleExcusedDay } = useTracker();
  const { alerts, update: updateAlert } = useAlerts();

  const [view, setView] = useState<"today" | "calendar">("today");
  const [selected, setSelected] = useState(() => todayKey());
  const [selDay, setSelDay] = useState<DayTimes | null>(null);
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [cal, setCal] = useState(() => ({ y: new Date().getFullYear(), m: new Date().getMonth() + 1 }));
  const [monthDays, setMonthDays] = useState<DayTimes[] | null>(null);
  const [alertFor, setAlertFor] = useState<SalahName | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const todayIso = todayKey(now);
  const isToday = selected === todayIso;
  const isFuture = selected > todayIso;

  // Times for the selected day (today's come from the live hook).
  useEffect(() => {
    if (isToday) {
      setSelDay(today);
      return;
    }
    let live = true;
    setSelDay(null);
    fetchDay(loc.lat, loc.lng, isoToDate(selected), settings)
      .then((d) => live && setSelDay(d))
      .catch(() => live && setSelDay(null));
    return () => {
      live = false;
    };
  }, [selected, isToday, today, loc.lat, loc.lng, settings]);

  // Islamic dates for the next ~13 months, once we know the Hijri year.
  const hijriYear = today?.hijri.year;
  useEffect(() => {
    if (!hijriYear) return;
    let live = true;
    upcomingEvents(hijriYear).then((e) => live && setEvents(e)).catch(() => {});
    return () => {
      live = false;
    };
  }, [hijriYear]);

  // Whole month (Hijri numerals + times) for the calendar view.
  useEffect(() => {
    if (view !== "calendar") return;
    let live = true;
    setMonthDays(null);
    fetchMonth(loc.lat, loc.lng, cal.y, cal.m, settings)
      .then((d) => live && setMonthDays(d))
      .catch(() => live && setMonthDays([]));
    return () => {
      live = false;
    };
  }, [view, cal.y, cal.m, loc.lat, loc.lng, settings]);

  const nx = today ? nextPrayer(today.timings, now, today.tz) : null;
  const cur = today ? currentPrayer(today.timings, now, today.tz) : null;
  const ramadan = today?.hijri.monthNumber === 9;
  const night = selDay ? nightTimes(selDay.timings, isoToDate(selected), selDay.tz) : null;
  const dayLog = log[selected];
  const done = countDone(dayLog);
  const currentStreak = useMemo(() => streak(log, todayIso), [log, todayIso]);
  const methodName = METHODS.find((m) => m.id === settings.method)?.name.split(" ")[0] ?? "ISNA";
  const fast = selDay ? sunnahFast(isoToDate(selected), selDay.hijri.day, selDay.hijri.monthNumber) : null;

  // Ramadan hero: sehri (ends at Fajr) / iftar (Maghrib).
  let fastLabel: { label: string; at: Date } | null = null;
  if (ramadan && today) {
    const fajr = timeToDate(today.timings.Fajr, now, today.tz);
    const maghrib = timeToDate(today.timings.Maghrib, now, today.tz);
    if (now < fajr) fastLabel = { label: "Sehri ends in", at: fajr };
    else if (now < maghrib) fastLabel = { label: "Iftar in", at: maghrib };
    else fastLabel = { label: "Sehri ends in", at: new Date(fajr.getTime() + 86400000) };
  }

  const trend = Array.from({ length: 7 }, (_, i) => shiftDay(todayIso, i - 6));

  return (
    <main className="relative min-h-dvh bg-em-900 pb-[120px] text-ivory">
      <Pattern id="prayer-pattern" opacity={0.08} size={64} />
      <div className="relative flex flex-col gap-4 px-5 pt-12">
        <header className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-[5px]">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-gold-500">
              {loc.city} · {methodName}
            </span>
            <h1 className="m-0 font-display text-[30px] font-medium leading-[1.05] tracking-[-0.01em]">Prayer</h1>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <Link href="/qibla" aria-label="Qibla compass" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-ivory">
              <IconCompass size={19} />
            </Link>
            <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Prayer settings" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-ivory">
              <IconGear size={19} />
            </button>
          </div>
        </header>

        {/* Live hero: now / next */}
        {today && nx && cur ? (
          <section aria-label="Next prayer" className="relative overflow-hidden rounded-hero border border-white/10 bg-white/[0.06] px-[18px] pb-4 pt-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-ivory/60">
                Now · <span className="text-ivory">{cur}</span>
                {!nx.isTomorrow && <span className="text-ivory/50"> since {fmt12(today.timings[cur])}</span>}
              </span>
              <span className="text-[11px] font-semibold text-gold-200/80">
                {today.hijri.day} {today.hijri.month} {today.hijri.year}
              </span>
            </div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div className="flex flex-col">
                <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-gold-500">{fastLabel ? fastLabel.label : `${nx.name} in`}</span>
                <span className="font-display text-[44px] font-medium leading-none tabular-nums tracking-[-0.02em]">{countdownClock((fastLabel ? fastLabel.at : nx.at).getTime() - now.getTime())}</span>
              </div>
              <div className="flex flex-col items-end text-right">
                <span className="text-[13px] font-bold">{fastLabel ? fmtInstant(fastLabel.at, today.tz) : fmt12(today.timings[nx.name])}</span>
                <span className="text-[11px] font-semibold text-ivory/55">{fastLabel ? (fastLabel.label.startsWith("Iftar") ? "Maghrib" : "Fajr") : nx.isTomorrow ? "tomorrow" : "today"}</span>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gold-500 transition-[width] duration-1000" style={{ width: `${Math.round(nx.progress * 100)}%` }} />
            </div>
            {ramadan && (
              <span className="mt-2 block text-[12px] font-semibold text-gold-200/80">
                Ramadan Mubarak · day {today.hijri.day} · Sehri ends {fmt12(today.timings.Fajr)} · Iftar {fmt12(today.timings.Maghrib)}
              </span>
            )}
          </section>
        ) : (
          <section className="rounded-hero border border-white/10 bg-white/[0.06] p-[18px]">
            <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-gold-500">Next prayer</span>
            <p className="mt-2 text-[14px] text-ivory/70">{error ? `Couldn’t load prayer times (${error}).` : "Loading prayer times…"}</p>
          </section>
        )}

        <div role="group" aria-label="View" className="grid grid-cols-2 gap-1 rounded-2xl bg-white/10 p-1">
          {(["today", "calendar"] as const).map((v) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`h-10 rounded-xl text-[13px] font-bold capitalize ${view === v ? "bg-ivory text-em-900" : "text-ivory/70"}`}>
              {v}
            </button>
          ))}
        </div>

        {view === "today" && (
          <>
            {/* Day navigation */}
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setSelected((s) => shiftDay(s, -1))} aria-label="Previous day" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10">
                <IconChevronLeft size={18} />
              </button>
              <button type="button" onClick={() => setSelected(todayIso)} className="flex flex-col items-center">
                <span className="text-[15px] font-bold">{isToday ? "Today" : fmtDay(isoToDate(selected))}</span>
                <span className="text-[11px] font-semibold text-gold-200/80">
                  {selDay ? `${selDay.hijri.day} ${selDay.hijri.month} ${selDay.hijri.year}` : isToday ? fmtDay(now) : "…"}
                  {!isToday && " · tap for today"}
                </span>
              </button>
              <button type="button" onClick={() => setSelected((s) => shiftDay(s, 1))} aria-label="Next day" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10">
                <IconChevronRight size={18} />
              </button>
            </div>

            {(fast || dayLog?.excused) && (
              <div className="flex flex-wrap gap-2">
                {fast && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-em-100/15 px-3 py-1.5 text-[12px] font-bold text-em-100">
                    <IconMoon size={14} /> {fast} · sunnah fast
                  </span>
                )}
                {dayLog?.excused && <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1.5 text-[12px] font-bold text-ivory/80">Excused · streak paused</span>}
              </div>
            )}

            {/* Prayer rows with tracker + alerts */}
            <section aria-label="Prayers" className="rounded-3xl border border-white/10 bg-white/5 px-3 py-1">
              {!selDay && <p className="px-1 py-4 text-[13px] text-ivory/60">Loading times…</p>}
              {selDay &&
                PRAYERS.map((p, i) => {
                  const isSalah = p !== "Sunrise";
                  const at = timeToDate(selDay.timings[p], isoToDate(selected), selDay.tz).getTime();
                  const passed = isToday ? at <= now.getTime() : !isFuture;
                  const isNext = isToday && nx && p === nx.name && !nx.isTomorrow;
                  const how = isSalah ? dayLog?.[p as SalahName] : undefined;
                  const a = isSalah ? alerts[p as SalahName] : null;
                  const canTrack = isSalah && !isFuture && !dayLog?.excused;
                  const status = how ? HOW_LABEL[how] : isNext ? `Next · in ${countdown(at - now.getTime())}` : canTrack && passed ? "Tap to mark" : "";
                  return (
                    <div key={p} className={`flex items-center gap-3 ${i < PRAYERS.length - 1 ? "border-b border-white/10" : ""} ${isSalah ? "h-[60px]" : "h-11"} ${isNext ? "text-gold-200" : passed && !how ? "text-ivory/60" : ""}`}>
                      {isSalah ? (
                        <button
                          type="button"
                          disabled={!canTrack}
                          onClick={() => toggle(selected, p as SalahName)}
                          aria-label={`${p}: ${how ? HOW_LABEL[how] : "not marked"}. Tap to change.`}
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-35 ${
                            how === "jamat" ? "bg-gold-500 text-night" : how === "ontime" ? "bg-em-600 text-ivory" : how === "late" ? "bg-ivory/20 text-ivory" : "border-[1.5px] border-ivory/35 text-transparent"
                          }`}
                        >
                          {how === "jamat" ? <IconDoubleCheck size={18} /> : how === "late" ? <span className="text-[14px] font-black text-ivory">~</span> : <IconCheck size={18} />}
                        </button>
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center text-ivory/50">
                          <IconSunrise size={18} />
                        </span>
                      )}
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className={`${isSalah ? "text-[15px]" : "text-[13px]"} ${isNext ? "font-bold" : "font-semibold"}`}>{p}</span>
                        {status && <span className={`truncate text-[11px] font-semibold ${how === "jamat" ? "text-gold-200" : how === "ontime" ? "text-em-100" : isNext ? "text-gold-200/75" : "text-ivory/45"}`}>{status}</span>}
                      </div>
                      <span className={`${isSalah ? "text-[15px]" : "text-[13px]"} tabular-nums ${isNext ? "font-bold" : "font-semibold"}`}>{fmt12(selDay.timings[p])}</span>
                      {a ? (
                        <button
                          type="button"
                          onClick={() => setAlertFor(p as SalahName)}
                          aria-label={`${p} alerts: ${a.azan ? "azan on" : "azan off"}${a.before ? `, ${a.before} minutes before` : ""}`}
                          className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${a.azan || a.before ? "text-ivory" : "text-ivory/35"}`}
                        >
                          <IconBell size={18} />
                          {a.before > 0 && <span className="absolute -right-0.5 top-0.5 rounded-full bg-gold-500 px-1 text-[8px] font-black leading-[12px] text-night">{a.before}</span>}
                        </button>
                      ) : (
                        <span className="w-9" />
                      )}
                    </div>
                  );
                })}
            </section>

            {/* Night times */}
            {night && selDay && (
              <section aria-label="Night" className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3">
                  <IconMoon size={18} className="shrink-0 text-ivory/60" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ivory/55">Midnight</span>
                    <span className="text-[14px] font-bold tabular-nums">{fmtInstant(night.midnight, selDay.tz)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3">
                  <IconMoon size={18} className="shrink-0 text-gold-200" />
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ivory/55">Last third</span>
                    <span className="text-[14px] font-bold tabular-nums">{fmtInstant(night.lastThird, selDay.tz)}</span>
                  </div>
                </div>
              </section>
            )}

            {/* Streak + 7-day trend */}
            <section aria-label="Your week" className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-full ${currentStreak > 0 ? "bg-gold-500 text-night" : "bg-white/10 text-ivory/60"}`}>
                    <IconFlame size={22} />
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[17px] font-bold leading-tight">{currentStreak === 1 ? "1-day streak" : `${currentStreak}-day streak`}</span>
                    <span className="text-[12px] text-ivory/55">{currentStreak > 0 ? "All five prayers, every day" : "Pray all five today to start one"}</span>
                  </div>
                </div>
                <span className="text-[12px] font-bold text-gold-200">{done}/5 today</span>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-1">
                {trend.map((iso) => {
                  const e = log[iso];
                  const d = isoToDate(iso);
                  const isT = iso === todayIso;
                  return (
                    <button key={iso} type="button" onClick={() => setSelected(iso)} aria-label={`${fmtDay(d)}: ${countDone(e)} of 5`} className={`flex flex-col items-center gap-1 rounded-xl py-1 ${iso === selected ? "bg-white/10" : ""}`}>
                      <span className="relative flex h-[30px] w-[30px] items-center justify-center">
                        <span className="absolute inset-0">{e?.excused && countDone(e) < 5 ? <Ring done={0} excused size={30} stroke={2.5} /> : <Ring done={countDone(e)} size={30} stroke={2.5} />}</span>
                        {countDone(e) === 5 && <IconCheck size={13} className="text-gold-200" />}
                      </span>
                      <span className={`text-[10px] font-bold ${isT ? "text-gold-200" : "text-ivory/55"}`}>{d.toLocaleDateString("en-CA", { weekday: "narrow" })}</span>
                    </button>
                  );
                })}
              </div>
              {!isFuture && (
                <button type="button" onClick={() => toggleExcusedDay(selected)} className="mt-3 text-[12px] font-bold text-ivory/55 underline-offset-2 hover:underline">
                  {dayLog?.excused ? "Remove excused mark for this day" : "Mark this day excused"}
                </button>
              )}
            </section>

            {/* Upcoming Islamic dates */}
            {events.length > 0 && (
              <section aria-label="Upcoming" className="flex flex-col gap-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-gold-500">Coming up</span>
                  <button type="button" onClick={() => setView("calendar")} className="text-[12px] font-bold text-ivory/60">
                    All dates
                  </button>
                </div>
                {events.slice(0, 3).map((e) => (
                  <div key={`${e.id}-${e.hijriYear}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[14px] font-bold">{e.name}</span>
                      <span className="truncate text-[12px] text-ivory/55">{e.sub}</span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                      <span className={`text-[12px] font-bold ${e.daysAway <= 1 ? "text-gold-200" : "text-ivory"}`}>{daysAwayLabel(e.daysAway)}</span>
                      <span className="text-[11px] text-ivory/50">{fmtDay(e.date)}</span>
                    </div>
                  </div>
                ))}
              </section>
            )}
          </>
        )}

        {view === "calendar" && (
          <>
            <MonthCalendar
              year={cal.y}
              month={cal.m}
              days={monthDays}
              log={log}
              events={events}
              selected={selected}
              onSelect={(iso) => {
                setSelected(iso);
                setView("today");
              }}
              onMonth={(delta) =>
                setCal((c) => {
                  const d = new Date(c.y, c.m - 1 + delta, 1);
                  return { y: d.getFullYear(), m: d.getMonth() + 1 };
                })
              }
            />
            <p className="m-0 px-1 text-[11px] text-ivory/45">Ring = prayers logged that day · gold dot = Islamic date · green dot = sunnah fast · tap a day to see its times and mark prayers.</p>

            {events.length > 0 && (
              <section aria-label="Islamic dates" className="flex flex-col gap-2">
                <span className="px-1 text-[11px] font-bold uppercase tracking-[0.1em] text-gold-500">Islamic dates ahead</span>
                {events.map((e) => (
                  <button
                    key={`${e.id}-${e.hijriYear}`}
                    type="button"
                    onClick={() => {
                      setSelected(todayKey(e.date));
                      setView("today");
                    }}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3 text-left"
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[14px] font-bold">{e.name}</span>
                      <span className="truncate text-[12px] text-ivory/55">{e.sub}</span>
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                      <span className={`text-[12px] font-bold ${e.daysAway <= 1 ? "text-gold-200" : "text-ivory"}`}>{daysAwayLabel(e.daysAway)}</span>
                      <span className="text-[11px] text-ivory/50">{fmtDay(e.date)}</span>
                    </div>
                  </button>
                ))}
                <p className="m-0 px-1 text-[11px] text-ivory/45">Dates follow the Umm al-Qura calendar; your local moon sighting may shift them by a day.</p>
              </section>
            )}
          </>
        )}

        <p className="m-0 px-1 text-[12px] font-semibold text-ivory/50">
          Asr: {settings.school === 1 ? "Hanafi" : "Standard"} · {METHODS.find((m) => m.id === settings.method)?.name} ·{" "}
          <button type="button" onClick={() => setSettingsOpen(true)} className="font-bold text-gold-200 underline-offset-2 hover:underline">
            change
          </button>
        </p>
      </div>

      {alertFor && selDay && <AlertSheet prayer={alertFor} time={selDay.timings[alertFor]} value={alerts[alertFor]} onChange={(patch) => updateAlert(alertFor, patch)} onClose={() => setAlertFor(null)} />}
      {settingsOpen && <SettingsSheet settings={settings} update={update} excusedMode={excusedMode} onToggleExcused={toggleExcusedMode} city={loc.city} onClose={() => setSettingsOpen(false)} />}
    </main>
  );
}
