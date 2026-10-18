"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import LibHeader from "@/components/library/LibHeader";
import { IconCheck, IconCopy } from "@/components/Icons";
import { bumpDuaCount, categoryDone, categoryOf, getDuaCounts, loadDuas, resetDuaCounts, type Dua } from "@/lib/dua";

export default function DuaListPage() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug ?? "";
  const cat = categoryOf(slug);
  const [duas, setDuas] = useState<Dua[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [latin, setLatin] = useState(true);
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!cat) return;
    loadDuas(slug).then(setDuas).catch(() => setDuas([]));
    setCounts(getDuaCounts());
  }, [slug, cat]);

  if (!cat) {
    return (
      <main className="flex flex-col gap-4 px-5 pb-[120px]">
        <LibHeader title="Not found" back="/library/duas" />
        <Link href="/library/duas" className="btn-secondary">
          All categories
        </Link>
      </main>
    );
  }

  const pct = duas ? categoryDone(slug, duas, counts) : 0;
  const isAdhkar = slug.endsWith("-dhikr") || slug === "dhikr-after-salah";

  function tap(d: Dua) {
    setCounts(bumpDuaCount(d.id, d.repeat));
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
  }

  async function copy(d: Dua) {
    try {
      await navigator.clipboard.writeText(`${d.arabic}\n\n${d.translation}\n— ${d.source}`);
      setCopied(d.id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <main className="flex flex-col gap-4 px-5 pb-[120px]">
      <LibHeader
        title={cat.name}
        sub={cat.sub}
        back="/library/duas"
        right={
          <button type="button" onClick={() => setLatin((v) => !v)} aria-pressed={latin} className={`${latin ? "chip-active" : "chip"} h-10`}>
            Abc
          </button>
        }
      />

      {isAdhkar && (
        <div className="card flex items-center gap-3 px-4 py-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-em-100">
            <div className="h-full rounded-full bg-gold-500 transition-[width]" style={{ width: `${Math.round(pct * 100)}%` }} />
          </div>
          <span className="text-[12px] font-bold text-em-900">{Math.round(pct * 100)}%</span>
          <button type="button" onClick={() => setCounts(resetDuaCounts(slug))} className="text-[12px] font-bold text-muted">
            Reset
          </button>
        </div>
      )}

      {!duas && <p className="text-[13px] text-muted">Loading…</p>}

      <ol className="flex flex-col gap-3">
        {duas?.map((d, i) => {
          const n = counts[d.id] ?? 0;
          const done = n >= d.repeat;
          const expanded = open === d.id;
          return (
            <li key={d.id} className={`card flex flex-col gap-3 p-4 ${done ? "border-gold-500/40" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <span className="text-[12px] font-bold text-muted">
                  {i + 1}. {d.title}
                </span>
                {d.repeat > 1 && <span className="gold-pill shrink-0">{d.repeat}×</span>}
              </div>
              <p dir="rtl" lang="ar" className="m-0 text-right font-arabic text-[24px] leading-[1.9] text-em-900">
                {d.arabic}
              </p>
              {latin && d.latin && <p className="m-0 text-[13px] italic leading-[1.5] text-muted">{d.latin}</p>}
              <p className="m-0 text-[14px] leading-[1.5] text-[#3D4744]">{d.translation}</p>

              <div className="flex items-center gap-2">
                {isAdhkar || d.repeat > 1 ? (
                  <button type="button" onClick={() => tap(d)} aria-label={`${d.title}: ${n} of ${d.repeat}. Tap to count`} className={`flex h-11 min-w-[88px] items-center justify-center gap-2 rounded-full px-4 text-[14px] font-bold active:scale-[0.97] ${done ? "bg-gold-500 text-night" : "bg-em-900 text-ivory"}`}>
                    {done ? <IconCheck size={16} /> : null}
                    {done ? "Done" : `${n} / ${d.repeat}`}
                  </button>
                ) : null}
                <button type="button" onClick={() => setOpen(expanded ? null : d.id)} className="chip h-10">
                  {expanded ? "Less" : "Source & benefit"}
                </button>
                <span className="flex-1" />
                <button type="button" onClick={() => copy(d)} aria-label="Copy" className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/10 bg-white text-em-900">
                  <IconCopy size={18} />
                </button>
              </div>
              {copied === d.id && <span className="text-right text-[12px] font-semibold text-em-600">Copied</span>}
              {expanded && (
                <div className="rounded-2xl bg-ivory p-3 text-[12px] leading-[1.6] text-[#3D4744]">
                  {d.notes && <p className="m-0 font-semibold">{d.notes}</p>}
                  {d.benefit && <p className="m-0 mt-1">{d.benefit}</p>}
                  {d.source && <p className="m-0 mt-1 text-muted">Source: {d.source}</p>}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </main>
  );
}
