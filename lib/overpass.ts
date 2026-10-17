"use client";

import { cached, readJSON, writeJSON } from "./storage";
import { haversineKm } from "./aladhan";

/** Mosques from OpenStreetMap via the Overpass API — free, no key. */

export type Mosque = {
  id: string; // "node-123" | "way-456" | "relation-789" — URL-safe
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
  tags: Record<string, string>;
};

/** Public Overpass mirrors, tried in order; the first that answers wins. */
const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.osm.jp/api/interpreter",
];
const LAST_KEY = "ug.mosques.last";

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

type OverpassEl = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

async function runOverpass(query: string): Promise<OverpassEl[]> {
  let lastErr: unknown;
  // Two passes over the mirrors: public Overpass servers are often briefly overloaded.
  for (let pass = 0; pass < 2; pass++) {
    for (const ep of ENDPOINTS) {
      try {
        const r = await withTimeout(
          fetch(ep, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `data=${encodeURIComponent(query)}`,
          }),
          20000,
        );
        if (!r.ok) throw new Error(`Overpass ${r.status}`);
        const j = await r.json();
        if (!Array.isArray(j.elements)) throw new Error("Overpass: bad response");
        return j.elements as OverpassEl[];
      } catch (e) {
        lastErr = e;
      }
    }
    await new Promise((res) => setTimeout(res, 1500));
  }
  throw lastErr instanceof Error ? lastErr : new Error("Overpass unavailable");
}

function toMosque(el: OverpassEl, lat: number, lng: number): Mosque | null {
  const mlat = el.lat ?? el.center?.lat;
  const mlng = el.lon ?? el.center?.lon;
  if (mlat == null || mlng == null) return null;
  const tags = el.tags || {};
  const name = tags["name:en"] || tags.name || "Masjid (unnamed on OpenStreetMap)";
  return { id: `${el.type}-${el.id}`, name, lat: mlat, lng: mlng, distanceKm: haversineKm(lat, lng, mlat, mlng), tags };
}

/** Masjids are fetched around the centre of a ~5 km cell with a 15 km radius, so a moving phone reuses one result set. */
const CELL = 0.05;
const snap = (n: number) => Math.round(n / CELL) * CELL;

export function mosqueCellKey(lat: number, lng: number): string {
  return `${snap(lat).toFixed(2)},${snap(lng).toFixed(2)}`;
}

export async function fetchMosques(lat: number, lng: number, radiusM = 15000): Promise<Mosque[]> {
  const clat = snap(lat);
  const clng = snap(lng);
  const key = `ug.mosques.${clat.toFixed(2)}.${clng.toFixed(2)}.${radiusM}`;
  const list = await cached(key, 24 * 3600_000, async () => {
    const q = `[out:json][timeout:20];
nwr["amenity"="place_of_worship"]["religion"="muslim"](around:${radiusM},${clat},${clng});
out center tags;`;
    const els = await runOverpass(q);
    return els.map((e) => toMosque(e, clat, clng)).filter((m): m is Mosque => !!m);
  });
  // distances relative to the current point (cache may be from a nearby point)
  const withDist = list.map((m) => ({ ...m, distanceKm: haversineKm(lat, lng, m.lat, m.lng) })).sort((a, b) => a.distanceKm - b.distanceKm);
  writeJSON(LAST_KEY, withDist);
  return withDist;
}

/** Look a mosque up by id: last result set first, then a direct Overpass fetch. */
export async function fetchMosqueById(id: string, lat: number, lng: number): Promise<Mosque | null> {
  const last = readJSON<Mosque[]>(LAST_KEY, []);
  const hit = last.find((m) => m.id === id);
  if (hit) return { ...hit, distanceKm: haversineKm(lat, lng, hit.lat, hit.lng) };
  const [type, num] = id.split("-");
  if (!["node", "way", "relation"].includes(type) || !/^\d+$/.test(num || "")) return null;
  const els = await runOverpass(`[out:json][timeout:25];${type}(${num});out center tags;`);
  const m = els[0] ? toMosque(els[0], lat, lng) : null;
  return m;
}

export function facilitiesOf(m: Mosque): string[] {
  const t = m.tags;
  const out: string[] = [];
  if (t.parking && t.parking !== "no") out.push("Parking");
  if (t.wheelchair === "yes" || t.wheelchair === "limited") out.push("Wheelchair");
  if (t["toilets:wudu"] === "yes" || t.wudu === "yes") out.push("Wudu");
  if (t.female === "yes" || t["prayer_room:female"] === "yes") out.push("Sisters’ section");
  if (t.denomination) out.push(t.denomination[0].toUpperCase() + t.denomination.slice(1));
  return out;
}

export function directionsUrl(m: Mosque): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${m.lat},${m.lng}&travelmode=driving`;
}
