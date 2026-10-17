"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconChevronRight, IconLocate } from "@/components/Icons";
import { METHODS, useSettings } from "@/lib/aladhan";
import { geocodeCity, useLocation } from "@/lib/location";
import { ensureNotificationPermission, loadReminders, type Reminder } from "@/lib/reminders";
import { readJSON } from "@/lib/storage";

export default function MorePage() {
  const { loc, status, requestGps, setLoc } = useLocation(false);
  const { settings, update } = useSettings();
  const [city, setCity] = useState("");
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [bookmarks, setBookmarks] = useState(0);
  const [perm, setPerm] = useState<string>("");

  useEffect(() => {
    setReminders(loadReminders());
    setBookmarks(readJSON<unknown[]>("ug.quran.bookmarks", []).length);
    if (typeof window !== "undefined" && "Notification" in window) setPerm(Notification.permission);
  }, []);

  async function saveCity(e: React.FormEvent) {
    e.preventDefault();
    const hit = await geocodeCity(city);
    if (hit) {
      setLoc(hit);
      setCity("");
    }
  }

  return (
    <main className="flex flex-col gap-4 px-5 pb-[120px] pt-14">
      <h1 className="m-0 font-display text-[30px] font-medium leading-[1.05]">Settings</h1>

      <section aria-label="Location" className="card flex flex-col gap-3 p-4">
        <span className="label">Location</span>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[15px] font-bold">{loc.city}</span>
            <span className="text-[12px] text-muted">{loc.source === "gps" ? "From your device" : loc.source === "search" ? "From search" : "Default · set yours"}</span>
          </div>
          <button type="button" onClick={() => void requestGps()} className="chip h-10 gap-1.5">
            <IconLocate size={16} className={status === "locating" ? "animate-pulse" : ""} />
            {status === "denied" ? "Denied" : "Use GPS"}
          </button>
        </div>
        <form onSubmit={saveCity} className="flex gap-2">
          <label htmlFor="city" className="sr-only">
            City
          </label>
          <input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Or type a city" className="h-11 min-w-0 flex-1 rounded-full border border-ink/10 bg-ivory px-4 text-[14px] font-semibold outline-none focus:border-em-900" />
          <button type="submit" className="btn-primary h-11 px-4 text-[14px]">
            Set
          </button>
        </form>
      </section>

      <section aria-label="Calculation" className="card flex flex-col gap-3 p-4">
        <span className="label">Prayer calculation</span>
        <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-muted">
          Method
          <select value={settings.method} onChange={(e) => update({ method: Number(e.target.value) })} className="h-11 rounded-xl border border-ink/10 bg-ivory px-3 text-[14px] font-bold text-ink outline-none">
            {METHODS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1.5 text-[12px] font-semibold text-muted">
          Asr (juristic)
          <div role="group" aria-label="Asr school" className="grid grid-cols-2 gap-1 rounded-2xl bg-[#EEEAE0] p-1">
            {(
              [
                [0, "Standard"],
                [1, "Hanafi"],
              ] as const
            ).map(([v, label]) => (
              <button key={v} type="button" aria-pressed={settings.school === v} onClick={() => update({ school: v })} className={`h-10 rounded-xl text-[13px] ${settings.school === v ? "bg-white font-bold text-em-900 shadow-[0_2px_8px_rgba(11,61,51,0.1)]" : "font-semibold text-muted"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section id="alerts" aria-label="Alerts" className="card flex flex-col gap-3 p-4">
        <span className="label">Alerts</span>
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="text-[15px] font-bold">Notifications</span>
            <span className="text-[12px] text-muted">{perm === "granted" ? "Allowed" : perm === "denied" ? "Blocked in browser settings" : "Not yet allowed"}</span>
          </div>
          {perm !== "granted" && perm !== "denied" && (
            <button type="button" onClick={async () => setPerm(String(await ensureNotificationPermission()))} className="chip-active h-10">
              Allow
            </button>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {reminders.length === 0 && <span className="text-[13px] text-muted">No Jamat reminders yet. Open a masjid and tap Remind me.</span>}
          {reminders.map((r) => (
            <Link key={r.masjidId} href={`/masjid/${encodeURIComponent(r.masjidId)}?remind=1`} className="flex items-center justify-between rounded-2xl bg-ivory px-3.5 py-3 text-ink">
              <span className="flex flex-col">
                <span className="text-[14px] font-bold">{r.masjidName}</span>
                <span className="text-[12px] text-muted">
                  {[...r.prayers, ...(r.jumuah ? ["Jumu’ah"] : [])].join(", ")} · {r.leadMin} min before
                </span>
              </span>
              <IconChevronRight className="text-muted" />
            </Link>
          ))}
        </div>
        <span className="text-[12px] text-muted">Alerts fire while UmmahGuide is open or installed on your home screen.</span>
      </section>

      <section aria-label="Library" className="card flex flex-col p-1">
        <Link href="/quran" className="flex h-14 items-center justify-between px-3 text-ink">
          <span className="text-[15px] font-bold">Quran bookmarks</span>
          <span className="flex items-center gap-2 text-[13px] font-semibold text-muted">
            {bookmarks}
            <IconChevronRight />
          </span>
        </Link>
      </section>

      <p className="m-0 px-1 text-[12px] leading-[1.6] text-muted">
        UmmahGuide uses free, open data: prayer times from Aladhan, masjid locations from OpenStreetMap, and Quran text and audio from the Quran.com API. Jamat times are published by each masjid; until then they are estimates. Add your masjid to OpenStreetMap so it appears for everyone.
      </p>
    </main>
  );
}
