"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cached, todayKey } from "@/lib/storage";

/** A curated rotation of short, uplifting verses — one per day, same for everyone. */
const KEYS = ["94:5", "2:286", "13:28", "65:3", "3:139", "39:53", "2:152", "21:87", "94:6", "2:45", "29:69", "16:128", "25:63", "93:5"];

type Verse = { key: string; arabic: string; translation: string; surah: string };

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

async function loadVerse(): Promise<Verse> {
  const dayIndex = Math.floor(Date.now() / 86400000) % KEYS.length;
  const key = KEYS[dayIndex];
  return cached(`ug.votd2.${todayKey()}`, 24 * 3600_000, async () => {
    const [vr, cr] = await Promise.all([
      fetch(`https://api.quran.com/api/v4/verses/by_key/${key}?language=en&translations=20&fields=text_uthmani`),
      fetch(`https://api.quran.com/api/v4/chapters/${key.split(":")[0]}?language=en`),
    ]);
    const v = await vr.json();
    const c = await cr.json();
    return {
      key,
      arabic: v.verse.text_uthmani as string,
      translation: stripHtml(v.verse.translations?.[0]?.text ?? ""),
      surah: c.chapter?.name_simple ?? "",
    };
  });
}

export default function VerseOfDay() {
  const [verse, setVerse] = useState<Verse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadVerse()
      .then(setVerse)
      .catch(() => setFailed(true));
  }, []);

  return (
    <section aria-label="Verse of the day" className="card flex flex-col gap-1.5 px-4 py-3.5">
      <div className="flex items-center justify-between">
        <span className="label">Verse of the day</span>
        {verse && (
          <Link href={`/quran/${verse.key.split(":")[0]}?verse=${verse.key.split(":")[1]}`} className="text-[12px] font-semibold text-em-600">
            {verse.surah} {verse.key} →
          </Link>
        )}
      </div>
      {verse ? (
        <>
          <p dir="rtl" lang="ar" className="m-0 line-clamp-2 text-right font-arabic text-[24px] leading-[1.6] text-em-900">
            {verse.arabic}
          </p>
          <p className="m-0 line-clamp-2 text-[13px] leading-[1.45] text-[#3D4744]">{verse.translation}</p>
        </>
      ) : failed ? (
        <p className="m-0 text-[13px] text-muted">Couldn’t load today’s verse. Check your connection and try again.</p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="h-8 w-3/4 self-end rounded-lg bg-em-100" />
          <div className="h-4 w-full rounded-lg bg-ivory" />
        </div>
      )}
    </section>
  );
}
