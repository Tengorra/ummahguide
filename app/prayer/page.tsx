"use client";

import { useEffect, useState } from "react";
import Pattern from "@/components/Pattern";
import QiblaCompass from "@/components/QiblaCompass";
import Switch from "@/components/Switch";
import { IconCheck, IconSunrise } from "@/components/Icons";
import { useLocation } from "@/lib/location";
import { METHODS, fetchWeek, useDayTimes, useSettings, type DayTimes } from "@/lib/aladhan";
import { useNow } from "@/lib/jamat";
import { ensureNotificationPermission } from "@/lib/reminders";
import { PRAYERS, SALAH, fmt12, nextPrayer, timeToDate, type SalahName } from "@/lib/prayer";
import { readJSON, writeJSON } from "@/lib/storage";

type Azan = Record<SalahName, boolean>;
const DEFAULT_AZAN: Azan = { Fajr: true, Dhuhr: true, Asr: true, Maghrib: true, Isha: true };

export default function PrayerPage() {
  const { loc } = useLocation();
  const { settings, update } = useSettings();
  const { day, error } = useDayTimes(loc.lat, loc.lng, settings);
  const now = useNow(30000);
  const [view, setView] = useState<"today" | "week">("today");
  const [week, setWeek] = useState<DayTimes[] | null>(null);
  const [azan, setAzan] = useState<Azan>(DEFAULT_AZAN);

  useEffect(() => {
    setAzan(readJSON<Azan>("ug.azan", DEFAULT_AZAN));
  }, []);

  useEffect(() => {
    if (view !== "week") return;
    fetchWeek(loc.lat, loc.lng, settings).then(setWeek).catch(() => setWeek([]));
  }, [view, loc.lat, loc.lng, settings]);

  async function toggleAzan(p: SalahName, v: boolean) {
    const next = { ...azan, [p]: v };
    setAzan(next);
    writeJSON("ug.azan", next);
    if (v) await ensureNotificationPermission();
  }

  const nx = day ? nextPrayer(day.timings, now) : null;

  return (
    <main className="relative min-h-dvh bg-em-900 pb-[120px] text-ivory">
      <Pattern id="prayer-pattern" opacity={0.08} size={64} />
      <div className="relative flex flex-col gap-4 px-5 pt-14">
        <header className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-[5px]">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-gold-500">{loc.city}</span>
            <h1 className="m-0 font-display text-[30px] font-medium leading-[1.05] tracking-[-0.01em]">Prayer times</h1>
          </div>
          <label className="mt-1 flex h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 text-[12px] font-bold">
            <span className="sr-only">Calculation method</span>
            <select
              value={settings.method}
              onChange={(e) => update({ method: Number(e.target.value) })}
              className="max-w-[120px] bg-transparent text-ivory outline-none"
            >
              {METHODS.map((m) => (
                <option key={m.id} value={m.id} className="text-ink">
                  {m.name}
                </option>
              ))}
            </select>
          </label>
        </header>

        <QiblaCompass lat={loc.lat} lng={loc.lng} dark />

        <div role="group" aria-label="View" className="grid grid-cols-2 gap-1 rounded-2xl bg-white/10 p-1">
          {(["today", "week"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={view === v}
              onClick={() => setView(v)}
              className={`h-10 rounded-xl text-[13px] font-bold capitalize ${view === v ? "bg-ivory text-em-900" : "text-ivory/70"}`}
            >
              {v}
            </button>
          ))}
        </div>

        {error && <p className="text-[13px] text-ivory/70">Couldn’t load prayer times: {error}</p>}

        {view === "today" && day && nx && (
          <section aria-label="Today’s prayers" className="rounded-3xl border border-white/10 bg-white/5 px-4 py-1.5">
            {PRAYERS.map((p, i) => {
              const at = timeToDate(day.timings[p], now).getTime();
              const passed = at <= now.getTime();
              const isNext = p === nx.name && !nx.isTomorrow;
              const isSalah = p !== "Sunrise";
              return (
                <div
                  key={p}
                  className={`flex items-center gap-3 ${i < PRAYERS.length - 1 ? "border-b border-white/10" : ""} ${
                    isNext ? "h-14 text-gold-200" : passed ? "h-[50px] text-ivory/50" : "h-[50px]"
                  }`}
                >
                  {p === "Sunrise" ? (
                    <IconSunrise size={18} />
                  ) : isNext ? (
                    <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-gold-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-night" />
                    </span>
                  ) : passed ? (
                    <IconCheck size={18} />
                  ) : (
                    <span className="h-[18px] w-[18px] rounded-full border-[1.5px] border-ivory/35" />
                  )}
                  <div className="flex flex-1 flex-col">
                    <span className={`text-[15px] ${isNext ? "font-bold" : "font-semibold"}`}>{p}</span>
                    {isNext && <span className="text-[11px] font-semibold text-gold-200/75">Next · {nx.isTomorrow ? "tomorrow" : "today"}</span>}
                  </div>
                  <span className={`text-[15px] ${isNext ? "font-bold" : "font-semibold"}`}>{fmt12(day.timings[p])}</span>
                  {isSalah ? (
                    <Switch dark checked={azan[p as SalahName]} onChange={(v) => toggleAzan(p as SalahName, v)} label={`Azan alert for ${p}`} />
                  ) : (
                    <span className="w-11" />
                  )}
                </div>
              );
            })}
          </section>
        )}

        {view === "week" && (
          <section aria-label="This week" className="overflow-x-auto rounded-3xl border border-white/10 bg-white/5">
            <table className="w-full min-w-[420px] border-collapse text-[13px]">
              <thead>
                <tr className="text-[11px] font-bold uppercase tracking-[0.08em] text-ivory/60">
                  <th className="px-3 py-3 text-left">Day</th>
                  {SALAH.map((p) => (
                    <th key={p} className="px-2 py-3 text-right">
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(week ?? []).map((d, i) => (
                  <tr key={d.date} className={`border-t border-white/10 ${i === 0 ? "text-gold-200" : ""}`}>
                    <td className="px-3 py-2.5 text-left">
                      <div className="font-semibold">{i === 0 ? "Today" : d.gregorianWeekday.slice(0, 3)}</div>
                      <div className="text-[11px] text-ivory/55">
                        {d.hijri.day} {d.hijri.month.split(" ")[0]}
                      </div>
                    </td>
                    {SALAH.map((p) => (
                      <td key={p} className="px-2 py-2.5 text-right font-semibold">
                        {fmt12(d.timings[p], false)}
                      </td>
                    ))}
                  </tr>
                ))}
                {!week && (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-ivory/60">
                      Loading the week…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        )}

        <div className="flex items-center justify-between px-1 text-[12px]">
          <span className="font-semibold text-ivory/60">
            Asr: {settings.school === 1 ? "Hanafi" : "Standard"} ·{" "}
            <button type="button" onClick={() => update({ school: settings.school === 1 ? 0 : 1 })} className="font-bold text-gold-200 underline-offset-2 hover:underline">
              switch
            </button>
          </span>
          <span className="font-semibold text-ivory/60">Alerts fire while the app is open</span>
        </div>
      </div>
    </main>
  );
}
