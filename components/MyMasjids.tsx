"use client";

import Link from "next/link";
import { IconChevronRight, IconHome } from "./Icons";
import { buildJamatDay, loadPublished, nextJamat, useNow } from "@/lib/jamat";
import { haversineKm } from "@/lib/aladhan";
import { useMyMasjids, type MyMasjid, type Slot } from "@/lib/mymasjids";
import { countdown, fmt12, type Timings } from "@/lib/prayer";

function IconWork(p: { size?: number; className?: string }) {
  return (
    <svg width={p.size ?? 22} height={p.size ?? 22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={p.className}>
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </svg>
  );
}

function Row({ slot, m, lat, lng, timings, now, divider }: { slot: Slot; m: MyMasjid; lat: number; lng: number; timings: Timings | null; now: Date; divider: boolean }) {
  const nj = timings ? nextJamat(buildJamatDay(timings, loadPublished(m.id)), now) : null;
  const km = haversineKm(lat, lng, m.lat, m.lng);
  return (
    <Link href={`/masjid/${encodeURIComponent(m.id)}`} className={`flex items-center gap-3 px-4 py-2.5 text-ink ${divider ? "border-t border-ink/5" : ""}`}>
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-em-100 text-em-900">{slot === "home" ? <IconHome size={16} /> : <IconWork size={16} />}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="line-clamp-1 text-[13px] font-bold leading-tight">
          <span className="mr-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">{slot}</span>
          {m.name}
        </span>
        <span className="text-[11px] text-muted">
          {km < 10 ? km.toFixed(1) : Math.round(km)} km
          {nj ? (
            <>
              {" · "}
              <span className="font-semibold text-gold-700">
                {nj.prayer} {fmt12(nj.time)}
              </span>
              {" · in "}
              {countdown(nj.msUntil)}
            </>
          ) : null}
        </span>
      </span>
      <IconChevronRight size={16} className="shrink-0 text-muted" />
    </Link>
  );
}

/**
 * Compact strip of the user's Home and Work masjids — shown only for the ones that are NOT already
 * in the "near you" list, so their Jamat is always one glance away without duplicating rows.
 */
export default function MyMasjids({ lat, lng, timings, excludeIds = [] }: { lat: number; lng: number; timings: Timings | null; excludeIds?: string[] }) {
  const { home, work } = useMyMasjids();
  const now = useNow(60000);
  const rows: Array<{ slot: Slot; m: MyMasjid }> = [];
  if (home && !excludeIds.includes(home.id)) rows.push({ slot: "home", m: home });
  if (work && !excludeIds.includes(work.id)) rows.push({ slot: "work", m: work });
  if (rows.length === 0) return null;
  return (
    <section aria-label="Your masjids" className="card overflow-hidden">
      {rows.map((r, i) => (
        <Row key={r.slot} slot={r.slot} m={r.m} lat={lat} lng={lng} timings={timings} now={now} divider={i > 0} />
      ))}
    </section>
  );
}
