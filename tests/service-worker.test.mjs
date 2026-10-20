// Pruebas del service worker (public/sw.js) en una simulación: sin navegador, con la red y las
// cachés reemplazadas. Un error aquí puede dejar la app sin abrir para quien ya la instaló, por
// eso se prueban los casos de conexión que importan: con red, sin red, red lenta y juegos.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const ORIGIN = "https://kahy.test";
const source = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8")
  .replace('const VERSION = "dev";', 'const VERSION = "v-prueba";')
  .replace("const PRECACHE = [];", 'const PRECACHE = ["/assets/index-abc.js", "/assets/index-abc.css"];');

const href = (input) => new URL(typeof input === "string" ? input : input.url, ORIGIN).href;

function createWorker({ existingCaches = [] } = {}) {
  const stores = new Map(existingCaches.map((name) => [name, new Map()]));
  const network = { online: true, delayMs: 0, files: new Map(), requests: [] };
  const handlers = {};

  const openStore = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    return {
      async match(request) { return store.get(href(request))?.clone(); },
      async put(request, response) { store.set(href(request), response.clone()); },
      async add(request) {
        const response = await fakeFetch(request);
        if (!response.ok) throw new Error("respuesta no válida");
        store.set(href(request), response);
      },
      async keys() { return [...store.keys()].map((url) => ({ url })); },
      async delete(request) { return store.delete(href(request)); },
    };
  };

  async function fakeFetch(request) {
    const url = href(request);
    network.requests.push(url);
    if (network.delayMs) await new Promise((resolve) => setTimeout(resolve, network.delayMs));
    if (!network.online) throw new TypeError("Failed to fetch");
    const body = network.files.get(url);
    return body === undefined ? new Response("no existe", { status: 404 }) : new Response(body, { status: 200 });
  }

  class FakeRequest {
    constructor(input, init = {}) {
      this.url = href(input);
      this.method = "GET";
      this.mode = init.mode ?? "cors";
    }
  }

  const self = {
    registration: { scope: `${ORIGIN}/` },
    location: { origin: ORIGIN },
    clients: { claim: async () => {} },
    skipWaiting: async () => {},
    addEventListener: (type, handler) => { handlers[type] = handler; },
  };
  const caches = {
    open: async (name) => openStore(name),
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
  };
  vm.runInNewContext(source, { self, caches, fetch: fakeFetch, Request: FakeRequest, Response, URL, Set, Promise, setTimeout, console });

  async function lifecycle(type, extra = {}) {
    const pending = [];
    handlers[type]({ ...extra, waitUntil: (promise) => pending.push(promise) });
    await Promise.all(pending);
  }

  async function request(path, mode = "no-cors") {
    let response;
    const pending = [];
    handlers.fetch({ request: { url: href(path), method: "GET", mode }, respondWith: (value) => { response = value; }, waitUntil: (promise) => pending.push(promise) });
    if (!response) return null; // El service worker no intervino: el navegador va directo a la red.
    const result = await response;
    await Promise.all(pending);
    return result;
  }

  return { network, stores, lifecycle, request, cached: (name, path) => stores.get(name)?.has(href(path)) ?? false };
}

async function installedWorker(options) {
  const worker = createWorker(options);
  worker.network.files.set(`${ORIGIN}/`, "<html>app v1</html>");
  worker.network.files.set(`${ORIGIN}/assets/index-abc.js`, "console.log('app')");
  worker.network.files.set(`${ORIGIN}/assets/index-abc.css`, "body{}");
  await worker.lifecycle("install");
  await worker.lifecycle("activate");
  return worker;
}

test("al instalarse guarda la app completa y borra las cachés de versiones anteriores", async () => {
  const worker = await installedWorker({ existingCaches: ["kahy-offline-v2", "kahy-shell-vieja", "kahy-media-v1", "otra-app"] });
  for (const path of ["/", "/assets/index-abc.js", "/assets/index-abc.css"]) assert.ok(worker.cached("kahy-shell-v-prueba", path), path);
  assert.deepEqual([...worker.stores.keys()].sort(), ["kahy-media-v1", "kahy-shell-v-prueba", "otra-app"]);
});

test("sin conexión abre la app guardada, en cualquier ruta", async () => {
  const worker = await installedWorker();
  worker.network.online = false;
  const response = await worker.request("/actividades", "navigate");
  assert.equal(await response.text(), "<html>app v1</html>");
});

test("con conexión trae la versión nueva de la página y la guarda", async () => {
  const worker = await installedWorker();
  worker.network.files.set(`${ORIGIN}/`, "<html>app v2</html>");
  assert.equal(await (await worker.request("/", "navigate")).text(), "<html>app v2</html>");
  worker.network.online = false;
  assert.equal(await (await worker.request("/", "navigate")).text(), "<html>app v2</html>");
});

test("con señal muy lenta no deja esperando: abre la copia guardada", async () => {
  const worker = await installedWorker();
  worker.network.delayMs = 6000;
  const started = Date.now();
  const response = await worker.request("/", "navigate");
  assert.equal(await response.text(), "<html>app v1</html>");
  assert.ok(Date.now() - started < 5000, "debió responder con la copia antes de que llegara la red");
});

test("un juego que nunca se abrió muestra una página que lo explica, y uno ya abierto funciona sin red", async () => {
  const worker = await installedWorker();
  worker.network.files.set(`${ORIGIN}/games/burbuja/index.html`, "<html>juego</html>");
  assert.equal(await (await worker.request("/games/burbuja/index.html", "navigate")).text(), "<html>juego</html>");
  worker.network.online = false;
  assert.equal(await (await worker.request("/games/burbuja/index.html", "navigate")).text(), "<html>juego</html>");
  const missing = await worker.request("/games/nubes/index.html", "navigate");
  assert.equal(missing.status, 503);
  assert.match(await missing.text(), /Este juego aún no está guardado/);
});

test("un juego nunca reemplaza a la app guardada", async () => {
  const worker = await installedWorker();
  worker.network.files.set(`${ORIGIN}/games/burbuja/index.html`, "<html>juego</html>");
  await worker.request("/games/burbuja/index.html", "navigate");
  worker.network.online = false;
  assert.equal(await (await worker.request("/", "navigate")).text(), "<html>app v1</html>");
});

test("las imágenes se guardan al usarse y se muestran sin conexión", async () => {
  const worker = await installedWorker();
  worker.network.files.set(`${ORIGIN}/assets/pets/vaca.jpg`, "imagen");
  assert.equal(await (await worker.request("/assets/pets/vaca.jpg")).text(), "imagen");
  worker.network.online = false;
  assert.equal(await (await worker.request("/assets/pets/vaca.jpg")).text(), "imagen");
});

test("el JS y el CSS del build salen de la caché aunque no haya red", async () => {
  const worker = await installedWorker();
  worker.network.online = false;
  assert.equal(await (await worker.request("/assets/index-abc.js")).text(), "console.log('app')");
});

test("la app puede pedir que se guarden ya las imágenes del acompañante", async () => {
  const worker = await installedWorker();
  worker.network.files.set(`${ORIGIN}/assets/pets/pollito-2.jpg`, "etapa 2");
  await worker.lifecycle("message", { data: { type: "kahy:warm", urls: ["/assets/pets/pollito-2.jpg", "https://otro.sitio/x.jpg"] } });
  assert.ok(worker.cached("kahy-media-v1", "/assets/pets/pollito-2.jpg"));
  assert.ok(!worker.network.requests.includes("https://otro.sitio/x.jpg"), "no debe descargar de otros sitios");
});

test("no intercepta la API ni otros sitios", async () => {
  const worker = await installedWorker();
  assert.equal(await worker.request("/api/kahy/chat"), null);
  assert.equal(await worker.request("https://fonts.example/font.woff2"), null);
});
