/**
 * Registro del service worker (public/sw.js) y lo que la app le pide.
 * Solo en producción: en desarrollo cada recarga debe traer el código nuevo.
 */

export const UPDATE_READY_EVENT = "kahy:update-ready";

const enabled = () => "serviceWorker" in navigator && import.meta.env.PROD;

export function registerOfflineApp() {
  if (!enabled()) return;
  // La primera instalación también cambia el controlador; solo hay "versión nueva" si ya había uno.
  // Se actualiza en cada cambio: en la primera visita no hay controlador, pero las versiones que
  // lleguen mientras la página sigue abierta sí deben avisarse.
  let controller = navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (controller) window.dispatchEvent(new Event(UPDATE_READY_EVENT));
    controller = navigator.serviceWorker.controller;
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).then((registration) => {
      // Una pestaña (o la app instalada) que queda abierta días también se entera de las versiones nuevas.
      let lastCheck = Date.now();
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible" || Date.now() - lastCheck < 30 * 60_000) return;
        lastCheck = Date.now();
        registration.update().catch(() => {});
      });
    }).catch(() => {
      // Si el navegador bloquea el service worker, KAHY sigue funcionando en línea.
    });
  });
}

/**
 * Pide guardar ya unas imágenes (las del acompañante elegido): así, si crece
 * o se pone triste mientras no hay internet, su imagen no aparece rota.
 * No lo hace si la persona activó el ahorro de datos del navegador.
 */
export function warmOfflineImages(urls: string[]) {
  if (!enabled() || !urls.length) return;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (connection?.saveData) return;
  navigator.serviceWorker.ready.then((registration) => registration.active?.postMessage({ type: "kahy:warm", urls })).catch(() => {});
}
