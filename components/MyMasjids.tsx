"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconHome, IconMasjid } from "./Icons";
import { fetchMosques, type Mosque } from "@/lib/overpass";
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

function SlotCard({ slot, m, lat, lng, timings, now }: { slot: Slot; m: MyMasjid; lat: number; lng: number; timings: Timings | null; now: Date }) {
  const nj = timings ? nextJamat(buildJamatDay(timings, loadPublished(m.id)), now) : null;
  const km = haversineKm(lat, lng, m.lat, m.lng);
  return (
    <Link href={`/masjid/${encodeURIComponent(m.id)}`} className="card flex min-w-0 flex-col gap-2 p-3.5 text-ink">
      <div className="flex items-center justify-between gap-2">
        <span className="label flex items-center gap-1.5">
          {slot === "home" ? <IconHome size={14} /> : <IconWork size={14} />}
          {slot}
        </span>
        <span className="text-[11px] font-semibold text-muted">{km.toFixed(1)} km</span>
      </div>
      <span className="line-clamp-1 text-[15px] font-bold leading-tight">{m.name}</span>
      {nj ? (
        <div className="flex items-center justify-between gap-2">
          <span className="gold-pill">
            {nj.prayer} {fmt12(nj.time)}
          </span>
          <span className="whitespace-nowrap text-[11px] font-semibold text-muted">
            in {countdown(nj.msUntil)}
            {nj.source === "estimated" ? " · est." : ""}
          </span>
        </div>
      ) : (
        <div className="h-6 w-2/3 rounded-full bg-ivory" />
      )}
    </Link>
  );
}

/**
 * The user's Home and Work masjids with their next Jamat.
 * Until a Home is chosen, offers the nearest masjid with one tap to set it.
 */
export default function MyMasjids({ lat, lng, timings }: { lat: number; lng: number; timings: Timings | null }) {
  const { home, work, set } = useMyMasjids();
  const now = useNow(60000);
  const [nearest, setNearest] = useState<Mosque | null | undefined>(undefined);

  useEffect(() => {
    if (home) return;
    let live = true;
    fetchMosques(lat, lng)
      .then((list) => live && setNearest(list[0] ?? null))
      .catch(() => live && setNearest(null));
    return () => {
      live = false;
    };
  }, [lat, lng, home]);

  if (!home && !work) {
    const nj = nearest && timings ? nextJamat(buildJamatDay(timings, loadPublished(nearest.id)), now) : null;
    return (
      <section aria-label="Your masjid" className="card flex items-center gap-3 p-3.5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-em-100 text-em-900">
          <IconMasjid />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="label">Nearest masjid</span>
          {nearest === undefined ? (
            <span className="h-4 w-3/4 rounded bg-ivory" />
          ) : nearest === null ? (
            <span className="text-[14px] font-bold">No masjid found nearby</span>
          ) : (
            <Link href={`/masjid/${encodeURIComponent(nearest.id)}`} className="line-clamp-1 text-[14px] font-bold text-ink">
              {nearest.name}
              <span className="font-semibold text-muted"> · {nearest.distanceKm.toFixed(1)} km</span>
              {nj && (
                <span className="font-semibold text-gold-700">
                  {" "}
                  · {nj.prayer} {fmt12(nj.time)}
                </span>
              )}
            </Link>
          )}
        </div>
        {nearest ? (
          <button type="button" onClick={() => set("home", { id: nearest.id, name: nearest.name, lat: nearest.lat, lng: nearest.lng })} className="chip-active h-9 shrink-0 px-3 text-[12px]">
            Set as Home
          </button>
        ) : (
          <Link href="/masjid" className="chip h-9 shrink-0 px-3 text-[12px]">
            Choose
          </Link>
        )}
      </section>
    );
  }

  return (
    <section aria-label="Your masjids" className="grid grid-cols-2 gap-3">
      {home && <SlotCard slot="home" m={home} lat={lat} lng={lng} timings={timings} now={now} />}
      {work && <SlotCard slot="work" m={work} lat={lat} lng={lng} timings={timings} now={now} />}
      {(!home || !work) && (
        <Link href="/masjid" className="flex min-h-[96px] flex-col items-center justify-center gap-1.5 rounded-card border border-dashed border-em-600/35 text-em-600">
          {home ? <IconWork size={20} /> : <IconHome size={20} />}
          <span className="text-[12px] font-bold">Add {home ? "work" : "home"} masjid</span>
        </Link>
      )}
    </section>
  );
}
