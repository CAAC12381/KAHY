export const COMPANION_REVEALS_KEY = "kahy.companion-reveals.v1";
export type CompanionBoxState = "closed" | "primed" | "opening" | "open";

export function advanceCompanionBox(state: CompanionBoxState, reducedMotion = false): CompanionBoxState {
  if (state === "closed") return "primed";
  if (state === "primed") return reducedMotion ? "open" : "opening";
  return state;
}

function revealId(deviceId: string, mascotId: string) {
  return `${deviceId}:${mascotId}`;
}

function readReveals() {
  try {
    const value = JSON.parse(window.localStorage.getItem(COMPANION_REVEALS_KEY) || "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function hasRevealedCompanion(deviceId: string, mascotId: string) {
  return readReveals().includes(revealId(deviceId, mascotId));
}

export function rememberCompanionReveal(deviceId: string, mascotId: string) {
  try {
    const next = new Set(readReveals());
    next.add(revealId(deviceId, mascotId));
    window.localStorage.setItem(COMPANION_REVEALS_KEY, JSON.stringify([...next]));
  } catch {
    // La revelación sigue funcionando durante la visita aunque el navegador bloquee el almacenamiento.
  }
}

export function forgetCompanionReveal(deviceId: string, mascotId: string) {
  try {
    const target = revealId(deviceId, mascotId);
    window.localStorage.setItem(COMPANION_REVEALS_KEY, JSON.stringify(readReveals().filter((item) => item !== target)));
  } catch {
    // El resto del borrado de perfil puede continuar si el almacenamiento no está disponible.
  }
}
