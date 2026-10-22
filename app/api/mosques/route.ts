import { NextResponse } from "next/server";

/**
 * Cached relay for OpenStreetMap mosque data.
 * Phones hitting the public Overpass mirrors directly is slow and fragile; this route asks the mirrors
 * server-side (in parallel, first answer wins), normalises the result, and lets Vercel's CDN cache it per
 * ~5 km cell for a day — so after the first user in an area, everyone else gets it instantly.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.osm.jp/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

type OverpassEl = { type: "node" | "way" | "relation"; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

const CELL = 0.05;
const snap = (n: number) => Math.round(n / CELL) * CELL;

async function askMirror(ep: string, query: string, signal: AbortSignal): Promise<OverpassEl[]> {
  const r = await fetch(ep, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "UmmahGuide/1.0 (+https://ummah.tengorra.com)" },
    body: `data=${encodeURIComponent(query)}`,
    signal,
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Overpass ${r.status}`);
  const j = (await r.json()) as { elements?: unknown };
  if (!Array.isArray(j.elements)) throw new Error("bad response");
  return j.elements as OverpassEl[];
}

function anyMirror(query: string, timeoutMs: number): Promise<OverpassEl[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  return new Promise((resolve, reject) => {
    let pending = ENDPOINTS.length;
    let lastErr: unknown;
    for (const ep of ENDPOINTS) {
      askMirror(ep, query, ctrl.signal).then(
        (els) => {
          clearTimeout(timer);
          ctrl.abort();
          resolve(els);
        },
        (e) => {
          lastErr = e;
          if (--pending === 0) {
            clearTimeout(timer);
            reject(lastErr instanceof Error ? lastErr : new Error("Overpass unavailable"));
          }
        },
      );
    }
  });
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const lat = Number(u.searchParams.get("lat"));
  const lng = Number(u.searchParams.get("lng"));
  const radius = Math.min(30000, Math.max(1000, Number(u.searchParams.get("r")) || 15000));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "lat/lng required" }, { status: 400 });
  }
  const clat = snap(lat);
  const clng = snap(lng);
  const query = `[out:json][timeout:25];nwr["amenity"="place_of_worship"]["religion"="muslim"](around:${radius},${clat.toFixed(2)},${clng.toFixed(2)});out center tags;`;

  try {
    const els = await anyMirror(query, 25000);
    const mosques = els
      .map((el) => {
        const mlat = el.lat ?? el.center?.lat;
        const mlng = el.lon ?? el.center?.lon;
        if (mlat == null || mlng == null) return null;
        const tags = el.tags ?? {};
        return { id: `${el.type}-${el.id}`, name: tags["name:en"] || tags.name || "Masjid (unnamed on OpenStreetMap)", lat: mlat, lng: mlng, tags };
      })
      .filter(Boolean);
    return NextResponse.json(
      { cell: `${clat.toFixed(2)},${clng.toFixed(2)}`, radius, count: mosques.length, mosques, fetchedAt: new Date().toISOString() },
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800", "Access-Control-Allow-Origin": "*" } },
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message || "Overpass unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
