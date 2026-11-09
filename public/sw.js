// StayCheck Service Worker: macht die App installierbar, startet schnell und zeigt offline eine freundliche Seite.
// Bewusst vorsichtig: Seiten immer frisch aus dem Netz (nie alte Daten), nur unveränderliche Dateien aus dem Speicher.
const VERSION = "sc-v1";
const STATIC = `${VERSION}-static`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/mark.svg", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // fremde Server (Karten, Supabase, Partner) nie anfassen

  // Seiten: immer aus dem Netz; nur ohne Netz die Offline-Seite
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL).then((r) => r || Response.error())));
    return;
  }

  // Unveränderliche Dateien (mit Versions-Hash im Namen) und Icons: aus dem Speicher, sonst laden und merken
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/maplibre/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok && res.type === "basic") {
              const copy = res.clone();
              caches.open(STATIC).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
  // Alles andere (Daten, APIs): normal übers Netz, nichts speichern
});
