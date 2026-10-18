/** Zakat calculator — pure maths, no API. Nisab from gold (87.48 g) or silver (612.36 g) at a price the user enters. */

import { readJSON, writeJSON } from "./storage";

export const NISAB_GOLD_GRAMS = 87.48;
export const NISAB_SILVER_GRAMS = 612.36;
export const ZAKAT_RATE = 0.025;

export type ZakatInputs = {
  currency: string;
  goldPricePerGram: number; // user-entered, in their currency
  silverPricePerGram: number;
  nisabBasis: "gold" | "silver";
  cash: number; // cash, bank balances, savings
  goldGrams: number; // gold owned (jewellery counted per the user's school)
  silverGrams: number;
  investments: number; // shares, funds, crypto at market value
  businessStock: number; // trade goods at cost/market
  receivables: number; // money owed to you that you expect back
  liabilities: number; // debts due within the year, bills owed
};

export const DEFAULT_ZAKAT: ZakatInputs = {
  currency: "CAD",
  goldPricePerGram: 0,
  silverPricePerGram: 0,
  nisabBasis: "silver",
  cash: 0,
  goldGrams: 0,
  silverGrams: 0,
  investments: 0,
  businessStock: 0,
  receivables: 0,
  liabilities: 0,
};

const KEY = "ug.zakat";

export function loadZakat(): ZakatInputs {
  return { ...DEFAULT_ZAKAT, ...readJSON<Partial<ZakatInputs>>(KEY, {}) };
}
export function saveZakat(z: ZakatInputs) {
  writeJSON(KEY, z);
}

export type ZakatResult = {
  assets: number;
  liabilities: number;
  net: number;
  nisab: number;
  due: boolean;
  zakat: number;
  breakdown: { label: string; value: number }[];
};

export function computeZakat(z: ZakatInputs): ZakatResult {
  const gold = z.goldGrams * z.goldPricePerGram;
  const silver = z.silverGrams * z.silverPricePerGram;
  const breakdown = [
    { label: "Cash & savings", value: z.cash },
    { label: "Gold", value: gold },
    { label: "Silver", value: silver },
    { label: "Investments", value: z.investments },
    { label: "Business stock", value: z.businessStock },
    { label: "Money owed to you", value: z.receivables },
  ].filter((b) => b.value > 0);
  const assets = breakdown.reduce((a, b) => a + b.value, 0);
  const net = Math.max(0, assets - z.liabilities);
  const nisab = z.nisabBasis === "gold" ? NISAB_GOLD_GRAMS * z.goldPricePerGram : NISAB_SILVER_GRAMS * z.silverPricePerGram;
  const due = nisab > 0 && net >= nisab;
  return { assets, liabilities: z.liabilities, net, nisab, due, zakat: due ? net * ZAKAT_RATE : 0, breakdown };
}

export function fmtMoney(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
  } catch {
    return `${currency} ${Math.round(n).toLocaleString()}`;
  }
}
