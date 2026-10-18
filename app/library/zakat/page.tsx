"use client";

import { useEffect, useState } from "react";
import LibHeader from "@/components/library/LibHeader";
import { DEFAULT_ZAKAT, NISAB_GOLD_GRAMS, NISAB_SILVER_GRAMS, computeZakat, fmtMoney, loadZakat, saveZakat, type ZakatInputs } from "@/lib/zakat";

const CURRENCIES = ["CAD", "USD", "GBP", "EUR", "PKR", "INR", "AED", "SAR", "AUD", "MYR", "TRY", "BDT"];

type Field = { key: keyof ZakatInputs; label: string; hint: string; unit?: string };
const ASSETS: Field[] = [
  { key: "cash", label: "Cash & bank balances", hint: "Everything in accounts and at home" },
  { key: "goldGrams", label: "Gold owned", hint: "Grams — jewellery you wear is zakatable in the Hanafi view", unit: "g" },
  { key: "silverGrams", label: "Silver owned", hint: "Grams", unit: "g" },
  { key: "investments", label: "Investments", hint: "Shares, funds, crypto at today’s value" },
  { key: "businessStock", label: "Business stock", hint: "Goods for sale at their current value" },
  { key: "receivables", label: "Money owed to you", hint: "Loans you expect to get back" },
];

export default function ZakatPage() {
  const [z, setZ] = useState<ZakatInputs>(DEFAULT_ZAKAT);
  useEffect(() => setZ(loadZakat()), []);
  const update = (patch: Partial<ZakatInputs>) => {
    const next = { ...z, ...patch };
    setZ(next);
    saveZakat(next);
  };
  const r = computeZakat(z);
  const num = (v: number) => (v ? String(v) : "");
  const onNum = (key: keyof ZakatInputs) => (e: React.ChangeEvent<HTMLInputElement>) => update({ [key]: Number(e.target.value.replace(/[^\d.]/g, "")) || 0 } as Partial<ZakatInputs>);

  return (
    <main className="flex flex-col gap-4 px-5 pb-[120px]">
      <LibHeader title="Zakat" sub="2.5% of wealth held a lunar year, above the nisab" />

      <section className="relative overflow-hidden rounded-hero bg-em-900 p-[18px] text-ivory shadow-hero">
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-gold-500">Zakat due</span>
        <p className="m-0 mt-1 font-display text-[40px] font-medium leading-none">{fmtMoney(r.zakat, z.currency)}</p>
        <p className="m-0 mt-2 text-[12px] text-ivory/70">
          Net zakatable wealth {fmtMoney(r.net, z.currency)} · nisab {r.nisab > 0 ? fmtMoney(r.nisab, z.currency) : "— enter a metal price"} ·{" "}
          {r.nisab > 0 ? (r.due ? "above nisab, zakat is due" : "below nisab, no zakat due") : ""}
        </p>
      </section>

      <section className="card flex flex-col gap-3 p-4">
        <span className="label">Currency & nisab</span>
        <div className="flex gap-2">
          <select value={z.currency} onChange={(e) => update({ currency: e.target.value })} className="h-11 flex-1 rounded-xl border border-ink/10 bg-ivory px-3 text-[14px] font-bold text-ink outline-none" aria-label="Currency">
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <div role="group" aria-label="Nisab basis" className="grid flex-1 grid-cols-2 gap-1 rounded-xl bg-[#EEEAE0] p-1">
            {(["silver", "gold"] as const).map((b) => (
              <button key={b} type="button" aria-pressed={z.nisabBasis === b} onClick={() => update({ nisabBasis: b })} className={`h-9 rounded-lg text-[12px] capitalize ${z.nisabBasis === b ? "bg-white font-bold text-em-900 shadow-[0_2px_8px_rgba(11,61,51,0.1)]" : "font-semibold text-muted"}`}>
                {b}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted">
            Gold price / gram
            <input inputMode="decimal" value={num(z.goldPricePerGram)} onChange={onNum("goldPricePerGram")} placeholder="e.g. 120" className="h-11 rounded-xl border border-ink/10 bg-ivory px-3 text-[14px] font-bold text-ink outline-none" />
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted">
            Silver price / gram
            <input inputMode="decimal" value={num(z.silverPricePerGram)} onChange={onNum("silverPricePerGram")} placeholder="e.g. 1.5" className="h-11 rounded-xl border border-ink/10 bg-ivory px-3 text-[14px] font-bold text-ink outline-none" />
          </label>
        </div>
        <p className="m-0 text-[11px] leading-[1.5] text-muted">
          Nisab = {NISAB_GOLD_GRAMS} g gold or {NISAB_SILVER_GRAMS} g silver. Most scholars advise the silver nisab (lower) so more people give. Check today’s price from your jeweller or a bullion site.
        </p>
      </section>

      <section className="card flex flex-col gap-3 p-4">
        <span className="label">What you own</span>
        {ASSETS.map((f) => (
          <label key={f.key} className="flex items-center gap-3">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-[14px] font-bold text-ink">{f.label}</span>
              <span className="text-[11px] text-muted">{f.hint}</span>
            </span>
            <span className="flex items-center gap-1">
              <input inputMode="decimal" value={num(z[f.key] as number)} onChange={onNum(f.key)} placeholder="0" className="h-11 w-28 rounded-xl border border-ink/10 bg-ivory px-3 text-right text-[14px] font-bold text-ink outline-none" />
              {f.unit && <span className="w-4 text-[12px] font-bold text-muted">{f.unit}</span>}
            </span>
          </label>
        ))}
      </section>

      <section className="card flex flex-col gap-3 p-4">
        <span className="label">What you owe</span>
        <label className="flex items-center gap-3">
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[14px] font-bold text-ink">Debts due within the year</span>
            <span className="text-[11px] text-muted">Bills, loan instalments due, money you owe people</span>
          </span>
          <input inputMode="decimal" value={num(z.liabilities)} onChange={onNum("liabilities")} placeholder="0" className="h-11 w-28 rounded-xl border border-ink/10 bg-ivory px-3 text-right text-[14px] font-bold text-ink outline-none" />
        </label>
      </section>

      {r.breakdown.length > 0 && (
        <section className="card flex flex-col gap-2 p-4">
          <span className="label">Breakdown</span>
          {r.breakdown.map((b) => (
            <div key={b.label} className="flex justify-between text-[13px]">
              <span className="text-[#3D4744]">{b.label}</span>
              <span className="font-bold">{fmtMoney(b.value, z.currency)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-ink/5 pt-2 text-[13px]">
            <span className="text-[#3D4744]">Less debts</span>
            <span className="font-bold">− {fmtMoney(r.liabilities, z.currency)}</span>
          </div>
          <div className="flex justify-between text-[14px]">
            <span className="font-bold">Net × 2.5%</span>
            <span className="font-black text-em-900">{fmtMoney(r.zakat, z.currency)}</span>
          </div>
        </section>
      )}

      <p className="m-0 px-1 text-[11px] leading-[1.6] text-muted">A guide, not a fatwa: schools differ on jewellery, pensions and business assets. Your figures stay on this phone. Ask a scholar for your situation.</p>
    </main>
  );
}
