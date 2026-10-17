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
 * Location on demand: nothing runs in the background. `refresh()` takes ONE GPS fix (on a tap),
 * updates the saved location and re-geocodes the city if the phone moved more than ~3 km.
 * On first open, if location was already granted, it refreshes once so the screen is current.
 */
export function useLocationOnDemand() {
  const base = useLocation(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "granted" | "denied" | "unsupported">("idle");
  const [, setClock] = useState(0);

  const refresh = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsStatus("unsupported");
      return;
    }
    setRefreshing(true);
    writeJSON(TRIED, true);
    await new Promise<void>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          const prev = loadLocation();
          const city = prev.source === "gps" && metres(prev, here) < 3000 ? prev.city : await reverseGeocode(here.lat, here.lng);
          saveLocation({ ...here, city, source: "gps" });
          setGpsStatus("granted");
          setUpdatedAt(Date.now());
          setRefreshing(false);
          resolve();
        },
        (err) => {
          setGpsStatus(err.code === err.PERMISSION_DENIED ? "denied" : "idle");
          setRefreshing(false);
          resolve();
        },
        { enableHighAccuracy: false, maximumAge: 60000, timeout: 15000 },
      );
    });
  }, []);

  // One silent refresh per open when permission was granted earlier.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let granted = loadLocation().source === "gps";
      try {
        if (navigator.permissions?.query) {
          const p = await navigator.permissions.query({ name: "geolocation" as PermissionName });
          granted = p.state === "granted";
          if (p.state === "denied") setGpsStatus("denied");
        }
      } catch {
        /* no permissions API: fall back to the saved source */
      }
      if (!cancelled && granted) void refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // Re-render every 30 s so "updated X min ago" stays honest.
  useEffect(() => {
    const t = setInterval(() => setClock((c) => c + 1), 30000);
    return () => clearInterval(t);
  }, []);

  return { ...base, updatedAt, refreshing, gpsStatus, refresh };
}
