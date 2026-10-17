"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconMasjid } from "./Icons";
import { fetchMosques, type Mosque } from "@/lib/overpass";
import { buildJamatDay, loadPublished, nextJamat, useNow } from "@/lib/jamat";
import { fmt12, type Timings } from "@/lib/prayer";

export default function NearestMasjid({ lat, lng, timings, tz }: { lat: number; lng: number; timings: Timings | null; tz?: string }) {
  const [m, setM] = useState<Mosque | null | undefined>(undefined);
  const now = useNow(60000);

  useEffect(() => {
    let live = true;
    fetchMosques(lat, lng)
      .then((list) => live && setM(list[0] ?? null))
      .catch(() => live && setM(null));
    return () => {
      live = false;
    };
  }, [lat, lng]);

  const nj = m && timings ? nextJamat(buildJamatDay(timings, loadPublished(m.id), tz), now) : null;

  return (
    <Link href={m ? `/masjid/${m.id}` : "/masjid"} className="card flex flex-col gap-2.5 p-4 text-ink">
      <div className="flex items-center justify-between">
        <span className="label">Nearest masjid</span>
        <IconMasjid className="text-em-600" />
      </div>
      {m === undefined ? (
        <div className="flex flex-col gap-2">
          <div className="h-4 w-4/5 rounded bg-ivory" />
          <div className="h-3 w-1/2 rounded bg-ivory" />
        </div>
      ) : m === null ? (
        <div className="flex flex-col gap-0.5">
          <span className="text-[15px] font-bold leading-tight">Find a masjid</span>
          <span className="text-[12px] text-muted">Open the map to search</span>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-0.5">
            <span className="line-clamp-1 text-[15px] font-bold leading-tight">{m.name}</span>
            <span className="text-[12px] text-muted">{m.distanceKm.toFixed(1)} km away</span>
          </div>
          {nj && (
            <span className="gold-pill self-start">
              {nj.prayer} Jamat {fmt12(nj.time)}
              {nj.source === "estimated" ? " · est." : ""}
            </span>
          )}
        </>
      )}
    </Link>
  );
}
