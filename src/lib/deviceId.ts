const STORAGE_KEY = "kahy.device-id.v1";

/**
 * Anonymous, per-browser identifier used to link this device's data
 * (profile, screenings, chat memory, pet garden) to rows in the database.
 * There is no account system — this is not tied to a name, email or
 * password, and switching devices or clearing site data starts fresh.
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
