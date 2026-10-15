const CACHE = "firegas-v5";
const ASSETS = ["./", "./index.html", "./style.css", "./ai.css", "./app.js", "./ai.js", "./manifest.json", "./icon.svg"];
const ASSET_PATHS = ASSETS.map(asset => new URL(asset, self.location.href).pathname);
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener("activate", event => event.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(key => key.startsWith("firegas-") && key !== CACHE).map(key => caches.delete(key))))
    .then(() => self.clients.claim())
));
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  const isFirebaseRequest =
    url.hostname === "identitytoolkit.googleapis.com" ||
    url.hostname.endsWith(".googleapis.com") ||
    url.hostname === "www.gstatic.com" ||
    url.hostname.endsWith(".firebasedatabase.app");

  if (request.method !== "GET" || isFirebaseRequest || url.origin !== self.location.origin) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok && ASSET_PATHS.includes(url.pathname)) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then(response => response || caches.match(url.pathname)))
  );
});
