# UmmahGuide

A calm, mobile-first Muslim companion app: the next **Jamat** near you on a map, a night-first **Quran** reader with audio, **prayer times** with azan alerts, and a live **Qibla** compass.

Built with Next.js 14 (App Router), TypeScript and Tailwind. Installable as a PWA. **No paid APIs and no API keys.**

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production (service worker only registers in production)
```

Live at **https://ummah.tengorra.com** (deploys from `main` via Vercel). Open it on your phone and use "Add to Home Screen" to install.

## What's inside

| Route | What it does |
|---|---|
| `/` | Today: Home-masjid Jamat hero with countdown, prayers-logged ring, nearest masjids (manual refresh), verse & hadith of the day, Qibla/Quran/tasbih/map tiles, welcome flow, install prompt |
| `/masjid` · `/masjid/[id]` · `/masjid/[id]/admin` | Map + list of masjids sorted by next Jamat; profile with Adhan vs Jamat table, Home/Work slots, reminders; admin publishes Jamat times |
| `/prayer` | Now/Next countdown (Ramadan: sehri/iftar), tap-to-track with streak and 7-day trend, per-prayer alert sheet (azan + minutes before), month calendar with Hijri dates, Islamic dates and sunnah fasts, midnight / last third, excused mode |
| `/qibla` | Full-screen compass |
| `/quran` | Surah / Juz / Page / Saved tabs, daily goal + streak, khatam planner, full-text verse search |
| `/quran/[id]` (`2`, `juz-3`, `page-45`) | Reader: translation or mushaf reading mode, word-by-word, tajweed colours, all Quran.com reciters and translations, repeat/range/speed, themes, memorise mode, share as image |
| `/library` | Hub: adhkar of the moment, hadith of the day, name of the day |
| `/library/duas/[slug]` · `/library/hadith` · `/library/names` · `/library/tasbih` · `/library/fasting` · `/library/zakat` | Duas with counters, hadith browser, 99 Names, tasbih, fasting log, zakat calculator |
| `/more` | Settings: location, calculation, notifications |

## Data sources (all free)

- **Prayer times, Hijri calendar, Qibla** — [Aladhan API](https://aladhan.com/prayer-times-api)
- **Masjid locations** — [OpenStreetMap](https://www.openstreetmap.org) via the Overpass API (`amenity=place_of_worship` + `religion=muslim`)
- **City search / reverse geocoding** — Nominatim (OpenStreetMap)
- **Map tiles** — OpenStreetMap standard tiles (attribution shown on the map)
- **Quran text, translations, tafsir, audio, search** — [Quran.com API v4](https://api-docs.quran.com)
- **Hadith** — [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api) on jsDelivr (public domain)
- **Duas & adhkar** — [fitrahive/dua-dhikr](https://github.com/fitrahive/dua-dhikr) (MIT), bundled in `data/dua/`
- **99 Names, Hijri conversion** — Aladhan

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
components/     TabBar (glass), PrayerHero, MasjidMap (Leaflet), QiblaCompass, AudioPlayer, prayer/, quran/, library/, home/
lib/            aladhan, overpass, jamat, reminders, alerts, tracker, hijri, quran, quranHabits, verseImage, dua, hadith, names, tasbih, fasting, zakat, location, prayer, storage
data/dua/       bundled dua JSON (MIT)
box/ server/    Masjid Live audio box (Raspberry Pi) and Icecast relay server
public/         manifest.json, sw.js, icons/
scripts/        make-icons.py (regenerates PNG icons with Pillow)
```

## Design language

Emerald `#0B3D33` · Gold `#C9A44C` (reserved for "the next thing") · Ivory `#F4F1EA` · Night `#0C1A17` for reading.
Fraunces for display, Plus Jakarta Sans for UI, Amiri for Arabic. Floating glass tab bar; bottom sheets in the thumb zone; 8-point-star geometry only as a low-opacity texture.
