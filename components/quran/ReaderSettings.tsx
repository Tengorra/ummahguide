"use client";

import { useEffect, useMemo, useState } from "react";
import Switch from "@/components/Switch";
import { IconCheck, IconClose } from "@/components/Icons";
import {
  ARABIC_SIZES,
  FEATURED_LANGUAGES,
  TAJWEED_COLORS,
  TAJWEED_LEGEND,
  fetchRecitations,
  fetchTranslationList,
  type ReaderPrefs,
  type ReaderTheme,
  type Recitation,
  type TranslationResource,
} from "@/lib/quran";

type Tab = "display" | "translation" | "reciter";

export default function ReaderSettings({
  prefs,
  onPrefs,
  arabicSize,
  onArabicSize,
  translationId,
  onTranslation,
  reciterId,
  onReciter,
  initialTab = "display",
  onClose,
}: {
  prefs: ReaderPrefs;
  onPrefs: (patch: Partial<ReaderPrefs>) => void;
  arabicSize: number;
  onArabicSize: (px: number) => void;
  translationId: number;
  onTranslation: (id: number) => void;
  reciterId: number;
  onReciter: (id: number) => void;
  initialTab?: Tab;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [recitations, setRecitations] = useState<Recitation[] | null>(null);
  const [translations, setTranslations] = useState<TranslationResource[] | null>(null);
  const [lang, setLang] = useState<string>("english");
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (tab === "reciter" && !recitations) fetchRecitations().then(setRecitations).catch((e: Error) => setLoadError(e.message));
    if (tab === "translation" && !translations)
      fetchTranslationList()
        .then((list) => {
          setTranslations(list);
          const cur = list.find((t) => t.id === translationId);
          if (cur) setLang(cur.language);
        })
        .catch((e: Error) => setLoadError(e.message));
  }, [tab, recitations, translations, translationId]);

  const languages = useMemo(() => {
    if (!translations) return [];
    const set = Array.from(new Set(translations.map((t) => t.language)));
    return set.sort((a, b) => {
      const ia = FEATURED_LANGUAGES.indexOf(a);
      const ib = FEATURED_LANGUAGES.indexOf(b);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      return a.localeCompare(b);
    });
  }, [translations]);

  const row = "flex min-h-12 w-full items-center justify-between gap-3 rounded-[14px] px-4 py-2 text-left text-[14px] font-semibold";
  const rowStyle = (active: boolean) => (active ? { background: "var(--qr-accent)", color: "var(--qr-accent-fg)" } : { background: "var(--qr-bg2)", color: "var(--qr-fg)" });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button type="button" aria-label="Close settings" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div role="dialog" aria-modal="true" aria-label="Reading settings" className="relative flex max-h-[88dvh] w-full max-w-[430px] flex-col rounded-t-[28px] px-5 pt-3 shadow-sheet" style={{ background: "var(--qr-bg)", color: "var(--qr-fg)", paddingBottom: "calc(20px + env(safe-area-inset-bottom))" }}>
        <div className="mx-auto h-1 w-10 rounded-full" style={{ background: "var(--qr-line)" }} />
        <div className="mt-3 flex items-center justify-between">
          <h2 className="font-display text-[20px] font-medium">Reading settings</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: "var(--qr-bg2)" }}>
            <IconClose size={18} />
          </button>
        </div>

        <div role="tablist" className="mt-3 grid grid-cols-3 gap-1 rounded-2xl p-1" style={{ background: "var(--qr-bg2)" }}>
          {(["display", "translation", "reciter"] as Tab[]).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} type="button" onClick={() => setTab(t)} className="h-10 rounded-xl text-[13px] font-bold capitalize" style={tab === t ? { background: "var(--qr-accent)", color: "var(--qr-accent-fg)" } : { color: "var(--qr-muted)" }}>
              {t}
            </button>
          ))}
        </div>

        <div className="mt-4 flex-1 overflow-y-auto pb-2">
          {tab === "display" && (
            <div className="flex flex-col gap-5">
              <div>
                <p className="label" style={{ color: "var(--qr-muted)" }}>
                  Mode
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1 rounded-2xl p-1" style={{ background: "var(--qr-bg2)" }}>
                  {(
                    [
                      ["translation", "Translation"],
                      ["reading", "Reading (mushaf)"],
                    ] as const
                  ).map(([v, label]) => (
                    <button key={v} type="button" aria-pressed={prefs.mode === v} onClick={() => onPrefs({ mode: v })} className="h-10 rounded-xl text-[13px] font-bold" style={prefs.mode === v ? { background: "var(--qr-accent)", color: "var(--qr-accent-fg)" } : { color: "var(--qr-muted)" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="label" style={{ color: "var(--qr-muted)" }}>
                  Theme
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(
                    [
                      ["night", "Night", "#0C1A17", "#F4F1EA"],
                      ["sepia", "Sepia", "#F3EADA", "#2B2419"],
                      ["light", "Light", "#FFFFFF", "#141A18"],
                    ] as [ReaderTheme, string, string, string][]
                  ).map(([v, label, bg, fg]) => (
                    <button key={v} type="button" aria-pressed={prefs.theme === v} onClick={() => onPrefs({ theme: v })} className="flex h-14 items-center justify-center rounded-2xl border-2 text-[13px] font-bold" style={{ background: bg, color: fg, borderColor: prefs.theme === v ? "var(--qr-accent)" : "var(--qr-line)" }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="label" style={{ color: "var(--qr-muted)" }}>
                    Arabic size
                  </p>
                  <span className="text-[12px] font-bold" style={{ color: "var(--qr-muted)" }}>
                    {arabicSize}px
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-5 gap-1 rounded-2xl p-1" style={{ background: "var(--qr-bg2)" }}>
                  {ARABIC_SIZES.map((s) => (
                    <button key={s} type="button" aria-pressed={arabicSize === s} onClick={() => onArabicSize(s)} className="flex h-11 items-center justify-center rounded-xl font-arabic" style={{ fontSize: 14 + (s - 22) * 0.5, ...(arabicSize === s ? { background: "var(--qr-accent)", color: "var(--qr-accent-fg)" } : { color: "var(--qr-fg)" }) }}>
                      ع
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="label" style={{ color: "var(--qr-muted)" }}>
                    Translation size
                  </p>
                  <span className="text-[12px] font-bold" style={{ color: "var(--qr-muted)" }}>
                    {prefs.translationSize}px
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1 rounded-2xl p-1" style={{ background: "var(--qr-bg2)" }}>
                  {[13, 14, 16, 18].map((s) => (
                    <button key={s} type="button" aria-pressed={prefs.translationSize === s} onClick={() => onPrefs({ translationSize: s })} className="h-10 rounded-xl font-bold" style={{ fontSize: s, ...(prefs.translationSize === s ? { background: "var(--qr-accent)", color: "var(--qr-accent-fg)" } : { color: "var(--qr-fg)" }) }}>
                      Aa
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {(
                  [
                    ["wordByWord", "Word by word", "Meaning under every Arabic word (translation mode)"],
                    ["transliteration", "Transliteration", "Latin spelling under each word — needs word by word"],
                    ["tajweed", "Tajweed colours", "Colour the letters by their tajweed rule"],
                  ] as const
                ).map(([k, label, sub]) => (
                  <div key={k} className="flex items-center gap-3 rounded-2xl px-3.5 py-3" style={{ background: "var(--qr-bg2)" }}>
                    <div className="flex flex-1 flex-col">
                      <span className="text-[14px] font-bold">{label}</span>
                      <span className="text-[12px]" style={{ color: "var(--qr-muted)" }}>
                        {sub}
                      </span>
                    </div>
                    <Switch dark={prefs.theme === "night"} checked={prefs[k]} onChange={(v) => onPrefs(k === "transliteration" && v ? { transliteration: true, wordByWord: true } : { [k]: v })} label={label} />
                  </div>
                ))}
              </div>

              {prefs.tajweed && (
                <div className="rounded-2xl p-3" style={{ background: "var(--qr-bg2)" }}>
                  <p className="label" style={{ color: "var(--qr-muted)" }}>
                    Tajweed legend
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {TAJWEED_LEGEND.map((l) => (
                      <span key={l.cls} className="flex items-center gap-2 text-[12px] font-semibold">
                        <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: TAJWEED_COLORS[l.cls] }} />
                        {l.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "translation" && (
            <div className="flex flex-col gap-3">
              {!translations && !loadError && (
                <p className="text-[13px]" style={{ color: "var(--qr-muted)" }}>
                  Loading translations…
                </p>
              )}
              {loadError && (
                <p className="text-[13px]" style={{ color: "var(--qr-muted)" }}>
                  {loadError}
                </p>
              )}
              {translations && (
                <>
                  <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
                    {languages.map((l) => (
                      <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} className="shrink-0 rounded-full px-3.5 py-2 text-[12px] font-bold capitalize" style={lang === l ? { background: "var(--qr-accent)", color: "var(--qr-accent-fg)" } : { background: "var(--qr-bg2)", color: "var(--qr-fg)" }}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1.5">
                    {translations
                      .filter((t) => t.language === lang)
                      .map((t) => {
                        const active = t.id === translationId;
                        return (
                          <button key={t.id} type="button" onClick={() => onTranslation(t.id)} aria-pressed={active} className={row} style={rowStyle(active)}>
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate">{t.name}</span>
                              {t.author && t.author !== t.name && (
                                <span className="truncate text-[11px] font-semibold opacity-70">{t.author}</span>
                              )}
                            </span>
                            {active && <IconCheck size={18} className="shrink-0" />}
                          </button>
                        );
                      })}
                  </div>
                </>
              )}
            </div>
          )}

          {tab === "reciter" && (
            <div className="space-y-1.5">
              {!recitations && !loadError && (
                <p className="text-[13px]" style={{ color: "var(--qr-muted)" }}>
                  Loading reciters…
                </p>
              )}
              {loadError && (
                <p className="text-[13px]" style={{ color: "var(--qr-muted)" }}>
                  {loadError}
                </p>
              )}
              {recitations?.map((r) => {
                const active = r.id === reciterId;
                return (
                  <button key={r.id} type="button" onClick={() => onReciter(r.id)} aria-pressed={active} className={row} style={rowStyle(active)}>
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate">{r.name}</span>
                      {r.style && <span className="text-[11px] font-semibold opacity-70">{r.style}</span>}
                    </span>
                    {active && <IconCheck size={18} className="shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
