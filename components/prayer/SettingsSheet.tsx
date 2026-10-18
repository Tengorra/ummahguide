"use client";

import Link from "next/link";
import { useEffect } from "react";
import Switch from "@/components/Switch";
import { IconChevronRight } from "@/components/Icons";
import { METHODS, type Settings } from "@/lib/aladhan";

/** Prayer settings sheet: calculation method, Asr school, excused mode. Location lives in Settings. */
export default function SettingsSheet({
  settings,
  update,
  excusedMode,
  onToggleExcused,
  city,
  onClose,
}: {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  excusedMode: boolean;
  onToggleExcused: () => void;
  city: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-night/50" />
      <section
        aria-label="Prayer settings"
        className="relative flex w-full max-w-[430px] flex-col gap-[18px] rounded-t-[28px] bg-white px-5 pb-6 pt-2.5 text-ink shadow-sheet"
        style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}
      >
        <span className="mx-auto h-[5px] w-10 rounded-full bg-ink/15" />
        <h2 className="m-0 font-display text-[24px] font-medium leading-[1.1]">Prayer settings</h2>

        <label className="flex flex-col gap-1.5 text-[12px] font-semibold text-muted">
          Calculation method
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

        <div className="flex items-center gap-3 rounded-2xl bg-ivory px-3.5 py-3">
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-[14px] font-bold">Excused from prayer</span>
            <span className="text-[12px] text-muted">Illness, menstruation, travel — days are marked excused and your streak pauses instead of breaking.</span>
          </div>
          <Switch checked={excusedMode} onChange={onToggleExcused} label="Excused from prayer" />
        </div>

        <Link href="/more" onClick={onClose} className="flex items-center justify-between rounded-2xl bg-ivory px-3.5 py-3 text-ink">
          <span className="flex flex-col">
            <span className="text-[14px] font-bold">Location</span>
            <span className="text-[12px] text-muted">{city} · change in Settings</span>
          </span>
          <IconChevronRight className="text-muted" />
        </Link>

        <button type="button" onClick={onClose} className="btn-primary h-[54px]">
          Done
        </button>
      </section>
    </div>
  );
}
