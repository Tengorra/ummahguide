"use client";

import { useCallback, useEffect, useState } from "react";
import { compassLabel, fetchQibla, kmToMakkah } from "@/lib/aladhan";

type IOSDeviceOrientationEvent = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };
type OrientationEvt = DeviceOrientationEvent & { webkitCompassHeading?: number };

/** Live Qibla compass. Uses the device compass when allowed; otherwise shows the bearing from north. */
export default function QiblaCompass({ lat, lng, dark = true }: { lat: number; lng: number; dark?: boolean }) {
  const [qibla, setQibla] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [perm, setPerm] = useState<"idle" | "needs-tap" | "granted" | "denied" | "unsupported">("idle");

  useEffect(() => {
    fetchQibla(lat, lng).then(setQibla).catch(() => setQibla(null));
  }, [lat, lng]);

  const attach = useCallback(() => {
    const handler = (e: Event) => {
      const ev = e as OrientationEvt;
      let h: number | null = null;
      if (typeof ev.webkitCompassHeading === "number") h = ev.webkitCompassHeading;
      else if (ev.alpha != null) h = (360 - ev.alpha) % 360;
      if (h != null) setHeading(h);
    };
    const evName = "ondeviceorientationabsolute" in window ? "deviceorientationabsolute" : "deviceorientation";
    window.addEventListener(evName, handler as EventListener);
    return () => window.removeEventListener(evName, handler as EventListener);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
      setPerm("unsupported");
      return;
    }
    const DOE = DeviceOrientationEvent as IOSDeviceOrientationEvent;
    if (typeof DOE.requestPermission === "function") {
      setPerm("needs-tap");
      return;
    }
    setPerm("granted");
    return attach();
  }, [attach]);

  async function enable() {
    const DOE = DeviceOrientationEvent as IOSDeviceOrientationEvent;
    try {
      const r = await DOE.requestPermission?.();
      if (r === "granted") {
        setPerm("granted");
        attach();
      } else setPerm("denied");
    } catch {
      setPerm("denied");
    }
  }

  const live = heading != null && perm === "granted";
  const needle = qibla == null ? 0 : live ? (qibla - heading! + 360) % 360 : qibla;
  const ring = live ? (360 - heading!) % 360 : 0;
  const ink = dark ? "#F4F1EA" : "#0B3D33";
  const faint = dark ? "rgba(244,241,234,0.45)" : "rgba(11,61,51,0.45)";
  const line = dark ? "rgba(255,255,255,0.14)" : "rgba(11,61,51,0.14)";
  const face = dark ? "rgba(255,255,255,0.05)" : "rgba(11,61,51,0.04)";

  return (
    <div id="qibla" className="flex flex-col items-center gap-2.5">
      <svg width="220" height="220" viewBox="0 0 200 200" role="img" aria-label={qibla != null ? `Qibla is ${Math.round(qibla)} degrees ${compassLabel(qibla)}` : "Qibla compass"}>
        <circle cx="100" cy="100" r="96" fill={face} stroke={line} />
        <circle cx="100" cy="100" r="78" fill="none" stroke={line} />
        <g style={{ transform: `rotate(${ring}deg)`, transformOrigin: "100px 100px", transition: "transform 200ms linear" }}>
          <g stroke={faint} strokeWidth="1.5" strokeLinecap="round">
            {[30, 60, 120, 150, 210, 240, 300, 330].map((a) => (
              <path key={a} d="M100 8v8" transform={`rotate(${a} 100 100)`} />
            ))}
          </g>
          <text x="100" y="24" textAnchor="middle" fill={ink} fontSize="12" fontWeight="700">N</text>
          <text x="182" y="104" textAnchor="middle" fill={faint} fontSize="12" fontWeight="700">E</text>
          <text x="100" y="184" textAnchor="middle" fill={faint} fontSize="12" fontWeight="700">S</text>
          <text x="18" y="104" textAnchor="middle" fill={faint} fontSize="12" fontWeight="700">W</text>
        </g>
        <g style={{ transform: `rotate(${needle}deg)`, transformOrigin: "100px 100px", transition: "transform 200ms linear" }}>
          <path d="M100 178l-9-74 9 6 9-6z" fill={dark ? "rgba(244,241,234,0.16)" : "rgba(11,61,51,0.16)"} />
          <path d="M100 30l9 74-9-6-9 6z" fill="#C9A44C" />
          <rect x="91" y="8" width="18" height="18" rx="3" fill="#141A18" stroke="#C9A44C" />
          <rect x="91" y="13" width="18" height="3" fill="#C9A44C" />
        </g>
        <circle cx="100" cy="100" r="34" fill={dark ? "#0B3D33" : "#FFFFFF"} stroke={line} />
        <text x="100" y="105" textAnchor="middle" fill={ink} fontSize="24" fontWeight="500" fontFamily="var(--font-fraunces), Georgia, serif">
          {qibla != null ? `${Math.round(qibla)}°` : "…"}
        </text>
        <text x="100" y="122" textAnchor="middle" fill="#C9A44C" fontSize="10" fontWeight="700" letterSpacing="1">
          {qibla != null ? compassLabel(qibla) : ""}
        </text>
      </svg>
      <span className={`text-[12px] font-semibold ${dark ? "text-ivory/70" : "text-muted"}`}>
        {Math.round(kmToMakkah(lat, lng)).toLocaleString()} km to Makkah ·{" "}
        {live ? "live compass" : perm === "unsupported" ? "bearing from north" : "point the top of your phone north"}
      </span>
      {perm === "needs-tap" && (
        <button type="button" onClick={enable} className="chip-active h-10">
          Enable live compass
        </button>
      )}
      {perm === "denied" && <span className={`text-[12px] ${dark ? "text-ivory/60" : "text-muted"}`}>Compass access was denied. Showing the bearing from north.</span>}
    </div>
  );
}
