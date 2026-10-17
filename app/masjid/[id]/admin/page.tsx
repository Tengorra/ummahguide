"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { IconBack, IconCheck, IconInfo } from "@/components/Icons";
import { useLocation } from "@/lib/location";
import { useDayTimes, useSettings } from "@/lib/aladhan";
import { fetchMosqueById, type Mosque } from "@/lib/overpass";
import { DEFAULT_OFFSETS, loadPublished, savePublished, type MaghribMode, type Published } from "@/lib/jamat";
import { SALAH, addMinutes, cleanTime, fmt12, type SalahName } from "@/lib/prayer";

/** "1:15 PM" / "13:15" / "1315" → "13:15" (24h) or null */
function parseTime(raw: string, defaultPm: boolean): string | null {
  const s = raw.trim().toUpperCase();
  const m = s.match(/^(\d{1,2})(?::?(\d{2}))?\s*(AM|PM)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const mins = Number(m[2] ?? "0");
  const ap = m[3] ?? (h <= 12 && defaultPm && h !== 12 ? "PM" : h < 12 && !defaultPm ? "AM" : undefined);
  if (mins > 59 || h > 23) return null;
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

const PM_DEFAULT: Record<SalahName, boolean> = { Fajr: false, Dhuhr: true, Asr: true, Maghrib: true, Isha: true };

export default function MasjidAdminPage() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const router = useRouter();
  const { loc } = useLocation(false);
  const { settings } = useSettings();
  const { day } = useDayTimes(loc.lat, loc.lng, settings);

  const [m, setM] = useState<Mosque | null>(null);
  const [scope, setScope] = useState<Published["scope"]>("until-changed");
  const [times, setTimes] = useState<Record<SalahName, string>>({ Fajr: "", Dhuhr: "", Asr: "", Maghrib: "", Isha: "" });
  const [maghribMode, setMaghribMode] = useState<MaghribMode>("offset");
  const [maghribOffset, setMaghribOffset] = useState(5);
  const [jumuah, setJumuah] = useState<string[]>(["", ""]);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    fetchMosqueById(id, loc.lat, loc.lng).then(setM).catch(() => setM(null));
  }, [id, loc.lat, loc.lng]);

  // Seed the form: existing publication, else adhan + typical offsets.
  useEffect(() => {
    if (seeded || !day) return;
    const p = loadPublished(id);
    if (p) {
      setTimes({ ...p.times, Maghrib: p.maghribMode === "fixed" ? p.times.Maghrib : "" } as Record<SalahName, string>);
      setMaghribMode(p.maghribMode);
      setMaghribOffset(p.maghribOffset);
      setJumuah(p.jumuah.length ? p.jumuah : ["", ""]);
      setScope(p.scope);
      // show as 12h in the inputs
      setTimes((t) => Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v ? fmt12(v) : ""])) as Record<SalahName, string>);
      setJumuah((j) => j.map((v) => (v ? fmt12(v) : "")));
    } else {
      const t = {} as Record<SalahName, string>;
      for (const p of SALAH) t[p] = p === "Maghrib" ? "" : fmt12(addMinutes(day.timings[p], DEFAULT_OFFSETS[p]));
      setTimes(t);
    }
    setSeeded(true);
  }, [day, id, seeded]);

  function publish() {
    const errs: Partial<Record<string, string>> = {};
    const out = {} as Record<SalahName, string>;
    for (const p of SALAH) {
      if (p === "Maghrib" && maghribMode === "offset") {
        out[p] = day ? addMinutes(day.timings.Maghrib, maghribOffset) : "18:00";
        continue;
      }
      const v = parseTime(times[p], PM_DEFAULT[p]);
      if (!v) errs[p] = "Enter a time like 1:15 PM";
      else out[p] = v;
    }
    const j = jumuah.map((v) => v.trim()).filter(Boolean).map((v) => parseTime(v, true));
    if (j.some((v) => v === null)) errs.jumuah = "Check the Jumu’ah times";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    savePublished({
      masjidId: id,
      masjidName: m?.name ?? "Masjid",
      times: out,
      maghribMode,
      maghribOffset,
      jumuah: j as string[],
      scope,
      updatedAt: new Date().toISOString(),
      verified: true,
    });
    router.push(`/masjid/${encodeURIComponent(id)}`);
  }

  const input = (p: SalahName, highlight = false) => (
    <input
      id={`t-${p}`}
      type="text"
      inputMode="text"
      autoComplete="off"
      value={times[p]}
      onChange={(e) => setTimes({ ...times, [p]: e.target.value })}
      onBlur={() => {
        const v = parseTime(times[p], PM_DEFAULT[p]);
        if (v) setTimes({ ...times, [p]: fmt12(v) });
      }}
      aria-invalid={!!errors[p]}
      className={`h-10 w-24 justify-self-end rounded-xl border text-center text-[14px] font-bold outline-none focus:border-em-900 ${
        errors[p] ? "border-red-500 bg-white" : highlight ? "border-[1.5px] border-em-900 bg-white" : "border-ink/10 bg-ivory"
      }`}
    />
  );

  return (
    <main className="min-h-dvh pb-[120px]">
      <div className="flex flex-col gap-4 px-5 pt-[52px]">
        <header className="flex items-center gap-3">
          <Link href={`/masjid/${encodeURIComponent(id)}`} aria-label="Back" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink/10 bg-white text-em-900">
            <IconBack />
          </Link>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h1 className="m-0 font-display text-[22px] font-medium leading-[1.1]">Publish Jamat times</h1>
            <span className="line-clamp-1 text-[12px] font-semibold text-muted">{m?.name ?? "Masjid"} · admin</span>
          </div>
        </header>

        <div role="group" aria-label="Apply to" className="grid grid-cols-3 gap-1 rounded-2xl bg-[#EEEAE0] p-1">
          {(
            [
              ["today", "Today only"],
              ["week", "This week"],
              ["until-changed", "Until changed"],
            ] as const
          ).map(([v, label]) => (
            <button key={v} type="button" aria-pressed={scope === v} onClick={() => setScope(v)} className={`h-10 rounded-xl text-[13px] ${scope === v ? "bg-white font-bold text-em-900 shadow-[0_2px_8px_rgba(11,61,51,0.1)]" : "font-semibold text-muted"}`}>
              {label}
            </button>
          ))}
        </div>

        <section aria-label="Daily Jamat times" className="card px-4 pb-1.5 pt-2">
          <div className="grid h-[34px] grid-cols-[minmax(0,1fr)_60px_104px] items-center border-b border-ink/5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
            <span>Prayer</span>
            <span className="text-right">Adhan</span>
            <span className="text-right">Jamat</span>
          </div>
          {SALAH.map((p, i) => (
            <div key={p} className={`grid min-h-14 grid-cols-[minmax(0,1fr)_60px_104px] items-center py-2 ${i < SALAH.length - 1 ? "border-b border-ink/5" : ""}`}>
              <div className="flex flex-col gap-0.5">
                <label htmlFor={`t-${p}`} className="text-[15px] font-semibold">
                  {p}
                </label>
                {p === "Maghrib" && (
                  <button type="button" onClick={() => setMaghribMode((v) => (v === "offset" ? "fixed" : "offset"))} className="text-left text-[11px] font-semibold text-em-600">
                    {maghribMode === "offset" ? `Follows adhan + ${maghribOffset} min · set fixed` : "Fixed time · follow adhan instead"}
                  </button>
                )}
                {errors[p] && <span className="text-[11px] font-semibold text-red-600">{errors[p]}</span>}
              </div>
              <span className="text-right text-[13px] text-muted">{day ? fmt12(day.timings[p], false) : "…"}</span>
              {p === "Maghrib" && maghribMode === "offset" ? (
                <div className="flex items-center justify-end gap-1">
                  <button type="button" aria-label="Less" onClick={() => setMaghribOffset((v) => Math.max(0, v - 1))} className="h-10 w-8 rounded-l-xl border border-em-600/30 bg-em-100 font-bold text-em-900">
                    −
                  </button>
                  <span className="flex h-10 w-12 items-center justify-center border-y border-em-600/30 bg-em-100 text-[13px] font-bold text-em-900">+{maghribOffset}</span>
                  <button type="button" aria-label="More" onClick={() => setMaghribOffset((v) => Math.min(30, v + 1))} className="h-10 w-8 rounded-r-xl border border-em-600/30 bg-em-100 font-bold text-em-900">
                    +
                  </button>
                </div>
              ) : (
                input(p, p === "Dhuhr")
              )}
            </div>
          ))}
        </section>

        <section aria-label="Jumu’ah" className="card flex flex-col gap-2.5 px-4 py-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[15px] font-bold">Jumu’ah khutbahs</span>
            <button type="button" onClick={() => setJumuah((j) => (j.length < 4 ? [...j, ""] : j))} className="h-8 rounded-full border border-em-900/25 bg-white px-3 text-[12px] font-bold text-em-900">
              + Add
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {jumuah.map((v, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <label htmlFor={`j-${i}`} className="label">
                  {["First", "Second", "Third", "Fourth"][i]}
                </label>
                <input
                  id={`j-${i}`}
                  type="text"
                  autoComplete="off"
                  placeholder="1:15 PM"
                  value={v}
                  onChange={(e) => setJumuah((j) => j.map((x, k) => (k === i ? e.target.value : x)))}
                  onBlur={() => {
                    const p = parseTime(v, true);
                    if (p) setJumuah((j) => j.map((x, k) => (k === i ? fmt12(p) : x)));
                  }}
                  className="h-10 w-full rounded-xl border border-ink/10 bg-ivory text-center text-[14px] font-bold outline-none focus:border-em-900"
                />
              </div>
            ))}
          </div>
          {errors.jumuah && <span className="text-[11px] font-semibold text-red-600">{errors.jumuah}</span>}
        </section>

        <div className="flex items-start gap-2.5 px-1">
          <IconInfo size={16} className="mt-0.5 shrink-0 text-em-600" />
          <span className="text-[12px] leading-[1.5] text-muted">
            Publishing updates every follower’s reminders and shows the Verified badge. Adhan times are calculated ({cleanTime(day?.timings.Dhuhr ?? "")} Dhuhr today); only Jamat times are yours.
          </span>
        </div>
      </div>

      <div className="fixed bottom-[18px] left-1/2 z-40 flex h-[68px] w-[calc(100%-32px)] max-w-[398px] -translate-x-1/2 items-center gap-2 rounded-full px-2 glass shadow-glass" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
        <Link href={`/masjid/${encodeURIComponent(id)}`} className="btn-secondary px-[18px] text-[14px]">
          Cancel
        </Link>
        <button type="button" onClick={publish} className="btn-primary flex-1">
          <IconCheck size={18} />
          Publish times
        </button>
      </div>
    </main>
  );
}
