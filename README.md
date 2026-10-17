# UmmahGuide

A calm, mobile-first Muslim companion app: the next **Jamat** near you on a map, a night-first **Quran** reader with audio, **prayer times** with azan alerts, and a live **Qibla** compass.

Built with Next.js 14 (App Router), TypeScript and Tailwind. Installable as a PWA. **No paid APIs and no API keys.**

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production (service worker only registers in production)
```

Open it on your phone (same Wi-Fi: `http://<your-pc-ip>:3000`) and use "Add to Home Screen" to install.

## What's inside

| Route | What it does |
|---|---|
| `/` | Today: next-prayer hero with countdown, Hijri date, Qibla, nearest masjid + next Jamat, continue reading, tasbeeh counter, verse of the day |
| `/masjid` | Map of masjids within 10 km (OpenStreetMap) with a bottom sheet sorted by next Jamat; city search; GPS |
| `/masjid/[id]` | Masjid profile: Adhan vs Jamat table, Jumu'ah, facilities, Directions, Remind me |
| `/masjid/[id]/admin` | Masjid admin publishes Jamat times → Verified badge, reminders update |
| `/quran` · `/quran/[id]` | 114 surahs, Uthmani text + translation, verse-by-verse audio, tafsir, bookmarks, last-read |
| `/prayer` | Today / week times, calculation method, Hanafi Asr, azan alert toggles, Qibla compass |
| `/more` | Location, calculation settings, notifications, reminders list |

## Data sources (all free)

- **Prayer times, Hijri calendar, Qibla** — [Aladhan API](https://aladhan.com/prayer-times-api)
- **Masjid locations** — [OpenStreetMap](https://www.openstreetmap.org) via the Overpass API (`amenity=place_of_worship` + `religion=muslim`)
- **City search / reverse geocoding** — Nominatim (OpenStreetMap)
- **Map tiles** — OpenStreetMap standard tiles (attribution shown on the map)
- **Quran text, translations, tafsir, audio** — [Quran.com API v4](https://api-docs.quran.com)

## How Jamat times work

Calculated prayer times are a commodity. The product is **masjid-published Jamat times with a Verified badge**:

1. Until a masjid publishes, the app shows *estimated* Jamat = adhan + a typical offset, clearly labelled "est."
2. A masjid admin opens `/masjid/[id]/admin`, sets only the Jamat column (adhan is calculated), can lock Maghrib to "adhan + N min", chooses Today / This week / Until changed, and publishes.
3. Published times get the Verified badge, drive the "next Jamat" sort on the map, and feed reminders.

Today this is stored in the browser (`localStorage`) behind one small interface in `lib/jamat.ts` (`loadPublished` / `savePublished`). To make it shared across all users, replace those two functions with Supabase reads/writes and put the admin route behind auth — nothing else changes.

## Reminders and azan alerts

Reminders and azan toggles use the browser Notifications API and fire from a scheduler that runs **while the app is open or installed to the home screen** (`lib/reminders.ts`). For alerts when the app is closed, add Web Push (a VAPID key + a tiny server) — the reminder shape is already in place.

## Project map

```
app/            routes (all client components)
components/     TabBar (glass), PrayerHero, MasjidMap (Leaflet), QiblaCompass, ReminderSheet, AudioPlayer, …
lib/            aladhan.ts, overpass.ts, jamat.ts, reminders.ts, quran.ts, location.ts, prayer.ts, storage.ts
public/         manifest.json, sw.js, icons/
scripts/        make-icons.py (regenerates PNG icons with Pillow)
```

## Design language

Emerald `#0B3D33` · Gold `#C9A44C` (reserved for "the next thing") · Ivory `#F4F1EA` · Night `#0C1A17` for reading.
Fraunces for display, Plus Jakarta Sans for UI, Amiri for Arabic. Floating glass tab bar; bottom sheets in the thumb zone; 8-point-star geometry only as a low-opacity texture.
