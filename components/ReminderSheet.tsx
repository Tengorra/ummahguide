"use client";

import { useEffect, useState } from "react";
import Switch from "./Switch";
import { IconBell } from "./Icons";
import { SALAH, type SalahName } from "@/lib/prayer";
import { ensureNotificationPermission, getReminder, removeReminder, saveReminder, type Reminder } from "@/lib/reminders";

export default function ReminderSheet({
  masjidId,
  masjidName,
  onClose,
}: {
  masjidId: string;
  masjidName: string;
  onClose: () => void;
}) {
  const [prayers, setPrayers] = useState<SalahName[]>(["Dhuhr", "Isha"]);
  const [jumuah, setJumuah] = useState(true);
  const [lead, setLead] = useState<Reminder["leadMin"]>(15);
  const [alertOnChange, setAlertOnChange] = useState(true);
  const [existing, setExisting] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const r = getReminder(masjidId);
    if (r) {
      setPrayers(r.prayers);
      setJumuah(r.jumuah);
      setLead(r.leadMin);
      setAlertOnChange(r.alertOnChange);
      setExisting(true);
    }
  }, [masjidId]);

  function toggle(p: SalahName) {
    setPrayers((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  async function save() {
    const perm = await ensureNotificationPermission();
    if (perm === "denied") setNote("Notifications are blocked for this site. Enable them in your browser settings to receive alerts.");
    else if (perm === "unsupported") setNote("This browser can’t show notifications. Install the app to your home screen for the best experience.");
    saveReminder({ masjidId, masjidName, prayers, jumuah, leadMin: lead, alertOnChange, createdAt: new Date().toISOString() });
    if (perm === "granted") onClose();
  }

  const count = prayers.length + (jumuah ? 1 : 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-night/50" />
      <section
        aria-label="Remind me before Jamat"
        className="relative flex w-full max-w-[430px] flex-col gap-[18px] rounded-t-[28px] bg-white px-5 pb-6 pt-2.5 shadow-sheet"
        style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}
      >
        <span className="mx-auto h-[5px] w-10 rounded-full bg-ink/15" />
        <div className="flex flex-col gap-1">
          <h2 className="m-0 font-display text-[24px] font-medium leading-[1.1]">Remind me before Jamat</h2>
          <span className="text-[13px] text-muted">{masjidName} · alerts follow the times the masjid publishes</span>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="label">Which prayers</span>
          <div className="flex flex-wrap gap-2">
            {SALAH.map((p) => {
              const on = prayers.includes(p);
              return (
                <button key={p} type="button" aria-pressed={on} onClick={() => toggle(p)} className={`h-10 rounded-full px-4 text-[14px] ${on ? "bg-em-900 font-bold text-ivory" : "border border-ink/10 bg-white font-semibold text-ink"}`}>
                  {p}
                </button>
              );
            })}
            <button type="button" aria-pressed={jumuah} onClick={() => setJumuah((v) => !v)} className={`h-10 rounded-full px-4 text-[14px] ${jumuah ? "bg-em-900 font-bold text-ivory" : "border border-ink/10 bg-white font-semibold text-ink"}`}>
              Jumu’ah
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="label">How early</span>
          <div role="group" aria-label="Lead time" className="grid grid-cols-3 gap-1 rounded-2xl bg-[#EEEAE0] p-1">
            {([10, 15, 30] as const).map((v) => (
              <button key={v} type="button" aria-pressed={lead === v} onClick={() => setLead(v)} className={`h-10 rounded-xl text-[14px] ${lead === v ? "bg-white font-bold text-em-900 shadow-[0_2px_8px_rgba(11,61,51,0.1)]" : "font-semibold text-muted"}`}>
                {v} min
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-ivory px-3.5 py-3">
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-[14px] font-bold">Alert me when a time changes</span>
            <span className="text-[12px] text-muted">Ramadan, daylight saving, Jumu’ah moves</span>
          </div>
          <Switch checked={alertOnChange} onChange={setAlertOnChange} label="Alert me when a time changes" />
        </div>

        {note && <p className="m-0 rounded-2xl bg-gold-100 p-3 text-[12px] font-semibold text-gold-700">{note}</p>}

        <button type="button" onClick={save} disabled={count === 0} className="btn-primary h-[54px] disabled:opacity-40">
          <IconBell size={18} />
          {existing ? `Update ${count} reminder${count === 1 ? "" : "s"}` : `Save ${count} reminder${count === 1 ? "" : "s"}`}
        </button>
        {existing && (
          <button
            type="button"
            onClick={() => {
              removeReminder(masjidId);
              onClose();
            }}
            className="text-[13px] font-bold text-muted"
          >
            Remove reminders for this masjid
          </button>
        )}
      </section>
    </div>
  );
}
