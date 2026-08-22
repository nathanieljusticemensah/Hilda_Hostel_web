// Minimal service worker: caches the app shell so the site still loads
// (with stale content) when a resident has no connection at all.
// This is deliberately simple -- it is NOT trying to cache Supabase API
// responses or make the app fully offline-functional, just to stop a
// blank/error screen when network drops, per the SRS offline-tolerance
// requirement. Live data (utilities, tickets) still relies on the
// localStorage cache already built into LiveUtilities.tsx.

const CACHE_NAME = "hilda-hostel-shell-v1";
const APP_SHELL = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only handle GET requests for our own origin -- never intercept
  // Supabase/ImageKit API calls, those must always hit the network
  // (or fail loudly) so data stays correct.
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/")))
  );
});