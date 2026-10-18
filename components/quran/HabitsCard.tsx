"use client";

import Link from "next/link";
import { useState } from "react";
import { IconClose, IconFlame, IconTarget } from "@/components/Icons";
import { GOAL_PRESETS, khatamNextPage, khatamStatus, useQuranHabits, type Goal } from "@/lib/quranHabits";
import { todayKey } from "@/lib/storage";

function ring(pct: number, size = 56, stroke = 5) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(244,241,234,0.12)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#C9A44C" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${c * Math.min(1, pct)} ${c}`} />
    </svg>
  );
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return todayKey(new Date(y, m - 1, d + n));
}

/** Daily goal + streak + khatam plan, on the Quran home. */
export default function HabitsCard() {
  const { goal, khatam, progress, streak, setGoal, setKhatam } = useQuranHabits();
  const [goalOpen, setGoalOpen] = useState(false);
  const [khatamOpen, setKhatamOpen] = useState(false);
  const [custom, setCustom] = useState<Goal>({ type: "verses", target: 10 });
  const [khatamDays, setKhatamDays] = useState(30);

  const pct = progress.target ? progress.value / progress.target : 0;
  const ks = khatam ? khatamStatus(khatam) : null;

  return (
    <>
      <section aria-label="Your Quran habit" className="mt-4 rounded-[22px] border border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setGoalOpen(true)} aria-label="Daily goal" className="relative flex h-14 w-14 shrink-0 items-center justify-center">
            {goal ? ring(pct) : ring(0)}
            <span className="absolute inset-0 flex items-center justify-center">{progress.done ? <IconTarget size={20} className="text-gold-500" /> : <span className="text-[12px] font-black text-ivory">{goal ? `${Math.min(99, Math.round(pct * 100))}%` : "—"}</span>}</span>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold">{goal ? (progress.done ? "Today’s goal done" : `Today: ${progress.label}`) : progress.label}</p>
            <button type="button" onClick={() => setGoalOpen(true)} className="text-[12px] font-semibold text-gold-200">
              {goal ? `Goal · ${GOAL_PRESETS.find((p) => p.type === goal.type && p.target === goal.target)?.label ?? `${goal.target} ${goal.type} a day`} · change` : "Set a daily goal"}
            </button>
          </div>
          <div className="flex shrink-0 flex-col items-center">
            <span className={`flex h-10 w-10 items-center justify-center rounded-full ${streak > 0 ? "bg-gold-500 text-night" : "bg-white/10 text-ivory/50"}`}>
              <IconFlame size={20} />
            </span>
            <span className="mt-1 text-[10px] font-bold text-ivory/60">{streak} day{streak === 1 ? "" : "s"}</span>
          </div>
        </div>

        <div className="mt-3 border-t border-white/10 pt-3">
          {khatam && ks ? (
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold">
                  Khatam · {ks.pagesDone}/604 pages {ks.behind && <span className="text-gold-200">· a little behind</span>}
                </p>
                <p className="text-[12px] text-ivory/60">
                  {ks.perDay} page{ks.perDay === 1 ? "" : "s"} a day · {ks.daysLeft} day{ks.daysLeft === 1 ? "" : "s"} left
                </p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-gold-500" style={{ width: `${Math.round(ks.pct * 100)}%` }} />
                </div>
              </div>
              <Link href={`/quran/page-${khatamNextPage(khatam)}`} className="shrink-0 rounded-full bg-gold-500 px-4 py-2 text-[12px] font-bold text-night">
                Page {khatamNextPage(khatam)}
              </Link>
              <button type="button" onClick={() => setKhatamOpen(true)} aria-label="Khatam settings" className="shrink-0 text-[12px] font-bold text-ivory/50">
                Edit
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setKhatamOpen(true)} className="flex w-full items-center justify-between text-left">
              <span className="flex flex-col">
                <span className="text-[13px] font-bold">Plan a khatam</span>
                <span className="text-[12px] text-ivory/60">Finish the whole Quran by a date — we split it into daily pages</span>
              </span>
              <span className="rounded-full border border-gold-500/40 px-3 py-1.5 text-[12px] font-bold text-gold-200">Start</span>
            </button>
          )}
        </div>
      </section>

      {goalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button type="button" aria-label="Close" onClick={() => setGoalOpen(false)} className="absolute inset-0 bg-black/60" />
          <div role="dialog" aria-modal="true" aria-label="Daily goal" className="relative w-full max-w-[430px] rounded-t-[28px] bg-night-2 px-5 pt-3 text-ivory shadow-sheet" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}>
            <div className="mx-auto h-1 w-10 rounded-full bg-white/20" />
            <div className="mt-3 flex items-center justify-between">
              <h2 className="font-display text-[20px] font-medium">Daily goal</h2>
              <button type="button" onClick={() => setGoalOpen(false)} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
                <IconClose size={18} />
              </button>
            </div>
            <p className="mt-1 text-[12px] text-ivory/60">Verses you scroll past count automatically. Pages follow the 604-page mushaf.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {GOAL_PRESETS.map((p) => {
                const active = goal?.type === p.type && goal?.target === p.target;
                return (
                  <button key={p.label} type="button" aria-pressed={active} onClick={() => {
                      setGoal({ type: p.type, target: p.target });
                      setGoalOpen(false);
                    }} className={`h-12 rounded-2xl text-[13px] font-bold ${active ? "bg-gold-500 text-night" : "bg-white/5 text-ivory"}`}>
                    {p.label}
                  </button>
                );
              })}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (custom.target > 0) {
                  setGoal(custom);
                  setGoalOpen(false);
                }
              }}
              className="mt-3 flex gap-2"
            >
              <input inputMode="numeric" value={custom.target || ""} onChange={(e) => setCustom({ ...custom, target: Number(e.target.value.replace(/\D/g, "")) })} placeholder="Custom" className="h-11 w-24 rounded-xl border border-white/10 bg-white/5 px-3 text-[14px] font-bold text-ivory outline-none" aria-label="Custom target" />
              <select value={custom.type} onChange={(e) => setCustom({ ...custom, type: e.target.value as Goal["type"] })} className="h-11 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-[14px] font-bold text-ivory outline-none" aria-label="Goal type">
                <option value="verses" className="text-ink">
                  verses a day
                </option>
                <option value="pages" className="text-ink">
                  pages a day
                </option>
                <option value="minutes" className="text-ink">
                  minutes a day
                </option>
              </select>
              <button type="submit" className="h-11 rounded-xl bg-gold-500 px-4 text-[13px] font-bold text-night">
                Set
              </button>
            </form>
            {goal && (
              <button type="button" onClick={() => {
                  setGoal(null);
                  setGoalOpen(false);
                }} className="mt-4 text-[13px] font-bold text-ivory/50">
                Remove goal
              </button>
            )}
          </div>
        </div>
      )}

      {khatamOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button type="button" aria-label="Close" onClick={() => setKhatamOpen(false)} className="absolute inset-0 bg-black/60" />
          <div role="dialog" aria-modal="true" aria-label="Khatam plan" className="relative w-full max-w-[430px] rounded-t-[28px] bg-night-2 px-5 pt-3 text-ivory shadow-sheet" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}>
            <div className="mx-auto h-1 w-10 rounded-full bg-white/20" />
            <div className="mt-3 flex items-center justify-between">
              <h2 className="font-display text-[20px] font-medium">Khatam plan</h2>
              <button type="button" onClick={() => setKhatamOpen(false)} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
                <IconClose size={18} />
              </button>
            </div>
            <p className="mt-1 text-[12px] text-ivory/60">Finish all 604 pages in…</p>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[
                [30, "30 days"],
                [60, "2 months"],
                [90, "3 months"],
                [180, "6 months"],
                [365, "1 year"],
                [20, "20 days"],
                [10, "10 days"],
                [7, "1 week"],
              ].map(([d, label]) => (
                <button key={d} type="button" aria-pressed={khatamDays === d} onClick={() => setKhatamDays(Number(d))} className={`h-11 rounded-2xl text-[12px] font-bold ${khatamDays === d ? "bg-gold-500 text-night" : "bg-white/5 text-ivory"}`}>
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[13px] text-ivory/80">
              That’s about <span className="font-bold text-gold-200">{Math.ceil(604 / khatamDays)} pages a day</span>. Pages you read in any surah count toward it.
            </p>
            <button
              type="button"
              onClick={() => {
                const start = todayKey();
                setKhatam({ start, end: addDays(start, khatamDays - 1), createdAt: new Date().toISOString(), pagesDone: khatam?.pagesDone ?? [] });
                setKhatamOpen(false);
              }}
              className="mt-4 flex h-[52px] w-full items-center justify-center rounded-full bg-gold-500 text-[15px] font-bold text-night"
            >
              {khatam ? "Update plan" : "Start khatam"}
            </button>
            {khatam && (
              <button type="button" onClick={() => {
                  setKhatam(null);
                  setKhatamOpen(false);
                }} className="mt-3 w-full text-center text-[13px] font-bold text-ivory/50">
                End this khatam
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
