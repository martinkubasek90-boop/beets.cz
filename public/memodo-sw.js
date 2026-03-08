const SW_VERSION = new URL(self.location.href).searchParams.get("v") || "v2";
const CACHE_NAME = `memodo-${SW_VERSION}`;
const APP_SHELL = [
  "/Memodo/akcni-produkty",
  "/Memodo/katalog",
  "/Memodo/poptavka",
  "/memodo-apple-touch-icon-v2.png",
  "/memodo-icon-blue-192.png",
  "/memodo-icon-blue-512.png",
  "/favicon-48x48.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  const isMemodoPath = url.pathname.startsWith("/Memodo");
  const isMemodoApi = url.pathname.startsWith("/api/memodo/");
  if (!isMemodoPath && !isMemodoApi) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match("/Memodo/akcni-produkty");
        }),
    );
    return;
  }

  if (isMemodoApi) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || new Response(JSON.stringify({ ok: false, offline: true }), { status: 503 });
        }),
    );
    return;
  }

  // Default dynamic strategy for Memodo app data/assets: network-first.
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response("Offline", { status: 503 });
      }),
  );
});
