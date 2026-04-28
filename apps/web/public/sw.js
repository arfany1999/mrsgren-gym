/* GYM Tracker — Offline-first service worker.
 * Strategies:
 *   - Precache core app-shell routes + offline fallback at install.
 *   - Cache-first for content-addressed static assets (/_next/static/, images, fonts).
 *   - Network-first with cache fallback for HTML pages.
 *   - Stale-while-revalidate for Supabase REST reads (so last-seen data is served offline).
 *   - POST/PUT/PATCH/DELETE to Supabase pass through — the in-app offlineQueue handles retries.
 */

const CACHE = "gym-tracker-v11";
const API_CACHE = "gym-supabase-v2";

// Precache shell HTML for every primary route — lets the app boot fully offline on repeat launch.
const APP_SHELL_ROUTES = [
  "/",
  "/dashboard",
  "/profile",
  "/workouts",
  "/exercises",
  "/routines",
  "/routines/new",
  "/active",
  "/calendar",
  "/statistics",
  "/measures",
  "/login",
  "/register",
  "/onboarding",
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

// Pull every <script src> and <link href .css> URL out of an HTML string so
// we can precache the Next.js chunks the cached HTML actually references.
// Without this the v8 → v9 bump nuked the old cache, leaving the new cache
// with HTML that pointed at chunks that weren't cached anywhere — the page
// would load offline but couldn't hydrate.
function discoverAssetUrls(html) {
  const urls = new Set();
  const scriptRe = /<script[^>]+src="([^"]+)"/g;
  const linkRe   = /<link[^>]+href="([^"]+\.(?:css|woff2?|ttf|otf))"/g;
  const imgRe    = /<img[^>]+src="([^"]+\.(?:png|jpg|jpeg|svg|webp))"/g;
  let m;
  while ((m = scriptRe.exec(html))) urls.add(m[1]);
  while ((m = linkRe.exec(html)))   urls.add(m[1]);
  while ((m = imgRe.exec(html)))    urls.add(m[1]);
  return Array.from(urls).filter((u) => u.startsWith("/") || u.startsWith(self.location.origin));
}

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then(async (c) => {
      // Phase 1 — fetch each app-shell route fresh and store both the
      // response and the asset URLs it references.
      const htmlByRoute = new Map();
      await Promise.all(
        APP_SHELL_ROUTES.map(async (route) => {
          try {
            const res = await fetch(route, { cache: "reload" });
            if (!res || res.status !== 200) return;
            // Clone twice: one for caching, one to read the body.
            await c.put(route, res.clone());
            const html = await res.text();
            htmlByRoute.set(route, html);
          } catch {
            /* noop — populate on first visit */
          }
        })
      );

      // Phase 2 — every static asset (icons, trophies, manifest, fonts).
      await Promise.all(
        PRECACHE.filter((u) => !APP_SHELL_ROUTES.includes(u)).map((url) =>
          c.add(url).catch(() => {})
        )
      );

      // Phase 3 — discover Next.js chunks + CSS bundles referenced by the
      // cached HTML and precache those too. This is what makes the app
      // hydrate offline. Without these the cached HTML loads but has no
      // JS to run.
      const assetUrls = new Set();
      for (const html of htmlByRoute.values()) {
        for (const u of discoverAssetUrls(html)) assetUrls.add(u);
      }
      await Promise.all(
        Array.from(assetUrls).map((u) => c.add(u).catch(() => {}))
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
