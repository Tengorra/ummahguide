/* UmmahGuide service worker — app shell cached, pages network-first, API responses cached for offline reading. */
const VERSION = "ug-v1";
const SHELL = ["/", "/masjid", "/quran", "/prayer", "/more", "/manifest.json", "/icons/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const API_HOSTS = ["api.quran.com", "verses.quran.com", "api.aladhan.com", "tile.openstreetmap.org", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Static assets and API data: cache-first with background refresh.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || API_HOSTS.includes(url.hostname)) {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const hit = await cache.match(req);
        const fetching = fetch(req)
          .then((res) => {
            if (res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || fetching;
      }),
    );
    return;
  }

  // Pages: network-first, fall back to cache, then to the home shell.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("/"))),
    );
  }
});
