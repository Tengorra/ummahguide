"use client";

import { useCallback, useEffect, useState } from "react";
import { readJSON, writeJSON } from "./storage";

export type Loc = {
  lat: number;
  lng: number;
  city: string;
  source: "gps" | "search" | "default";
};

export const DEFAULT_LOC: Loc = { lat: 52.1332, lng: -106.67, city: "Saskatoon", source: "default" };
const KEY = "ug.location";
const TRIED = "ug.gps.tried";

export function loadLocation(): Loc {
  return readJSON<Loc>(KEY, DEFAULT_LOC);
}

export function saveLocation(loc: Loc) {
  writeJSON(KEY, loc);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ug:location", { detail: loc }));
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=10&accept-language=en`,
    );
    const j = await r.json();
    const a = j.address || {};
    return a.city || a.town || a.village || a.municipality || a.county || a.state || "Your area";
  } catch {
    return "Your area";
  }
}

export async function geocodeCity(q: string): Promise<Loc | null> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=en&q=${encodeURIComponent(q)}`,
    );
    const j = (await r.json()) as Array<{ lat: string; lon: string; name?: string; display_name: string }>;
    if (!j.length) return null;
    const hit = j[0];
    return { lat: Number(hit.lat), lng: Number(hit.lon), city: hit.name || hit.display_name.split(",")[0], source: "search" };
  } catch {
    return null;
  }
}

/** Shared location state across the app (localStorage + window event). Auto-asks GPS once. */
export function useLocation(autoAsk = true) {
  const [loc, setLocState] = useState<Loc>(DEFAULT_LOC);
  const [status, setStatus] = useState<"idle" | "locating" | "denied" | "unsupported">("idle");

  useEffect(() => {
    setLocState(loadLocation());
    const onChange = (e: Event) => setLocState((e as CustomEvent<Loc>).detail);
    window.addEventListener("ug:location", onChange);
    return () => window.removeEventListener("ug:location", onChange);
  }, []);

  const requestGps = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      return;
    }
    setStatus("locating");
    writeJSON(TRIED, true);
    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          const city = await reverseGeocode(lat, lng);
          saveLocation({ lat, lng, city, source: "gps" });
          setStatus("idle");
          resolve();
        },
        () => {
          setStatus("denied");
          resolve();
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
      );
    });
  }, []);

  useEffect(() => {
    if (!autoAsk) return;
    const saved = loadLocation();
    if (saved.source === "default" && !readJSON(TRIED, false)) void requestGps();
  }, [autoAsk, requestGps]);

  const setLoc = useCallback((l: Loc) => {
    saveLocation(l);
    setLocState(l);
  }, []);

  return { loc, status, requestGps, setLoc };
}
