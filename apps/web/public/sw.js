const CACHE = "gym-tracker-v4";

// Only precache offline fallback assets, NOT HTML pages
const PRECACHE = ["/icons/icon-192.png", "/icons/icon-512.png", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  const isStaticAsset =
    url.pathname.startsWith("/_next/static/") ||
    /\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|webp)$/.test(url.pathname);

  if (isStaticAsset) {
    // Cache-first for content-addressed static assets
    e.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res && res.status === 200) {
            caches.open(CACHE).then((c) => c.put(request, res.clone()));
          }
          return res;
        });
      })
    );
  } else {
    // Network-first for all HTML pages — always fetch fresh, cache as offline fallback only
    e.respondWith(
      fetch(request)
        .then((res) => {
          if (res && res.status === 200) {
            caches.open(CACHE).then((c) => c.put(request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(request))
    );
  }
});
