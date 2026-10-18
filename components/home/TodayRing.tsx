"use client";

import Link from "next/link";
import { countDone, useTracker } from "@/lib/tracker";
import { todayKey } from "@/lib/storage";

/** Header chip: today's prayers logged (n/5) as a 5-segment ring; opens the Prayer tab. */
export default function TodayRing() {
  const { log } = useTracker();
  const day = log[todayKey()];
  const n = countDone(day);
  const size = 44;
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = 3;
  const seg = c / 5 - gap;
  return (
    <Link href="/prayer" aria-label={`${n} of 5 prayers logged today. Open the Prayer tab`} className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink/10 bg-white shadow-card">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={i < n ? (n === 5 ? "#C9A44C" : "#146B5A") : "#E3EFEA"} strokeWidth={stroke} strokeDasharray={`${seg} ${c - seg}`} strokeDashoffset={-(i * (seg + gap))} strokeLinecap="round" />
        ))}
      </svg>
      <span className={`relative text-[11px] font-black ${n === 5 ? "text-gold-700" : "text-em-900"}`}>{n}/5</span>
    </Link>
  );
}
