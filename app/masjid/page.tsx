"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IconBell, IconLocate, IconMasjid, IconNavigate, IconSearch } from "@/components/Icons";
import { geocodeCity, useLiveLocation, type Loc } from "@/lib/location";
import { haversineKm, useDayTimes, useSettings } from "@/lib/aladhan";
import { directionsUrl, facilitiesOf, fetchMosques, mosqueCellKey, type Mosque } from "@/lib/overpass";
import { buildJamatDay, loadPublished, nextJamat, useNow, type NextJamat } from "@/lib/jamat";
import { useMyMasjids } from "@/lib/mymasjids";
import { countdown, fmt12 } from "@/lib/prayer";

const MasjidMap = dynamic(() => import("@/components/MasjidMap"), { ssr: false, loading: () => <div className="absolute inset-0 bg-[#E8E3D7]" /> });

type Sort = "jamat" | "distance";

export default function MasjidFinderPage() {
  const { loc, live, liveStatus, startLive } = useLiveLocation();
  const { settings } = useSettings();
  const now = useNow(30000);
  const my = useMyMasjids();

  // A city search moves the map centre; the phone's own position keeps updating underneath.
  const [searchLoc, setSearchLoc] = useState<Loc | null>(null);
  const center = searchLoc ?? loc;
  const { day } = useDayTimes(center.lat, center.lng, settings);
  const cellKey = mosqueCellKey(center.lat, center.lng);

  const [mosques, setMosques] = useState<Mosque[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("jamat");
  const [onlyWheelchair, setOnlyWheelchair] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    let alive = true;
    setError(null);
    fetchMosques(center.lat, center.lng)
      .then((list) => {
        if (!alive) return;
        setMosques(list);
        setSelected((s) => s ?? list[0]?.id ?? null);
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellKey]);

  const rows = useMemo(() => {
    if (!mosques) return [];
    const withNext = mosques.map((raw) => {
      const m = { ...raw, distanceKm: haversineKm(center.lat, center.lng, raw.lat, raw.lng) };
      const nj: NextJamat | null = day ? nextJamat(buildJamatDay(day.timings, loadPublished(m.id)), now) : null;
      return { m, nj };
    });
    const filtered = onlyWheelchair ? withNext.filter((r) => facilitiesOf(r.m).includes("Wheelchair")) : withNext;
    return filtered.sort((a, b) =>
      sort === "jamat" && a.nj && b.nj ? a.nj.msUntil - b.nj.msUntil || a.m.distanceKm - b.m.distanceKm : a.m.distanceKm - b.m.distanceKm,
    );
  }, [mosques, day, now, sort, onlyWheelchair, center.lat, center.lng]);

  const labels = useMemo(() => {
    const out: Record<string, string> = {};
    for (const r of rows) if (r.nj) out[r.m.id] = `${r.nj.prayer} ${fmt12(r.nj.time)}`;
    return out;
  }, [rows]);

  const onSelect = useCallback((id: string) => {
    setSelected(id);
    setExpanded(true);
  }, []);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const hit = await geocodeCity(q);
    if (hit) {
      setSelected(null);
      setSearchLoc(hit);
    } else setError(`No place found for “${q}”.`);
  }

  function followMe() {
    setSearchLoc(null);
    setSelected(null);
    setQuery("");
    if (!live) startLive();
  }

  const displayMosques = rows.map((r) => r.m);

  return (
    <main className="relative h-dvh overflow-hidden bg-[#E8E3D7]">
      <MasjidMap
        center={{ lat: center.lat, lng: center.lng }}
        user={loc.source === "gps" ? { lat: loc.lat, lng: loc.lng } : null}
        mosques={displayMosques}
        selectedId={selected}
        labels={labels}
        onSelect={onSelect}
      />

      <div className="absolute left-4 right-4 top-14 z-20 flex flex-col gap-2.5">
        <form onSubmit={search} className="glass flex h-[52px] items-center gap-2.5 rounded-full pl-4 pr-[7px] shadow-glass">
          <IconSearch size={20} className="shrink-0 text-em-900" />
          <label htmlFor="city" className="sr-only">
            Search a city
          </label>
          <input
            id="city"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`${center.city} · search any city`}
            className="min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-ink outline-none placeholder:text-muted"
          />
          <button
            type="button"
            onClick={followMe}
            aria-label={searchLoc ? "Back to my location" : live ? "Following your location" : "Use my location"}
            className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full ${live && !searchLoc ? "bg-em-900 text-ivory" : "bg-em-100 text-em-900"}`}
          >
            <IconLocate size={18} className={liveStatus === "watching" && !live ? "animate-pulse" : ""} />
          </button>
        </form>
        <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]">
          <button type="button" aria-pressed={sort === "jamat"} onClick={() => setSort("jamat")} className={sort === "jamat" ? "chip-active" : "chip"}>
            Next Jamat
          </button>
          <button type="button" aria-pressed={sort === "distance"} onClick={() => setSort("distance")} className={sort === "distance" ? "chip-active" : "chip"}>
            Closest
          </button>
          <button type="button" aria-pressed={onlyWheelchair} onClick={() => setOnlyWheelchair((v) => !v)} className={onlyWheelchair ? "chip-active" : "chip"}>
            Wheelchair
          </button>
        </div>
      </div>

      <section
        aria-label="Nearby masjids"
        className={`absolute inset-x-0 bottom-0 z-30 flex flex-col gap-3 rounded-t-[28px] bg-white/90 px-5 pt-2.5 shadow-sheet backdrop-blur-xl transition-[height] duration-300 ${
          expanded ? "h-[58%]" : "h-[172px]"
        }`}
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Collapse list" : "Expand list"}
          className="mx-auto flex h-5 w-16 items-center justify-center"
        >
          <span className="h-[5px] w-10 rounded-full bg-ink/15" />
        </button>
        <div className="flex items-baseline justify-between">
          <h1 className="m-0 font-display text-[22px] font-medium">
            {mosques ? `${rows.length} ${rows.length === 1 ? "masjid" : "masjids"} nearby` : "Finding masjids…"}
          </h1>
          <span className="text-[12px] font-semibold text-muted">{sort === "jamat" ? "By next Jamat" : "By distance"}</span>
        </div>

        <div className="-mx-5 flex-1 overflow-y-auto px-5 pb-[110px]">
          {error && <p className="rounded-2xl bg-gold-100 p-3 text-[13px] font-semibold text-gold-700">{error}</p>}
          {mosques && rows.length === 0 && !error && (
            <p className="rounded-2xl bg-em-100 p-4 text-[13px] text-em-900">
              No masjids within 10 km on OpenStreetMap. Try another city, or add your masjid to OpenStreetMap so it appears for everyone.
            </p>
          )}
          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {!mosques &&
              [0, 1, 2].map((i) => (
                <li key={i} className="card flex items-center gap-3 p-3.5">
                  <div className="h-11 w-11 rounded-[14px] bg-em-100" />
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="h-4 w-2/3 rounded bg-ivory" />
                    <div className="h-3 w-1/2 rounded bg-ivory" />
                  </div>
                </li>
              ))}
            {rows.map(({ m, nj }) => {
              const sel = m.id === selected;
              const fac = facilitiesOf(m);
              return (
                <li key={m.id} className={`card flex flex-col gap-3 p-3.5 ${sel ? "border-[1.5px] border-em-900 shadow-[0_6px_20px_rgba(11,61,51,0.08)]" : ""}`}>
                  <Link href={`/masjid/${m.id}`} onClick={() => setSelected(m.id)} className="flex items-center gap-3 text-ink">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${sel ? "bg-gold-500 text-em-900" : "bg-em-100 text-em-900"}`}>
                      <IconMasjid />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                      <span className="line-clamp-1 text-[15px] font-bold">
                        {my.home?.id === m.id && <span className="mr-1.5 rounded-full bg-em-900 px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wide text-ivory">Home</span>}
                        {my.work?.id === m.id && <span className="mr-1.5 rounded-full bg-em-900 px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wide text-ivory">Work</span>}
                        {m.name}
                      </span>
                      <span className="line-clamp-1 text-[12px] text-muted">
                        {m.distanceKm.toFixed(1)} km{fac.length ? ` · ${fac.join(" · ")}` : ""}
                      </span>
                    </span>
                    {nj && (
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        <span className={sel ? "gold-pill" : "inline-flex items-center rounded-full bg-em-100 px-2.5 py-1 text-[11px] font-bold text-em-900"}>
                          {nj.prayer} {fmt12(nj.time)}
                        </span>
                        <span className="text-[11px] font-semibold text-muted">
                          in {countdown(nj.msUntil)}
                          {nj.source === "estimated" ? " · est." : ""}
                        </span>
                      </span>
                    )}
                  </Link>
                  {sel && (
                    <div className="flex gap-2">
                      <a href={directionsUrl(m)} target="_blank" rel="noopener" className="btn-primary h-11 flex-1 text-[14px]">
                        <IconNavigate size={18} />
                        Directions
                      </a>
                      <Link href={`/masjid/${m.id}?remind=1`} className="btn-secondary h-11 flex-1 text-[14px]">
                        <IconBell size={18} />
                        Remind me
                      </Link>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </main>
  );
}
