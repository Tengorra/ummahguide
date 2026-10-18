"use client";

import Link from "next/link";
import Pattern from "@/components/Pattern";
import QiblaCompass from "@/components/QiblaCompass";
import { IconBack, IconLocate } from "@/components/Icons";
import { useLocationOnDemand } from "@/lib/location";

/** Full-screen Qibla. The compass itself handles device orientation and the bearing fallback. */
export default function QiblaPage() {
  const { loc, refreshing, refresh } = useLocationOnDemand();
  return (
    <main className="relative flex min-h-dvh flex-col bg-em-900 pb-[120px] text-ivory">
      <Pattern id="qibla-pattern" opacity={0.08} size={64} />
      <div className="relative flex flex-col gap-6 px-5 pt-12">
        <header className="flex items-center justify-between gap-3">
          <Link href="/prayer" aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-ivory">
            <IconBack size={20} />
          </Link>
          <div className="flex flex-col items-center">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-gold-500">Qibla</span>
            <span className="text-[13px] font-bold">{loc.city}</span>
          </div>
          <button type="button" onClick={() => void refresh()} aria-label="Use my location" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-ivory">
            <IconLocate size={18} className={refreshing ? "animate-pulse" : ""} />
          </button>
        </header>

        <div className="flex flex-col items-center gap-6 pt-6">
          <QiblaCompass lat={loc.lat} lng={loc.lng} dark />
          <div className="max-w-[300px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-[12px] leading-[1.6] text-ivory/70">
            Hold the phone flat. If the needle drifts, move it in a figure-of-eight to calibrate. Keep it away from magnets and metal.
          </div>
        </div>
      </div>
    </main>
  );
}
