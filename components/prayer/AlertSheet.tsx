"use client";

import { useEffect, useState } from "react";
import Switch from "@/components/Switch";
import { IconBell } from "@/components/Icons";
import { LEAD_OPTIONS, type LeadMin, type PrayerAlert } from "@/lib/alerts";
import { fmt12, type SalahName } from "@/lib/prayer";
import { ensureNotificationPermission } from "@/lib/reminders";

/** Bottom sheet for one prayer: azan at the time, and an optional reminder before it. */
export default function AlertSheet({
  prayer,
  time,
  value,
  onChange,
  onClose,
}: {
  prayer: SalahName;
  time: string;
  value: PrayerAlert;
  onChange: (patch: Partial<PrayerAlert>) => void;
  onClose: () => void;
}) {
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function turnOn(patch: Partial<PrayerAlert>) {
    onChange(patch);
    const perm = await ensureNotificationPermission();
    if (perm === "denied") setNote("Notifications are blocked for this site. Enable them in your browser settings to hear alerts.");
    else if (perm === "unsupported") setNote("This browser can’t show notifications. Install the app to your home screen for the best experience.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-night/50" />
      <section
        aria-label={`${prayer} alerts`}
        className="relative flex w-full max-w-[430px] flex-col gap-[18px] rounded-t-[28px] bg-white px-5 pb-6 pt-2.5 text-ink shadow-sheet"
        style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}
      >
        <span className="mx-auto h-[5px] w-10 rounded-full bg-ink/15" />
        <div className="flex flex-col gap-1">
          <h2 className="m-0 font-display text-[24px] font-medium leading-[1.1]">
            {prayer} <span className="text-muted">· {fmt12(time)}</span>
          </h2>
          <span className="text-[13px] text-muted">Alerts fire while UmmahGuide is open or installed on your home screen.</span>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-ivory px-3.5 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-em-900">
            <IconBell size={18} />
          </span>
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-[14px] font-bold">Azan at {fmt12(time)}</span>
            <span className="text-[12px] text-muted">Notification when {prayer} comes in</span>
          </div>
          <Switch checked={value.azan} onChange={(v) => (v ? void turnOn({ azan: true }) : onChange({ azan: false }))} label={`Azan alert for ${prayer}`} />
        </div>

        <div className="flex flex-col gap-2.5">
          <span className="label">Remind me before</span>
          <div role="group" aria-label="Reminder lead time" className="grid grid-cols-5 gap-1 rounded-2xl bg-[#EEEAE0] p-1">
            {LEAD_OPTIONS.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={value.before === v}
                onClick={() => (v ? void turnOn({ before: v as LeadMin }) : onChange({ before: 0 }))}
                className={`h-10 rounded-xl text-[13px] ${value.before === v ? "bg-white font-bold text-em-900 shadow-[0_2px_8px_rgba(11,61,51,0.1)]" : "font-semibold text-muted"}`}
              >
                {v === 0 ? "Off" : `${v}m`}
              </button>
            ))}
          </div>
        </div>

        {note && <p className="m-0 rounded-2xl bg-gold-100 p-3 text-[12px] font-semibold text-gold-700">{note}</p>}

        <button type="button" onClick={onClose} className="btn-primary h-[54px]">
          Done
        </button>
      </section>
    </div>
  );
}
