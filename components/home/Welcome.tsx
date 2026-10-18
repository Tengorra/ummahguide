"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconBell, IconLocate } from "@/components/Icons";
import { useLocation } from "@/lib/location";
import { ensureNotificationPermission } from "@/lib/reminders";
import { readJSON, writeJSON } from "@/lib/storage";

const KEY = "ug.welcomed";

/**
 * First-open sheet: two taps and you're in. No survey, no account, skippable at every step.
 * Step 1 location (for prayer times and the masjid map), step 2 azan alerts.
 */
export default function Welcome() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const { loc, status, requestGps } = useLocation(false);

  useEffect(() => {
    if (!readJSON(KEY, false)) setOpen(true);
  }, []);

  function finish() {
    writeJSON(KEY, true);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-night/55" />
      <section aria-label="Welcome" className="relative flex w-full max-w-[430px] flex-col gap-4 rounded-t-[28px] bg-white px-5 pb-6 pt-2.5 text-ink shadow-sheet" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}>
        <span className="mx-auto h-[5px] w-10 rounded-full bg-ink/15" />
        <div className="flex items-center justify-between">
          <span className="label">{step === 1 ? "Step 1 of 2" : "Step 2 of 2"}</span>
          <button type="button" onClick={finish} className="text-[13px] font-bold text-muted">
            Skip
          </button>
        </div>

        {step === 1 ? (
          <>
            <div>
              <h2 className="m-0 font-display text-[26px] font-medium leading-[1.1]">Assalamu alaikum</h2>
              <p className="m-0 mt-2 text-[14px] leading-[1.5] text-[#3D4744]">UmmahGuide shows the next Jamat near you, prayer times, the Quran, duas and more — free, no ads, no account needed.</p>
            </div>
            <div className="rounded-2xl bg-ivory p-3.5">
              <p className="m-0 text-[14px] font-bold">Where are you?</p>
              <p className="m-0 mt-0.5 text-[12px] text-muted">Used only on this phone for prayer times and nearby masjids. Nothing runs in the background.</p>
              <button type="button" onClick={() => void requestGps()} className="btn-primary mt-3 h-12 w-full">
                <IconLocate size={18} className={status === "locating" ? "animate-pulse" : ""} />
                {status === "locating" ? "Locating…" : loc.source === "gps" ? `Using ${loc.city}` : "Use my location"}
              </button>
              <p className="m-0 mt-2 text-center text-[12px] text-muted">
                {status === "denied" ? "Location was blocked — " : "Or "}
                <Link href="/more" onClick={finish} className="font-bold text-em-900 underline underline-offset-2">
                  type a city
                </Link>
                {loc.source !== "gps" && ` · currently ${loc.city}`}
              </p>
            </div>
            <button type="button" onClick={() => setStep(2)} className="btn-secondary h-12">
              Next
            </button>
          </>
        ) : (
          <>
            <div>
              <h2 className="m-0 font-display text-[26px] font-medium leading-[1.1]">Azan alerts?</h2>
              <p className="m-0 mt-2 text-[14px] leading-[1.5] text-[#3D4744]">A notification at each prayer time, and “10 minutes before” if you want it. You can change each prayer in the Prayer tab.</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                await ensureNotificationPermission();
                finish();
              }}
              className="btn-primary h-12"
            >
              <IconBell size={18} /> Turn on alerts
            </button>
            <button type="button" onClick={finish} className="btn-secondary h-12">
              Not now
            </button>
            <p className="m-0 text-center text-[12px] text-muted">Tip: add UmmahGuide to your home screen so alerts and the Quran work like an app.</p>
          </>
        )}
      </section>
    </div>
  );
}
