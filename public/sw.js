/**
 * Service Worker – macht die App installierbar und offline-fähig (App-Shell).
 *
 * Strategie: "network-first" für eigene Dateien – es wird immer zuerst die
 * aktuelle Version aus dem Netz geladen und der Cache aktualisiert; nur wenn
 * kein Netz da ist, kommt die zwischengespeicherte Version zum Einsatz.
 * So werden Code-Änderungen sofort sichtbar (kein "alte Version klebt fest").
 *
 * Der API-Abruf /api/wetter wird NIE zwischengespeichert.
 */

const CACHE = 'richtig-lueften-v2';
const SHELL = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/js/ui.js',
  '/js/calc.js',
  '/js/weather.js',
  '/js/settings.js',
  '/icon.svg',
  '/manifest.webmanifest',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting(); // neue Version sofort übernehmen
});

self.addEventListener('activate', (event) => {
  // Alte Caches (z. B. v1) aufräumen.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Nur GET-Anfragen behandeln; API-Abrufe immer direkt ans Netz.
  if (event.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;

  // network-first: zuerst Netz, Cache aktualisieren; sonst Cache als Reserve.
  event.respondWith(
    fetch(event.request)
      .then((antwort) => {
        const kopie = antwort.clone();
        caches.open(CACHE).then((c) => c.put(event.request, kopie)).catch(() => {});
        return antwort;
      })
      .catch(() => caches.match(event.request))
  );
});
