"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Pattern from "@/components/Pattern";
import ReminderSheet from "@/components/ReminderSheet";
import { IconBack, IconBell, IconBookmark, IconCheck, IconNavigate, IconShare } from "@/components/Icons";
import { useLocation } from "@/lib/location";
import { useDayTimes, useSettings } from "@/lib/aladhan";
import { directionsUrl, facilitiesOf, fetchMosqueById, type Mosque } from "@/lib/overpass";
import { buildJamatDay, nextJamat, useNow, usePublished } from "@/lib/jamat";
import { countdown, fmt12 } from "@/lib/prayer";
import { getReminder } from "@/lib/reminders";
import { readJSON, writeJSON } from "@/lib/storage";

function relative(iso?: string): string {
  if (!iso) return "";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return days <= 0 ? "updated today" : days === 1 ? "updated yesterday" : `updated ${days} days ago`;
}

export default function MasjidProfilePage() {
  return (
    <Suspense fallback={<main className="min-h-dvh" />}>
      <MasjidProfile />
    </Suspense>
  );
}

function MasjidProfile() {
  const params = useParams<{ id: string }>();
  const id = decodeURIComponent(params.id);
  const router = useRouter();
  const search = useSearchParams();
  const { loc } = useLocation(false);
  const { settings } = useSettings();
  const { day } = useDayTimes(loc.lat, loc.lng, settings);
  const now = useNow(30000);
  const published = usePublished(id);

  const [m, setM] = useState<Mosque | null | undefined>(undefined);
  const [sheet, setSheet] = useState(search.get("remind") === "1");
  const [saved, setSaved] = useState(false);
  const [hasReminder, setHasReminder] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    fetchMosqueById(id, loc.lat, loc.lng)
      .then((x) => live && setM(x))
      .catch(() => live && setM(null));
    return () => {
      live = false;
    };
  }, [id, loc.lat, loc.lng]);

  useEffect(() => {
    setSaved(readJSON<string[]>("ug.masjid.saved", []).includes(id));
    setHasReminder(!!getReminder(id));
  }, [id, sheet]);

  function toggleSaved() {
    const list = readJSON<string[]>("ug.masjid.saved", []);
    const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    writeJSON("ug.masjid.saved", next);
    setSaved(next.includes(id));
  }

  async function share() {
    if (!m) return;
    const text = `${m.name} — Jamat times on UmmahGuide`;
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) await navigator.share({ title: m.name, text, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      /* cancelled */
    }
  }

  if (m === null) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="m-0 text-[15px] font-semibold">This masjid isn’t in the current map results.</p>
        <Link href="/masjid" className="btn-secondary h-11">
          Back to the map
        </Link>
      </main>
    );
  }

  const jd = day ? buildJamatDay(day.timings, published) : null;
  const nj = jd ? nextJamat(jd, now) : null;
  const fac = m ? facilitiesOf(m) : [];

  return (
    <main className="relative min-h-dvh pb-[110px]">
      <div className="relative h-[250px] overflow-hidden bg-em-900 text-ivory">
        <Pattern id="masjid-pattern" />
        <svg aria-hidden="true" viewBox="0 0 390 250" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMaxYMax slice">
          <g fill="#0F4A3E">
            <path d="M250 250V170c0-40 30-70 70-70s70 30 70 70v80z" />
            <path d="M225 250v-60h20v60z" />
            <path d="M370 250v-90h18v90z" />
          </g>
          <g fill="#C9A44C">
            <rect x="233" y="172" width="4" height="4" />
            <rect x="377" y="150" width="4" height="4" />
          </g>
        </svg>
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="absolute left-4 top-[52px] flex h-11 w-11 items-center justify-center rounded-full border border-ivory/20 bg-ivory/15 text-ivory backdrop-blur-md"
        >
          <IconBack />
        </button>
        <div className="absolute right-4 top-[52px] flex gap-2">
          <button
            type="button"
            onClick={toggleSaved}
            aria-label={saved ? "Remove from saved masjids" : "Save masjid"}
            aria-pressed={saved}
            className={`flex h-11 w-11 items-center justify-center rounded-full border border-ivory/20 backdrop-blur-md ${saved ? "bg-gold-500 text-em-900" : "bg-ivory/15 text-ivory"}`}
          >
            <IconBookmark size={20} fill={saved ? "currentColor" : "none"} />
          </button>
          <button type="button" onClick={share} aria-label="Share masjid" className="flex h-11 w-11 items-center justify-center rounded-full border border-ivory/20 bg-ivory/15 text-ivory backdrop-blur-md">
            <IconShare size={20} />
          </button>
        </div>
        <div className="absolute inset-x-5 bottom-[54px] flex flex-col gap-2">
          {jd?.verified ? (
            <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-gold-500 px-2.5 py-1 text-[11px] font-bold text-em-900">
              <IconCheck size={12} />
              Verified · {relative(jd.updatedAt)}
            </span>
          ) : (
            <span className="inline-flex items-center self-start rounded-full bg-ivory/15 px-2.5 py-1 text-[11px] font-bold text-ivory">Estimated times · not yet published</span>
          )}
          <h1 className="m-0 font-display text-[30px] font-medium leading-[1.05] tracking-[-0.01em]">{m ? m.name : " "}</h1>
          <span className="text-[13px] font-semibold text-ivory/80">{m ? `${m.distanceKm.toFixed(1)} km · ${loc.city}` : " "}</span>
        </div>
      </div>

      <div className="relative mx-5 -mt-9 flex items-center justify-between gap-3 rounded-card border border-ink/5 bg-white p-4 shadow-[0_12px_32px_rgba(11,61,51,0.14)]">
        <div className="flex flex-col gap-1">
          <span className="label">Next Jamat</span>
          <span className="font-display text-[24px] font-medium leading-none">{nj ? `${nj.prayer} · ${fmt12(nj.time)}` : "…"}</span>
        </div>
        {nj && <span className="whitespace-nowrap rounded-full bg-gold-100 px-3 py-2 text-[13px] font-bold text-gold-700">in {countdown(nj.msUntil)}</span>}
      </div>

      <div className="flex flex-col gap-3.5 px-5 pt-4">
        <section aria-label="Today’s Jamat times" className="card px-4 pb-1.5 pt-2">
          <div className="grid h-[34px] grid-cols-[minmax(0,1fr)_64px_84px] items-center border-b border-ink/5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">
            <span>Today</span>
            <span className="text-right">Adhan</span>
            <span className="text-right">Jamat</span>
          </div>
          {jd?.rows.map((r, i) => {
            const isNext = nj && !nj.isTomorrow && nj.prayer === r.prayer;
            return (
              <div
                key={r.prayer}
                className={`grid items-center ${
                  isNext
                    ? "-mx-2 h-12 grid-cols-[minmax(0,1fr)_64px_84px] rounded-xl bg-gold-100 px-2 text-gold-700"
                    : `h-11 grid-cols-[minmax(0,1fr)_64px_84px] ${i < jd.rows.length - 1 ? "border-b border-ink/5" : ""} ${
                        nj && nj.isTomorrow === false && jd.rows.findIndex((x) => x.prayer === nj.prayer) > i ? "text-[#8C9490]" : ""
                      }`
                }`}
              >
                <span className={`flex items-center gap-2 text-[15px] ${isNext ? "font-bold" : "font-semibold"}`}>
                  {isNext && <span className="inline-block h-2 w-2 rounded-full bg-gold-500" />}
                  {r.prayer}
                </span>
                <span className={`text-right text-[14px] ${isNext ? "" : "text-muted"}`}>{fmt12(r.adhan, false)}</span>
                <span className="text-right text-[15px] font-bold">
                  {fmt12(r.jamat)}
                  {r.source === "estimated" && <span className="ml-1 text-[10px] font-semibold text-muted">est.</span>}
                </span>
              </div>
            );
          })}
          {!jd && <div className="py-3 text-[13px] text-muted">Loading today’s times…</div>}
          {jd && (
            <div className="grid h-11 grid-cols-[minmax(0,1fr)_148px] items-center border-t border-ink/5">
              <span className="flex flex-col text-[15px] font-semibold">
                Jumu’ah
                <span className="text-[11px] font-semibold text-muted">{jd.jumuah.length > 1 ? `${jd.jumuah.length} khutbahs` : jd.jumuah.length === 1 ? "One khutbah" : "Not published yet"}</span>
              </span>
              <span className="text-right text-[15px] font-bold text-em-600">{jd.jumuah.length ? jd.jumuah.map((t) => fmt12(t, false)).join(" · ") + " PM" : "—"}</span>
            </div>
          )}
        </section>

        {fac.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {fac.map((f) => (
              <span key={f} className="inline-flex h-8 items-center rounded-full bg-em-100 px-3 text-[12px] font-bold text-em-900">
                {f}
              </span>
            ))}
          </div>
        )}

        {m?.tags.website && (
          <a href={m.tags.website.startsWith("http") ? m.tags.website : `https://${m.tags.website}`} target="_blank" rel="noopener" className="text-[13px] font-bold text-em-600">
            {m.tags.website.replace(/^https?:\/\//, "")}
          </a>
        )}

        <div className="flex items-center justify-between px-1">
          <span className="text-[12px] font-semibold text-muted">{jd?.verified ? "Published by the masjid" : "Adhan + typical offsets until the masjid publishes"}</span>
          <Link href={`/masjid/${encodeURIComponent(id)}/admin`} className="text-[12px] font-bold text-em-600">
            {jd?.verified ? "Update times" : "Publish times"}
          </Link>
        </div>
        {copied && <p className="m-0 text-center text-[12px] font-semibold text-em-600">Link copied</p>}
      </div>

      <div className="fixed bottom-[18px] left-1/2 z-40 flex h-[68px] w-[calc(100%-32px)] max-w-[398px] -translate-x-1/2 items-center gap-2 rounded-full px-2 glass shadow-glass" style={{ marginBottom: "env(safe-area-inset-bottom)" }}>
        <a href={m ? directionsUrl(m) : "#"} target="_blank" rel="noopener" className="btn-primary flex-1">
          <IconNavigate size={18} />
          Directions
        </a>
        <button type="button" onClick={() => setSheet(true)} className="btn-secondary flex-1">
          <IconBell size={18} />
          {hasReminder ? "Reminders on" : "Remind me"}
        </button>
      </div>

      {sheet && m && <ReminderSheet masjidId={id} masjidName={m.name} onClose={() => setSheet(false)} />}
    </main>
  );
}
