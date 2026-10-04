/**
 * Cuentas de KAHY (correo + contraseña) contra /api/auth.
 * La sesión es un token que el servidor entrega al registrarse o iniciar
 * sesión; se guarda en este navegador y dataApi.ts lo adjunta a cada
 * petición de datos. La contraseña nunca se guarda aquí.
 */

const SESSION_KEY = "kahy.session.v1";
export const SESSION_EXPIRED_EVENT = "kahy:session-expired";

export type Session = { token: string; email: string };

export type AuthFailure = "EMAIL_TAKEN" | "INVALID_CREDENTIALS" | "INVALID_EMAIL" | "WEAK_PASSWORD" | "RATE_LIMIT" | "UNAVAILABLE";
export type AuthResult =
  | { ok: true; session: Session; dataId: string }
  | { ok: false; code: AuthFailure; message: string };

export const MIN_PASSWORD_LENGTH = 8;

export function readSession(): Session | null {
  try {
    const data = JSON.parse(window.localStorage.getItem(SESSION_KEY) || "null") as Partial<Session> | null;
    return data && typeof data.token === "string" && typeof data.email === "string" ? { token: data.token, email: data.email } : null;
  } catch {
    return null;
  }
}

function saveSession(session: Session) {
  try { window.localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch { /* sin almacenamiento, la sesión dura lo que la pestaña */ }
}

export function clearSession() {
  try { window.localStorage.removeItem(SESSION_KEY); } catch { /* almacenamiento opcional */ }
}

/** Encabezado de autorización para las peticiones de datos; vacío si no hay sesión. */
export function authHeaders(): Record<string, string> {
  const session = readSession();
  return session ? { Authorization: `Bearer ${session.token}` } : {};
}

const unavailable: AuthResult = { ok: false, code: "UNAVAILABLE", message: "El servicio de cuentas no está disponible en este momento." };

async function request(action: "register" | "login", payload: Record<string, string>): Promise<AuthResult> {
  if (!navigator.onLine) return { ok: false, code: "UNAVAILABLE", message: "No hay conexión a internet." };
  try {
    const response = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await response.json().catch(() => ({})) as { token?: string; email?: string; dataId?: string; code?: string; error?: string };
    if (response.ok && data.token && data.email && data.dataId) {
      const session = { token: data.token, email: data.email };
      saveSession(session);
      return { ok: true, session, dataId: data.dataId };
    }
    const known: AuthFailure[] = ["EMAIL_TAKEN", "INVALID_CREDENTIALS", "INVALID_EMAIL", "WEAK_PASSWORD", "RATE_LIMIT"];
    const code = known.find((item) => item === data.code);
    return code ? { ok: false, code, message: data.error || "No se pudo completar la solicitud." } : unavailable;
  } catch {
    return unavailable;
  }
}

export function registerAccount(email: string, password: string, deviceId: string): Promise<AuthResult> {
  return request("register", { email, password, deviceId });
}

export function loginAccount(email: string, password: string): Promise<AuthResult> {
  return request("login", { email, password });
}

/** Invalida la sesión en el servidor (si responde) y la olvida en este navegador. */
export async function logoutAccount(): Promise<void> {
  const headers = authHeaders();
  clearSession();
  if (!headers.Authorization) return;
  try {
    await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify({ action: "logout" }) });
  } catch {
    // Sin conexión: el token deja de usarse aquí y vence solo en el servidor.
  }
}
