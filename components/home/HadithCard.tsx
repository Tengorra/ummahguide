"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchHadithOfDay, type Hadith } from "@/lib/hadith";

/** Compact hadith of the day for the Home screen; the Library has the full text and Arabic. */
export default function HadithCard() {
  const [h, setH] = useState<Hadith | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetchHadithOfDay()
      .then(setH)
      .catch(() => setFailed(true));
  }, []);
  if (failed) return null;
  return (
    <Link href="/library/hadith" className="card flex flex-col gap-1.5 px-4 py-3.5 text-ink">
      <div className="flex items-center justify-between">
        <span className="label">Hadith of the day</span>
        {h && <span className="text-[12px] font-semibold text-em-600">{h.reference.split(" · ")[0]} →</span>}
      </div>
      {h ? <p className="m-0 line-clamp-3 text-[13px] leading-[1.5] text-[#3D4744]">{h.text}</p> : <p className="m-0 text-[13px] text-muted">Loading…</p>}
    </Link>
  );
}
