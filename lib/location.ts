"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

const TZ_DERIVED = "ug.loc.tzderived";

/**
 * First run with no saved location: default to the city named by the phone's own time zone
 * (Europe/London → London, America/Toronto → Toronto) instead of a fixed city, so a user
 * abroad sees sensible times before granting GPS. Runs once; a real fix or search replaces it.
 */
export async function deriveDefaultFromTimezone(): Promise<Loc | null> {
  if (typeof window === "undefined") return null;
  if (readJSON(TZ_DERIVED, false)) return null;
  writeJSON(TZ_DERIVED, true);
  const saved = loadLocation();
  if (saved.source !== "default") return null;
  let tz = "";
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  } catch {
    return null;
  }
  if (!tz || tz === "America/Regina") return null;
  const city = tz.split("/").pop()?.replace(/_/g, " ");
  if (!city) return null;
  const hit = await geocodeCity(city);
  if (!hit) return null;
  const loc: Loc = { ...hit, source: "default" };
  saveLocation(loc);
  return loc;
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
    void deriveDefaultFromTimezone();
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

/** Metres between two points. */
export function metres(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Live location: follows the phone as it moves (watchPosition), so "nearest masjid" keeps
 * updating while driving. Accepts a fix when it moved ≥120 m; re-geocodes the city after ~3 km.
 * Starts automatically when location was granted before; otherwise exposes start() for a tap.
 */
export function useLiveLocation() {
  const base = useLocation(false);
  const [live, setLive] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [liveStatus, setLiveStatus] = useState<"idle" | "watching" | "denied" | "unsupported">("idle");
  const [tick, setTick] = useState(0);
  const [, setClock] = useState(0);
  const forced = useRef(false);

  const start = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLiveStatus("unsupported");
      return () => {};
    }
    setLiveStatus("watching");
    writeJSON(TRIED, true);
    let last: Loc | null = null;
    let lastGeocoded: { lat: number; lng: number } | null = null;
    const id = navigator.geolocation.watchPosition(
      async (pos) => {
        const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (last && metres(last, here) < 120) {
          setUpdatedAt(Date.now());
          return;
        }
        const prev = last ?? loadLocation();
        let city = prev.city;
        if (!lastGeocoded || metres(lastGeocoded, here) > 3000) {
          lastGeocoded = here;
          city = await reverseGeocode(here.lat, here.lng);
        }
        const next: Loc = { ...here, city, source: "gps" };
        last = next;
        saveLocation(next);
        setLive(true);
        setUpdatedAt(Date.now());
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setLiveStatus("denied");
      },
      { enableHighAccuracy: false, maximumAge: 15000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    const maybeStart = async () => {
      const saved = loadLocation();
      let granted = saved.source === "gps";
      try {
        if (navigator.permissions?.query) {
          const p = await navigator.permissions.query({ name: "geolocation" as PermissionName });
          granted = p.state === "granted";
        }
      } catch {
        /* permissions API unavailable: fall back to the saved source */
      }
      if (!cancelled && (granted || forced.current)) stop = start();
    };
    void maybeStart();
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [start, tick]);

  // Re-render every 30 s so "updated Xs ago" stays honest.
  useEffect(() => {
    const t = setInterval(() => setClock((c) => c + 1), 30000);
    return () => clearInterval(t);
  }, []);

  return {
    ...base,
    live,
    liveStatus,
    updatedAt,
    /** Call from a tap when location was never granted; triggers the browser prompt. */
    startLive: () => {
      forced.current = true;
      setTick((t) => t + 1);
    },
  };
}
