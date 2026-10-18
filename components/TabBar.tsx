"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHome, IconMasjid, IconQuran, IconPrayer, IconMore } from "./Icons";

const TABS = [
  { href: "/", label: "Home", Icon: IconHome, match: (p: string) => p === "/" },
  { href: "/masjid", label: "Masjid", Icon: IconMasjid, match: (p: string) => p.startsWith("/masjid") },
  { href: "/quran", label: "Quran", Icon: IconQuran, match: (p: string) => p.startsWith("/quran") },
  { href: "/prayer", label: "Prayer", Icon: IconPrayer, match: (p: string) => p.startsWith("/prayer") },
  { href: "/more", label: "More", Icon: IconMore, match: (p: string) => p.startsWith("/more") },
];

/** Floating glass tab bar. Dark variant on night screens (Quran, Prayer). Hidden on pushed detail screens. */
export default function TabBar() {
  const pathname = usePathname() || "/";
  const dark = pathname.startsWith("/quran") || pathname.startsWith("/prayer") || pathname.startsWith("/qibla");
  const hidden = /^\/masjid\/[^/]+/.test(pathname) || /^\/quran\/[^/]+/.test(pathname) || pathname.startsWith("/qibla");
  if (hidden) return null;

  return (
    <nav
      aria-label="Main navigation"
      className={`fixed bottom-[18px] left-1/2 z-40 flex h-[68px] w-[calc(100%-32px)] max-w-[398px] -translate-x-1/2 items-center justify-between rounded-full px-2.5 ${
        dark ? "glass-dark shadow-[0_14px_36px_rgba(0,0,0,0.4)]" : "glass shadow-glass"
      }`}
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map(({ href, label, Icon, match }) => {
        const active = match(pathname);
        const cls = active
          ? dark
            ? "bg-gold-500 text-night"
            : "bg-em-900 text-ivory"
          : dark
            ? "text-ivory/70"
            : "text-muted";
        return (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={`flex h-[52px] w-[60px] flex-col items-center justify-center gap-[3px] rounded-full ${cls}`}
          >
            <Icon />
            <span className={`text-[10px] ${active ? "font-bold" : "font-semibold"}`}>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
