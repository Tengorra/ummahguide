"use client";

import { useState } from "react";
import Pattern from "@/components/Pattern";
import LibHeader from "@/components/library/LibHeader";
import Switch from "@/components/Switch";
import { IconCheck, IconClose, IconRefresh, IconSliders } from "@/components/Icons";
import { PRESETS, useTasbih } from "@/lib/tasbih";

export default function TasbihPage() {
  const { state, preset, target, tap, reset, choose, setGoal, toggleVibrate } = useTasbih();
  const [sheet, setSheet] = useState(false);

  const total = preset.sequence ? preset.sequence.reduce((a, s) => a + s.target, 0) : preset.target;
  const doneInSeq = preset.sequence ? preset.sequence.slice(0, state.step).reduce((a, s) => a + s.target, 0) + state.count : state.count;
  const pct = total > 0 ? Math.min(1, doneInSeq / total) : 0;
  const r = 120;
  const circ = 2 * Math.PI * r;
  const goalPct = state.dailyGoal > 0 ? Math.min(1, state.todayTotal / state.dailyGoal) : 0;

  return (
    <main className="relative flex min-h-dvh flex-col bg-em-900 px-5 pb-[120px] text-ivory">
      <Pattern id="tasbih-pattern" opacity={0.08} size={64} />
      <div className="relative flex flex-1 flex-col gap-4">
        <LibHeader
          title="Tasbih"
          sub={`${preset.label}${preset.sequence ? ` · ${target.label}` : ""}`}
          dark
          right={
            <button type="button" onClick={() => setSheet(true)} aria-label="Tasbih settings" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-ivory">
              <IconSliders size={20} />
            </button>
          }
        />

        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-[12px] font-semibold">
          <span>
            Today <span className="font-bold text-gold-200">{state.todayTotal}</span>
            {state.dailyGoal > 0 && <span className="text-ivory/55"> / {state.dailyGoal}</span>}
          </span>
          <span className="text-ivory/55">Lifetime {state.lifetime.toLocaleString()}</span>
        </div>
        {state.dailyGoal > 0 && (
          <div className="-mt-2 h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gold-500" style={{ width: `${Math.round(goalPct * 100)}%` }} />
          </div>
        )}

        <button type="button" onClick={tap} aria-label={target.done ? `${target.label} complete. Tap to continue counting` : `${target.label} ${state.count} of ${target.target}. Tap to count`} className="relative mx-auto my-2 flex h-[300px] w-[300px] items-center justify-center rounded-full active:scale-[0.98]">
          <svg width="300" height="300" viewBox="0 0 300 300" className="absolute inset-0 -rotate-90" aria-hidden="true">
            <circle cx="150" cy="150" r={r} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" strokeWidth="14" />
            <circle cx="150" cy="150" r={r} fill="none" stroke="#C9A44C" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${circ * pct} ${circ}`} className="transition-[stroke-dasharray] duration-150" />
          </svg>
          <span className="relative flex flex-col items-center">
            {target.arabic && (
              <span className="mb-1 max-w-[220px] text-center font-arabic text-[22px] leading-[1.5] text-gold-200" lang="ar" dir="rtl">
                {target.arabic}
              </span>
            )}
            <span className="font-display text-[72px] font-medium leading-none tabular-nums">{target.done && !preset.sequence ? <IconCheck size={56} className="text-gold-500" /> : state.count}</span>
            <span className="mt-1 text-[12px] font-bold uppercase tracking-[0.1em] text-ivory/60">{target.target > 0 ? `of ${target.target}` : "tap to count"}</span>
          </span>
        </button>

        {preset.sequence && (
          <div className="grid grid-cols-3 gap-2">
            {preset.sequence.map((s, i) => (
              <div key={s.label} className={`flex flex-col items-center rounded-2xl border px-2 py-2 text-center ${i === state.step ? "border-gold-500/60 bg-gold-500/15" : i < state.step ? "border-white/10 bg-white/10 text-ivory/70" : "border-white/10 bg-white/5 text-ivory/50"}`}>
                <span className="text-[11px] font-bold">{s.label}</span>
                <span className="text-[11px] tabular-nums">{i < state.step ? `${s.target}/${s.target}` : i === state.step ? `${state.count}/${s.target}` : `0/${s.target}`}</span>
              </div>
            ))}
          </div>
        )}
        {preset.sequence && target.done && <p className="m-0 text-center text-[13px] font-semibold text-gold-200">Set complete — tap to start again or choose another dhikr.</p>}

        <div className="flex items-center justify-center gap-3">
          <button type="button" onClick={reset} className="inline-flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 text-[13px] font-bold">
            <IconRefresh size={16} /> Reset count
          </button>
        </div>

        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" aria-pressed={p.id === preset.id} onClick={() => choose(p.id)} className={`h-10 shrink-0 rounded-full px-4 text-[12px] font-bold ${p.id === preset.id ? "bg-gold-500 text-night" : "border border-white/15 bg-white/10 text-ivory"}`}>
              {p.label}
              {p.target > 0 && !p.sequence ? ` · ${p.target}` : ""}
            </button>
          ))}
        </div>
      </div>

      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button type="button" aria-label="Close" onClick={() => setSheet(false)} className="absolute inset-0 bg-night/50" />
          <section className="relative flex w-full max-w-[430px] flex-col gap-4 rounded-t-[28px] bg-white px-5 pb-6 pt-2.5 text-ink shadow-sheet" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}>
            <span className="mx-auto h-[5px] w-10 rounded-full bg-ink/15" />
            <div className="flex items-center justify-between">
              <h2 className="m-0 font-display text-[22px] font-medium">Tasbih settings</h2>
              <button type="button" onClick={() => setSheet(false)} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full bg-ivory">
                <IconClose size={18} />
              </button>
            </div>
            <div>
              <span className="label">Daily goal</span>
              <div className="mt-2 grid grid-cols-5 gap-1 rounded-2xl bg-[#EEEAE0] p-1">
                {[0, 100, 300, 500, 1000].map((g) => (
                  <button key={g} type="button" aria-pressed={state.dailyGoal === g} onClick={() => setGoal(g)} className={`h-10 rounded-xl text-[12px] ${state.dailyGoal === g ? "bg-white font-bold text-em-900 shadow-[0_2px_8px_rgba(11,61,51,0.1)]" : "font-semibold text-muted"}`}>
                    {g === 0 ? "Off" : g}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-ivory px-3.5 py-3">
              <div className="flex flex-1 flex-col">
                <span className="text-[14px] font-bold">Vibrate on each count</span>
                <span className="text-[12px] text-muted">Longer buzz when a set of 33 completes</span>
              </div>
              <Switch checked={state.vibrate} onChange={toggleVibrate} label="Vibrate" />
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
