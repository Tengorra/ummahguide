"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { IconChevronRight, IconLocate, IconMasjid, IconNavigate } from "./Icons";
import { directionsUrl, fetchMosques, mosqueCellKey, type Mosque } from "@/lib/overpass";
import { buildJamatDay, loadPublished, nextJamat, useNow } from "@/lib/jamat";
import { haversineKm } from "@/lib/aladhan";
import { useMyMasjids, type MyMasjid } from "@/lib/mymasjids";
import { countdown, fmt12, type Timings } from "@/lib/prayer";

function ago(ts: number | null): string {
  if (!ts) return "";
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 45) return "just now";
  if (s < 90) return "1 min ago";
  return `${Math.round(s / 60)} min ago`;
}

function Tag({ children }: { children: string }) {
  return <span className="rounded-full bg-em-900 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-ivory">{children}</span>;
}

/**
 * "Near you now": the closest masjids to the phone's live position, with their next Jamat and
 * one-tap directions. Re-sorts as the phone moves. Home / Work masjids are tagged when they're near.
 */
export default function NearYou({
  lat,
  lng,
  timings,
  tz,
  live,
  liveStatus,
  updatedAt,
  onEnable,
  onNearIds,
  count = 2,
}: {
  lat: number;
  lng: number;
  timings: Timings | null;
  tz?: string;
  live: boolean;
  liveStatus: "idle" | "watching" | "denied" | "unsupported";
  updatedAt: number | null;
  onEnable: () => void;
  /** Reports which masjid ids are currently in the list, so the parent can avoid repeating them. */
  onNearIds?: (ids: string[]) => void;
  count?: number;
}) {
  const { home, work, set } = useMyMasjids();
  const now = useNow(30000);
  const [mosques, setMosques] = useState<Mosque[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const cellKey = mosqueCellKey(lat, lng);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    fetchMosques(lat, lng)
      .then((list) => alive && setMosques(list))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
    // Refetch only when the phone crosses into a new ~5 km cell, or on Retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellKey, attempt]);

  const rows = useMemo(() => {
    if (!mosques) return [];
    return mosques
      .map((m) => ({ m, km: haversineKm(lat, lng, m.lat, m.lng) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, count)
      .map(({ m, km }) => ({
        m,
        km,
        nj: timings ? nextJamat(buildJamatDay(timings, loadPublished(m.id), tz), now) : null,
        slot: home?.id === m.id ? "home" : work?.id === m.id ? "work" : null,
      }));
  }, [mosques, lat, lng, timings, tz, now, count, home, work]);

  const idsKey = rows.map((r) => r.m.id).join("|");
  useEffect(() => {
    onNearIds?.(idsKey ? idsKey.split("|") : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return (
    <section aria-label="Masjids near you now" className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 pb-1 pt-3">
        <span className="label">Near you now</span>
        {live ? (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted">
            <span className="relative flex h-2 w-2">
              <span className="ug-pulse absolute inline-flex h-full w-full rounded-full bg-em-600" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-em-600" />
            </span>
            Live · {ago(updatedAt)}
          </span>
        ) : liveStatus === "denied" ? (
          <span className="text-[11px] font-semibold text-muted">Location blocked · using {lat.toFixed(2)}, {lng.toFixed(2)}</span>
        ) : liveStatus === "unsupported" ? (
          <span className="text-[11px] font-semibold text-muted">No GPS on this device</span>
        ) : (
          <button type="button" onClick={onEnable} className="flex h-8 items-center gap-1.5 rounded-full bg-em-900 px-3 text-[11px] font-bold text-ivory">
            <IconLocate size={14} />
            Follow me
          </button>
        )}
      </div>

      {!mosques && !failed && (
        <div className="flex flex-col gap-2 px-4 pb-4 pt-2">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-em-100" />
              <div className="flex flex-1 flex-col gap-1.5">
                <div className="h-3.5 w-2/3 rounded bg-ivory" />
                <div className="h-3 w-1/2 rounded bg-ivory" />
              </div>
            </div>
          ))}
        </div>
      )}

      {failed && (
        <div className="flex items-center justify-between gap-3 px-4 pb-4 pt-1">
          <p className="m-0 text-[13px] text-muted">The masjid map server is busy right now.</p>
          <button
            type="button"
            onClick={() => {
              setMosques(null);
              setAttempt((a) => a + 1);
            }}
            className="chip-active h-9 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {mosques && rows.length === 0 && <p className="m-0 px-4 pb-4 pt-1 text-[13px] text-muted">No masjid within 15 km on OpenStreetMap. Try the map to search another city.</p>}

      <ul className="m-0 list-none p-0">
        {rows.map(({ m, km, nj, slot }, i) => (
          <li key={m.id} className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-ink/5" : ""}`}>
            <Link href={`/masjid/${encodeURIComponent(m.id)}`} className="flex min-w-0 flex-1 items-center gap-3 text-ink">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${i === 0 ? "bg-gold-500 text-em-900" : "bg-em-100 text-em-900"}`}>
                <IconMasjid size={20} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="flex items-center gap-1.5">
                  {slot && <Tag>{slot}</Tag>}
                  <span className="line-clamp-1 text-[15px] font-bold leading-tight">{m.name}</span>
                </span>
                <span className="text-[12px] text-muted">
                  <span className="font-bold text-ink">{km < 10 ? km.toFixed(1) : Math.round(km)} km</span>
                  {nj ? (
                    <>
                      {" · "}
                      <span className="font-semibold text-gold-700">
                        {nj.prayer} {fmt12(nj.time)}
                      </span>
                      {" · in "}
                      {countdown(nj.msUntil)}
                      {nj.source === "estimated" ? " · est." : ""}
                    </>
                  ) : null}
                </span>
              </span>
            </Link>
            <a
              href={directionsUrl(m)}
              target="_blank"
              rel="noopener"
              aria-label={`Directions to ${m.name}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-em-900 text-ivory"
            >
              <IconNavigate size={18} />
            </a>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t border-ink/5 px-4 py-2.5">
        {!home && rows[0] ? (
          <button type="button" onClick={() => set("home", { id: rows[0].m.id, name: rows[0].m.name, lat: rows[0].m.lat, lng: rows[0].m.lng } as MyMasjid)} className="text-[12px] font-bold text-em-600">
            Set {rows[0].m.name.split(" ").slice(0, 2).join(" ")} as Home
          </button>
        ) : (
          <span className="text-[12px] font-semibold text-muted">Closest first · sorted live</span>
        )}
        <Link href="/masjid" className="flex items-center gap-0.5 text-[12px] font-bold text-em-600">
          All on map
          <IconChevronRight size={14} />
        </Link>
      </div>
    </section>
  );
}
