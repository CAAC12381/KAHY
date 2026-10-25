/**
 * Bandeja de cambios por sincronizar con la base de datos.
 *
 * Antes, cada guardado remoto era "disparar y olvidar": si no había
 * internet (o el servidor fallaba) ese cambio nunca llegaba a la nube,
 * aunque sí quedara en este dispositivo. Ahora todo guardado entra aquí
 * primero, se envía en orden y, si falla por algo pasajero (sin red, 5xx,
 * 429), espera en localStorage hasta que vuelva la conexión.
 *
 * - Cada cambio tiene una clave: un cambio nuevo con la misma clave
 *   reemplaza al pendiente (solo importa el último estado del perfil, de un
 *   plan, de un día de hábitos…). Una clave que termina en ":clear" borra
 *   los pendientes de esa familia, y "all" (borrar todo) los de todas.
 * - Un 4xx no se reintenta: la petición está mal o no tiene permiso.
 * - Cada cambio recuerda el deviceId con que se creó. Si al enviarlo este
 *   navegador ya apunta a otros datos (inició sesión en otra cuenta, cerró
 *   sesión), se descarta: nunca se mezclan datos de dos personas.
 * - La clave empieza con "kahy.", así que "Salir" la borra junto con lo demás.
 * - Sin sesión no se encola nada: quien usa KAHY sin cuenta lo usa solo en su
 *   dispositivo (el servidor tampoco aceptaría esos datos). Al crear la cuenta,
 *   App.tsx sube lo que ya había en el dispositivo.
 */

import { getDeviceId } from "../lib/deviceId";
import { authHeaders, clearSession, SESSION_EXPIRED_EVENT } from "./authApi";

const STORAGE_KEY = "kahy.sync-outbox.v1";
const MAX_ITEMS = 200;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const SYNC_CHANGED_EVENT = "kahy:sync-changed";

type OutboxItem = { key: string; deviceId: string; url: string; method: string; body?: string; at: number };

let memoryQueue: OutboxItem[] = [];

function read(): OutboxItem[] {
  try {
    const data = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]") as unknown;
    return Array.isArray(data) ? data.filter((item): item is OutboxItem => Boolean(item) && typeof item.key === "string" && typeof item.url === "string") : [];
  } catch {
    return memoryQueue;
  }
}

function write(queue: OutboxItem[]) {
  memoryQueue = queue;
  try {
    if (queue.length) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Sin almacenamiento: la bandeja vive solo mientras la pestaña siga abierta.
  }
  window.dispatchEvent(new Event(SYNC_CHANGED_EVENT));
}

export function pendingSyncCount(): number {
  return read().length;
}

export function enqueueSync(key: string, deviceId: string, url: string, init: { method: string; body?: unknown }) {
  if (!authHeaders().Authorization) return;
  const family = key.endsWith(":clear") ? key.slice(0, -"clear".length) : null;
  const kept = read().filter((item) => {
    if (key === "all") return false;
    if (family) return !item.key.startsWith(family);
    return item.key !== key;
  });
  kept.push({ key, deviceId, url, method: init.method, body: init.body === undefined ? undefined : JSON.stringify(init.body), at: Date.now() });
  write(kept.slice(-MAX_ITEMS));
  void flushSync();
}

type SendResult = "done" | "retry";

async function send(item: OutboxItem): Promise<SendResult> {
  if (item.deviceId !== getDeviceId() || Date.now() - item.at > MAX_AGE_MS) return "done";
  if (!navigator.onLine) return "retry";
  try {
    const session = authHeaders();
    if (!session.Authorization) return "done"; // Pendiente de antes de cerrar sesión: ya no le corresponde a nadie.
    const response = await fetch(item.url, {
      method: item.method,
      headers: { ...(item.body ? { "Content-Type": "application/json" } : {}), ...session },
      body: item.body,
    });
    if (response.status === 401 && session.Authorization) {
      clearSession();
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    if (response.ok) return "done";
    return response.status >= 500 || response.status === 429 || response.status === 408 ? "retry" : "done";
  } catch {
    return "retry";
  }
}

let flushing: Promise<void> | null = null;

/** Envía los pendientes en orden; se detiene en el primero que deba esperar. */
export function flushSync(): Promise<void> {
  if (flushing) return flushing;
  flushing = (async () => {
    try {
      for (let guard = 0; guard < MAX_ITEMS; guard++) {
        const [first] = read();
        if (!first) return;
        if (await send(first) === "retry") return;
        // Se vuelve a leer: mientras se enviaba pudo llegar otro cambio (que quizá reemplazó a este).
        write(read().filter((item) => !(item.key === first.key && item.at === first.at)));
      }
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

let started = false;

/** Reintenta al volver la conexión, al regresar a la pestaña y cada minuto mientras haya pendientes. */
export function startSyncOutbox() {
  if (started) return;
  started = true;
  const retry = () => {
    if (navigator.onLine && read().length) void flushSync();
  };
  window.addEventListener("online", retry);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") retry();
  });
  window.setInterval(retry, 60_000);
  retry();
}
