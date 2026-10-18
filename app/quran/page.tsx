"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { IconBookmark, IconChevronRight, IconClose, IconSearch } from "@/components/Icons";
import { fetchChapters, fetchJuzs, getBookmarks, getLastRead, revelationLabel, type Bookmark, type Chapter, type Juz, type LastRead } from "@/lib/quran";

type Tab = "surah" | "juz" | "page" | "saved";

export default function QuranHomePage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("surah");
  const [chapters, setChapters] = useState<Chapter[] | null>(null);
  const [juzs, setJuzs] = useState<Juz[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [last, setLast] = useState<LastRead | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [pageInput, setPageInput] = useState("");

  useEffect(() => {
    setLast(getLastRead());
    setBookmarks(getBookmarks());
  }, []);

  useEffect(() => {
    let live = true;
    setError(null);
    fetchChapters()
      .then((c) => live && setChapters(c))
      .catch((e: Error) => live && setError(e.message || "Could not load the surah list"));
    return () => {
      live = false;
    };
  }, [attempt]);

  useEffect(() => {
    if (tab !== "juz" || juzs) return;
    fetchJuzs()
      .then(setJuzs)
      .catch(() => setJuzs([]));
  }, [tab, juzs]);

  const filtered = useMemo(() => {
    if (!chapters) return [];
    const q = query.trim().toLowerCase();
    if (!q) return chapters;
    const n = Number(q);
    return chapters.filter(
      (c) =>
        (Number.isInteger(n) && n > 0 && c.id === n) ||
        c.name_simple.toLowerCase().includes(q) ||
        c.name_simple.toLowerCase().replace(/[-'’ ]/g, "").includes(q.replace(/[-'’ ]/g, "")) ||
        c.translated_name.name.toLowerCase().includes(q) ||
        c.name_arabic.includes(query.trim()),
    );
  }, [chapters, query]);

  const lastChapter = last && chapters ? chapters.find((c) => c.id === last.chapter) : undefined;
  const nameOf = (id: number) => chapters?.find((c) => c.id === id)?.name_simple ?? `Surah ${id}`;

  function goToPage(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(pageInput);
    if (Number.isInteger(n) && n >= 1 && n <= 604) router.push(`/quran/page-${n}`);
  }

  return (
    <main className="min-h-dvh bg-night px-4 pb-[120px] text-ivory" style={{ paddingTop: "max(20px, env(safe-area-inset-top))" }}>
      <header className="pt-2">
        <h1 className="font-display text-[30px] font-medium leading-tight">Quran</h1>
        <p className="mt-1 text-[13px] text-ivory/55">114 surahs · 30 juz · 604 pages · recitation, translation, tafsir</p>
      </header>

      {last && (
        <Link href={`/quran/${last.chapter}?verse=${last.verse}`} className="mt-4 flex items-center gap-3 rounded-[22px] border border-gold-500/[0.28] bg-gold-500/[0.08] p-4 active:bg-gold-500/15">
          <div className="min-w-0 flex-1">
            <p className="label !text-gold-500">Continue reading</p>
            <p className="mt-1 truncate text-[17px] font-bold text-ivory">{lastChapter?.name_simple ?? last.name}</p>
            <p className="text-[12px] text-ivory/60">
              Verse {last.verse}
              {lastChapter ? ` of ${lastChapter.verses_count}` : ""}
              {lastChapter ? ` · ${lastChapter.translated_name.name}` : ""}
            </p>
          </div>
          {lastChapter && (
            <span className="font-arabic text-[22px] leading-none text-gold-200" dir="rtl" lang="ar">
              {lastChapter.name_arabic}
            </span>
          )}
          <span className="text-gold-500">
            <IconChevronRight size={20} />
          </span>
        </Link>
      )}

      <div role="tablist" aria-label="Browse by" className="mt-4 grid grid-cols-4 gap-1 rounded-2xl bg-white/10 p-1">
        {(
          [
            ["surah", "Surah"],
            ["juz", "Juz"],
            ["page", "Page"],
            ["saved", "Saved"],
          ] as [Tab, string][]
        ).map(([t, label]) => (
          <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => setTab(t)} className={`h-10 rounded-xl text-[13px] font-bold ${tab === t ? "bg-gold-500 text-night" : "text-ivory/70"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "surah" && (
        <>
          <label className="relative mt-4 block">
            <span className="sr-only">Search surahs by name or number</span>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ivory/50">
              <IconSearch size={19} />
            </span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search surah name or number" enterKeyHint="search" autoComplete="off" className="h-12 w-full rounded-full border border-white/10 bg-white/5 pl-11 pr-11 text-[15px] text-ivory placeholder:text-ivory/40 focus:border-gold-500/50 focus:outline-none [&::-webkit-search-cancel-button]:hidden" />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ivory/60 active:bg-white/10">
                <IconClose size={18} />
              </button>
            )}
          </label>

          <section className="mt-4" aria-label="All surahs">
            {error && !chapters && (
              <div className="rounded-[22px] border border-white/10 bg-white/5 p-4 text-center">
                <p className="text-[14px] text-ivory/80">{error}. Check your connection and try again.</p>
                <button type="button" onClick={() => setAttempt((a) => a + 1)} className="mt-3 inline-flex h-10 items-center rounded-full bg-gold-500 px-5 text-[13px] font-bold text-night">
                  Retry
                </button>
              </div>
            )}
            {!chapters && !error && (
              <ul className="space-y-2" aria-busy="true" aria-label="Loading surahs">
                {Array.from({ length: 10 }, (_, i) => (
                  <li key={i} className="flex items-center gap-3 rounded-[18px] px-2 py-2.5">
                    <div className="h-10 w-10 shrink-0 animate-pulse rounded-[12px] bg-white/5" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-2/5 animate-pulse rounded bg-white/5" />
                      <div className="h-3 w-3/5 animate-pulse rounded bg-white/5" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {chapters && filtered.length === 0 && <p className="px-2 py-8 text-center text-[14px] text-ivory/55">No surah matches &ldquo;{query}&rdquo;.</p>}
            {chapters && filtered.length > 0 && (
              <ul className="divide-y divide-white/[0.06]">
                {filtered.map((c) => (
                  <li key={c.id}>
                    <Link href={`/quran/${c.id}`} className="flex items-center gap-3 rounded-[18px] px-2 py-3 active:bg-white/5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/5 text-[13px] font-bold tabular-nums text-ivory/80">{c.id}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-bold text-ivory">{c.name_simple}</span>
                        <span className="block truncate text-[12px] text-ivory/55">
                          {c.translated_name.name} · {revelationLabel(c.revelation_place)} · {c.verses_count} verses
                        </span>
                      </span>
                      <span className="font-arabic shrink-0 text-[20px] leading-none text-gold-200" dir="rtl" lang="ar">
                        {c.name_arabic}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {tab === "juz" && (
        <section className="mt-4" aria-label="Juz">
          {!juzs && <p className="px-2 py-6 text-center text-[14px] text-ivory/55">Loading…</p>}
          {juzs && juzs.length === 0 && <p className="px-2 py-6 text-center text-[14px] text-ivory/55">Couldn’t load the juz list. Check your connection.</p>}
          {juzs && juzs.length > 0 && (
            <ul className="divide-y divide-white/[0.06]">
              {juzs.map((j) => {
                const first = j.chapters[0];
                const lastC = j.chapters[j.chapters.length - 1];
                return (
                  <li key={j.juz_number}>
                    <Link href={`/quran/juz-${j.juz_number}`} className="flex items-center gap-3 rounded-[18px] px-2 py-3 active:bg-white/5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/5 text-[13px] font-bold tabular-nums text-ivory/80">{j.juz_number}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-bold text-ivory">Juz {j.juz_number}</span>
                        <span className="block truncate text-[12px] text-ivory/55">
                          {first ? `${nameOf(first.id)} ${first.from}` : ""}
                          {lastC ? ` – ${nameOf(lastC.id)} ${lastC.to}` : ""}
                        </span>
                      </span>
                      <IconChevronRight className="text-ivory/40" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {tab === "page" && (
        <section className="mt-4 flex flex-col gap-4" aria-label="Go to page">
          <form onSubmit={goToPage} className="flex gap-2">
            <label htmlFor="page" className="sr-only">
              Page number
            </label>
            <input id="page" inputMode="numeric" value={pageInput} onChange={(e) => setPageInput(e.target.value.replace(/\D/g, ""))} placeholder="Page 1 – 604" className="h-12 min-w-0 flex-1 rounded-full border border-white/10 bg-white/5 px-5 text-[15px] text-ivory placeholder:text-ivory/40 focus:border-gold-500/50 focus:outline-none" />
            <button type="submit" className="h-12 rounded-full bg-gold-500 px-5 text-[14px] font-bold text-night">
              Open
            </button>
          </form>
          <p className="text-[12px] text-ivory/50">Pages follow the standard 604-page Madani mushaf, so you can continue from a printed copy.</p>
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => (
              <Link key={j} href={`/quran/juz-${j}`} className="flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-[13px] font-bold text-ivory/85">
                Juz {j}
              </Link>
            ))}
          </div>
        </section>
      )}

      {tab === "saved" && (
        <section className="mt-4" aria-label="Bookmarks">
          {bookmarks.length === 0 && (
            <div className="rounded-[22px] border border-white/10 bg-white/5 p-5 text-center">
              <IconBookmark size={26} className="mx-auto text-gold-500" />
              <p className="mt-2 text-[14px] text-ivory/80">No bookmarks yet</p>
              <p className="mt-1 text-[12px] text-ivory/50">Tap a verse while reading, then the bookmark icon.</p>
            </div>
          )}
          <ul className="space-y-2">
            {bookmarks.map((b) => (
              <li key={b.verse_key}>
                <Link href={`/quran/${b.chapter}?verse=${b.verse}`} className="block rounded-[22px] border border-white/10 bg-white/5 p-4 active:bg-white/10">
                  <p className="font-arabic line-clamp-2 text-right text-[20px] leading-[1.8] text-ivory" dir="rtl" lang="ar">
                    {b.text_uthmani}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[13px] text-ivory/65">{b.translation}</p>
                  <p className="mt-2 text-[11px] font-bold text-gold-500">
                    {b.name} · {b.verse_key}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
