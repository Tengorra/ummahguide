import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 22, ...rest }: P) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...rest,
  };
}

export const IconHome = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10v10h14V10" />
  </svg>
);
export const IconMasjid = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 20h16" />
    <path d="M6 20v-7" />
    <path d="M18 20v-7" />
    <path d="M6 13c0-4 6-6 6-6s6 2 6 6" />
    <path d="M12 4v3" />
  </svg>
);
export const IconQuran = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4z" />
    <path d="M20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z" />
  </svg>
);
export const IconPrayer = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);
export const IconMore = (p: P) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="6" height="6" rx="1.5" />
    <rect x="14" y="4" width="6" height="6" rx="1.5" />
    <rect x="4" y="14" width="6" height="6" rx="1.5" />
    <rect x="14" y="14" width="6" height="6" rx="1.5" />
  </svg>
);
export const IconBell = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z" />
    <path d="M10 21h4" />
  </svg>
);
export const IconSearch = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);
export const IconBack = (p: P) => (
  <svg {...base(p)}>
    <path d="m15 6-6 6 6 6" />
  </svg>
);
export const IconChevronDown = (p: P) => (
  <svg {...base(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
export const IconChevronRight = (p: P) => (
  <svg {...base(p)}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);
export const IconBookmark = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 4h12v17l-6-4-6 4z" />
  </svg>
);
export const IconShare = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 15V4" />
    <path d="m8 8 4-4 4 4" />
    <path d="M5 13v7h14v-7" />
  </svg>
);
export const IconNavigate = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3 20 21l-8-5-8 5z" />
  </svg>
);
export const IconCheck = (p: P) => (
  <svg {...base(p)} strokeWidth={2.25}>
    <path d="m5 12 5 5 9-10" />
  </svg>
);
export const IconSliders = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 7h16M7 12h10M10 17h4" />
  </svg>
);
export const IconSunrise = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 17h16" />
    <path d="M7 17a5 5 0 0 1 10 0" />
    <path d="M12 5v3" />
    <path d="m5 9 2 2" />
    <path d="m19 9-2 2" />
  </svg>
);
export const IconInfo = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </svg>
);
export const IconLocate = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    <circle cx="12" cy="12" r="8" />
  </svg>
);
export const IconPlay = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M8 5v14l11-7z" />
  </svg>
);
export const IconPause = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M7 5h4v14H7z" />
    <path d="M13 5h4v14h-4z" />
  </svg>
);
export const IconPrev = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M18 6v12l-9-6z" />
    <path d="M6 6h2v12H6z" />
  </svg>
);
export const IconNext = (p: P) => (
  <svg {...base(p)} fill="currentColor" stroke="none">
    <path d="M6 6v12l9-6z" />
    <path d="M16 6h2v12h-2z" />
  </svg>
);
export const IconRepeat = (p: P) => (
  <svg {...base(p)}>
    <path d="M17 2l4 4-4 4" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <path d="M7 22l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);
export const IconClose = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);
export const IconChevronLeft = (p: P) => (
  <svg {...base(p)}>
    <path d="m15 6-6 6 6 6" />
  </svg>
);
export const IconCalendar = (p: P) => (
  <svg {...base(p)}>
    <rect x="4" y="5" width="16" height="15" rx="2.5" />
    <path d="M4 10h16M8 3v4M16 3v4" />
  </svg>
);
export const IconCompass = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="m15.5 8.5-2 5-5 2 2-5z" />
  </svg>
);
export const IconGear = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
  </svg>
);
export const IconMoon = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
  </svg>
);
export const IconFlame = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3c1 3 4 4.5 4 9a4 4 0 0 1-8 0c0-1.5.5-2.5 1.5-3.5.5 1.5 1.5 2 2.5 2 0-3-1-5-0-7.5z" />
  </svg>
);
export const IconDoubleCheck = (p: P) => (
  <svg {...base(p)} strokeWidth={2.25}>
    <path d="m3 12 4 4 7-8" />
    <path d="m12 16 8-9" />
  </svg>
);
export const IconRefresh = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 12a8 8 0 1 1-2.34-5.66" />
    <path d="M20 4v5h-5" />
  </svg>
);
