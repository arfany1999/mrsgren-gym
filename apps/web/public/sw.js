/* GYM Tracker — Offline-first service worker.
 * Strategies:
 *   - Precache core app-shell routes + offline fallback at install.
 *   - Cache-first for content-addressed static assets (/_next/static/, images, fonts).
 *   - Network-first with cache fallback for HTML pages.
 *   - Stale-while-revalidate for Supabase REST reads (so last-seen data is served offline).
 *   - POST/PUT/PATCH/DELETE to Supabase pass through — the in-app offlineQueue handles retries.
 */

const CACHE = "gym-tracker-v8";
const API_CACHE = "gym-supabase-v2";

// Precache shell HTML for every primary route — lets the app boot fully offline on repeat launch.
const APP_SHELL_ROUTES = [
  "/",
  "/dashboard",
  "/profile",
  "/exercises",
  "/routines",
  "/routines/new",
  "/active",
  "/calendar",
  "/statistics",
  "/measures",
  "/login",
  "/offline",
];

const PRECACHE = [
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/manifest.json",
  "/avatar-default.jpg",
  "/trophies/bronze.svg",
  "/trophies/silver.svg",
  "/trophies/gold.svg",
  "/trophies/ice.svg",
  "/trophies/diamond.svg",
  ...APP_SHELL_ROUTES,
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then(async (c) => {
      // Add one-by-one so a single 404 doesn't abort the whole install.
      await Promise.all(
        PRECACHE.map((url) =>
          c.add(url).catch(() => {
            /* noop — some routes may 404 on first deploy; they'll populate on visit */
          })
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

function isSupabaseApi(url) {
  return url.hostname.endsWith(".supabase.co") && url.pathname.includes("/rest/v1/");
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    /\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2|webp|mp3|mp4)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  if (request.method !== "GET") return; // writes pass through; offlineQueue handles failures

  // Supabase: stale-while-revalidate so we always show cached data when offline
  if (isSupabaseApi(url)) {
    e.respondWith(
      caches.open(API_CACHE).then(async (c) => {
        const cached = await c.match(request);
        const fetchPromise = fetch(request)
          .then((res) => {
            if (res && res.status === 200) c.put(request, res.clone());
            return res;
          })
          .catch(() => cached); // network failed -> use cache
        return cached || fetchPromise;
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (isStaticAsset(url)) {
    // Cache-first for content-addressed assets
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
    return;
  }

  // HTML pages: network-first, cache fallback, offline-route fallback
  e.respondWith(
    fetch(request)
      .then((res) => {
        if (res && res.status === 200) {
          caches.open(CACHE).then((c) => c.put(request, res.clone()));
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        // Fallback for uncached routes — offline page
        const offline = await caches.match("/offline");
        return offline || new Response("Offline", { status: 503 });
      })
  );
});

// Allow the page to trigger a cache refresh (e.g. after deploy)
self.addEventListener("message", (e) => {
  if (e.data?.type === "SKIP_WAITING") self.skipWaiting();
});
