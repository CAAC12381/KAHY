const STORAGE_KEY = "kahy.device-id.v1";

/**
 * Identifier used to link this browser's data (profile, screenings, chat
 * memory, pet garden…) to rows in the database. It starts as an anonymous,
 * per-browser id. When someone creates an account, the account claims that
 * id; when they sign in on another device, setDeviceId() switches this
 * browser to the account's id so the same data loads there too.
 */
export function getDeviceId(): string {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const fresh = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, fresh);
    return fresh;
  } catch {
    // Sin almacenamiento local disponible: identificador de un solo uso para esta sesión.
    return crypto.randomUUID();
  }
}

export function setDeviceId(id: string): void {
  try { window.localStorage.setItem(STORAGE_KEY, id); } catch { /* almacenamiento opcional */ }
}

/** New anonymous id — after signing out or deleting an account, so this browser stops pointing at that account's data. */
export function resetDeviceId(): string {
  const fresh = crypto.randomUUID();
  setDeviceId(fresh);
  return fresh;
}
