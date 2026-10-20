/*
 * Service worker de KAHY: abre la app y su motor conversacional local sin conexión.
 *
 * Dos cachés:
 * - "kahy-shell-<versión>": la app (index.html, el JS y el CSS del build, ícono y manifiesto). Se
 *   descarga completa al instalar, así que basta UNA visita con internet para que todo abra después
 *   sin conexión. Cada build trae su versión; al activarse, se borra la anterior.
 * - "kahy-media-v1": imágenes y juegos, guardados al usarse. Sobrevive a las versiones y tiene tope.
 *
 * VERSION y PRECACHE los completa el build (vite.config.ts, kahyOfflineBuild). En desarrollo el
 * service worker no se registra, por eso aquí quedan vacíos.
 */
const VERSION = "dev";
const PRECACHE = [];

const BASE = new URL(self.registration.scope).pathname;
const SHELL_CACHE = `kahy-shell-${VERSION}`;
const MEDIA_CACHE = "kahy-media-v1";
const MEDIA_LIMIT = 150;
// Con señal débil no se espera más que esto por la página: se abre la copia guardada.
const NAVIGATION_TIMEOUT_MS = 3500;
const PRECACHED = new Set(PRECACHE.map((path) => new URL(path, self.location.origin).href));

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // Uno por uno: si falla un archivo opcional, el resto igual queda guardado.
    await Promise.all([BASE, ...PRECACHE].map((path) => cache.add(new Request(path, { cache: "reload" })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith("kahy-") && key !== SHELL_CACHE && key !== MEDIA_CACHE).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith(`${BASE}api/`)) return;

  if (request.mode === "navigate") {
    // Los juegos llegan como navegaciones (dentro de un iframe); se guardan bajo su propia dirección.
    if (url.pathname.startsWith(`${BASE}games/`)) event.respondWith(gamePage(request));
    else event.respondWith(appPage(request));
    return;
  }

  if (PRECACHED.has(url.href)) {
    event.respondWith(cacheFirst(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(request, event));
});

/** Pide a este service worker guardar ya ciertas imágenes (las del acompañante elegido). */
self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "kahy:warm" || !Array.isArray(data.urls)) return;
  event.waitUntil((async () => {
    const cache = await caches.open(MEDIA_CACHE);
    for (const raw of data.urls.slice(0, 20)) {
      const url = new URL(raw, self.location.origin);
      if (url.origin !== self.location.origin || (await cache.match(url.href))) continue;
      try {
        const response = await fetch(url.href);
        if (response.ok) await cache.put(url.href, response);
      } catch {
        return; // Sin conexión: se intentará en otra visita.
      }
    }
    await trimMedia(cache);
  })());
});

async function appPage(request) {
  const cache = await caches.open(SHELL_CACHE);
  const network = fetch(request).then((response) => {
    if (response.ok) cache.put(BASE, response.clone());
    return response;
  });
  const cached = await cache.match(BASE);
  if (!cached) return network.catch(() => offlinePage("KAHY necesita conexión la primera vez", "Abre KAHY una vez con internet y después podrás usarla sin conexión en este dispositivo."));
  // Con copia guardada: la red tiene unos segundos; si tarda o falla, se abre la copia.
  const timeout = new Promise((resolve) => setTimeout(() => resolve(cached), NAVIGATION_TIMEOUT_MS));
  return Promise.race([network.catch(() => cached), timeout]);
}

async function gamePage(request) {
  const cache = await caches.open(MEDIA_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || offlinePage("Este juego aún no está guardado", "Ábrelo una vez con internet y después podrás jugarlo sin conexión.");
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

/** Imágenes, juegos y demás: responde con lo guardado (si hay) y lo actualiza en segundo plano. */
async function staleWhileRevalidate(request, event) {
  const cache = await caches.open(MEDIA_CACHE);
  const cached = await cache.match(request);
  const update = fetch(request).then(async (response) => {
    if (response.ok && response.status !== 206) {
      await cache.put(request, response.clone());
      await trimMedia(cache);
    }
    return response;
  });
  if (cached) {
    event.waitUntil(update.catch(() => {}));
    return cached;
  }
  return update.catch(() => Response.error());
}

async function trimMedia(cache) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MEDIA_LIMIT)).map((key) => cache.delete(key)));
}

function offlinePage(title, message) {
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;box-sizing:border-box;background:#f8f6f0;color:#3f4139;font-family:Inter,"Segoe UI",system-ui,sans-serif;text-align:center}
main{max-width:420px}h1{margin:0 0 10px;color:#684d72;font-size:1.3rem}p{margin:0 0 18px;line-height:1.5}button{min-height:44px;padding:0 20px;border:0;border-radius:999px;background:#684d72;color:#fff;font:inherit;font-weight:700}</style></head>
<body><main><h1>${title}</h1><p>${message}</p><button onclick="location.reload()">Reintentar</button></main></body></html>`;
  return new Response(html, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
}
