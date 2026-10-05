import { createContext, useContext, useEffect, useRef } from "react";

export type BackEntry = { label: string; onBack: () => void };
export type BackRegistry = { set: (level: number, entry: BackEntry | null) => void };

/**
 * Lo provee AppShell. Con él, cualquier pantalla que tenga un "nivel
 * interior" (una actividad abierta, un cuestionario en curso, una tarea)
 * puede pedir que la barra superior muestre su flecha de regreso, que
 * permanece visible aunque la persona baje por la página.
 */
export const BackNavigationContext = createContext<BackRegistry | null>(null);

/**
 * Muestra "← label" en la barra superior mientras `active` sea verdadero y
 * lo retira al desactivarse o al salir de la pantalla.
 *
 * `level` ordena los niveles anidados: gana el más alto. Actividades usa 1
 * ("Todas las actividades") y, dentro de Desglosar una tarea, 2 ("Mis
 * tareas"), de modo que la flecha siempre regresa un solo paso.
 */
export function useBackNavigation(level: number, label: string, onBack: () => void, active = true) {
  const registry = useContext(BackNavigationContext);
  const handler = useRef(onBack);
  handler.current = onBack;

  useEffect(() => {
    if (!registry || !active) return;
    registry.set(level, { label, onBack: () => handler.current() });
    return () => registry.set(level, null);
  }, [registry, level, label, active]);
}
