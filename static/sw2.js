const cacheName = "buildTimestamp"; // this gets replaced by the build script

self.addEventListener("install", (e) => {
  console.log("[Service Worker] Install", cacheName);
});
self.addEventListener('message', function (e) {
  if (e.data.update) {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (e) => {
  const url = e.request.url;
  // Cache http and https only, skip unsupported chrome-extension:// and file://...
  if (!(url.startsWith('http:') || url.startsWith('https:'))) {
    return;
  }
  // Do not cache/route media: range requests must go straight to the server so
  // the browser can stream and seek instead of buffering the whole file.
  const isMedia = e.request.destination === "audio" || e.request.destination === "video"
    || /\.(mp3|m4a|ogg|wav|flac|aac|opus)(\?|$)/i.test(url)
    || e.request.headers.has("range");
  if (isMedia) {
    return;
  }
  e.respondWith(
    (async () => {
      const cache = await caches.open(cacheName);
      const r = await cache.match(e.request);
      console.log(`[Service Worker] Fetching resource: ${url}`);
      if (r) {
        return r;
      }
      const response = await fetch(e.request);
      console.log(`[Service Worker] Caching new resource: ${url}`);
      cache.put(e.request, response.clone());
      return response;
    })(),
  );
  self.clients.matchAll().then(clients => {
    clients.forEach(client => client.postMessage({ event: "activate", version: cacheName }));
  });
});

self.addEventListener("activate", (e) => {
  console.log("[Service Worker] Activated", cacheName);
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key === cacheName) {
            return;
          }
          return caches.delete(key);
        }),
      );
    }),
  );
});
