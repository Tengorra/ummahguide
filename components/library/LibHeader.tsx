"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { IconBack } from "@/components/Icons";

/** Light sub-page header: back, title/subtitle, optional right-side control. */
export default function LibHeader({ title, sub, back = "/library", right, dark = false }: { title: string; sub?: string; back?: string; right?: ReactNode; dark?: boolean }) {
  return (
    <header className="flex items-center gap-3 pt-12">
      <Link href={back} aria-label="Back" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${dark ? "border border-white/15 bg-white/10 text-ivory" : "border border-ink/10 bg-white text-em-900 shadow-card"}`}>
        <IconBack />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className={`m-0 truncate font-display text-[24px] font-medium leading-[1.05] ${dark ? "text-ivory" : "text-ink"}`}>{title}</h1>
        {sub && <p className={`m-0 mt-0.5 truncate text-[12px] font-semibold ${dark ? "text-ivory/60" : "text-muted"}`}>{sub}</p>}
      </div>
      {right}
    </header>
  );
}
