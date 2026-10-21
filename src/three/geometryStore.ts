import * as THREE from "three";

/**
 * Guarda en este dispositivo (IndexedDB) las piezas ya esculpidas de un
 * compañero, para que la sección 3D abra al instante también después de
 * recargar la página. Esculpir tarda alrededor de un segundo (más en
 * teléfonos); leer de aquí, unos milisegundos.
 *
 * La clave incluye una huella del código del modelo: si alguien cambia la
 * forma o los colores, la huella cambia y se vuelve a esculpir solo.
 * Cualquier falla (modo privado, sin espacio) se ignora: simplemente se esculpe.
 */

const DB_NAME = "kahy-3d";
const STORE = "geometries";

// Se guardan todos los atributos (posición, normal, color, pelo…) para no olvidar ninguno nuevo.
type StoredGeometry = { attributes: Record<string, { array: Float32Array; itemSize: number }>; index: Uint32Array };

/**
 * Abre el almacén, o null si no está disponible. Con límite de tiempo: si el navegador tarda
 * (otra pestaña lo tiene ocupado, almacenamiento trabado), se sigue sin él en vez de dejar a
 * Moka en "Preparando…" para siempre.
 */
function openStore(timeoutMs = 1500): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (db: IDBDatabase | null) => {
      if (settled) {
        db?.close();
        return;
      }
      settled = true;
      window.clearTimeout(timer);
      resolve(db);
    };
    const timer = window.setTimeout(() => finish(null), timeoutMs);
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => finish(request.result);
      request.onerror = () => finish(null);
      request.onblocked = () => finish(null);
    } catch {
      finish(null);
    }
  });
}

/** Igual que `done`, pero se rinde (null) si la lectura no termina a tiempo. */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(null), timeoutMs);
    promise.then((value) => { window.clearTimeout(timer); resolve(value); }, () => { window.clearTimeout(timer); resolve(null); });
  });
}

function done<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Huella corta (djb2) del texto que describe un modelo. */
export function fingerprint(text: string) {
  let hash = 5381;
  for (let index = 0; index < text.length; index++) hash = ((hash << 5) + hash + text.charCodeAt(index)) | 0;
  return (hash >>> 0).toString(36);
}

export async function loadGeometries(key: string): Promise<THREE.BufferGeometry[] | null> {
  const db = await openStore();
  if (!db) return null;
  try {
    const stored = await withTimeout(done(db.transaction(STORE, "readonly").objectStore(STORE).get(key)), 3000) as StoredGeometry[] | null | undefined;
    if (!Array.isArray(stored) || !stored.every((item) => item?.attributes?.position && item.index)) return null;
    return stored.map((item) => {
      const geometry = new THREE.BufferGeometry();
      for (const [name, attribute] of Object.entries(item.attributes)) geometry.setAttribute(name, new THREE.BufferAttribute(attribute.array, attribute.itemSize));
      geometry.setIndex(new THREE.BufferAttribute(item.index, 1));
      geometry.computeBoundingSphere();
      return geometry;
    });
  } catch {
    return null;
  } finally {
    db.close();
  }
}

/** Guarda las piezas y borra versiones viejas del mismo compañero (las claves que empiezan igual). */
export async function saveGeometries(key: string, prefix: string, geometries: THREE.BufferGeometry[]) {
  const db = await openStore();
  if (!db) return;
  try {
    const store = db.transaction(STORE, "readwrite").objectStore(STORE);
    const keys = await done(store.getAllKeys());
    for (const old of keys) if (typeof old === "string" && old.startsWith(prefix) && old !== key) store.delete(old);
    const data: StoredGeometry[] = geometries.map((geometry) => ({
      attributes: Object.fromEntries(Object.entries(geometry.attributes).map(([name, attribute]) => [name, { array: attribute.array as Float32Array, itemSize: attribute.itemSize }])),
      index: geometry.index!.array as Uint32Array,
    }));
    await done(store.put(data, key));
  } catch {
    // Sin espacio o en modo privado: la próxima vez se vuelve a esculpir.
  } finally {
    db.close();
  }
}
