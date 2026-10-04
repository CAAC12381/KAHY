// v2: la v1 podía guardar la página de un juego como si fuera la app (ver "navigate" más abajo).
// Cambiar el nombre hace que al activarse se borre la copia anterior.
const CACHE_NAME = "kahy-offline-v2";
const APP_SHELL = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("kahy-offline-") && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    // Los juegos de /games/ también llegan como navegaciones (dentro de un iframe o en otra pestaña).
    // Cada juego se guarda bajo su propia dirección; solo la app se guarda como "/", que es lo que
    // se muestra sin conexión. Las respuestas con error no se guardan.
    const isGame = url.pathname.startsWith("/games/");
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(isGame ? request : "/", copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(request)) || (!isGame && (await caches.match("/"))) || Response.error()),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    })),
  );
});
