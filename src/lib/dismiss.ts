import { useEffect, useRef, type RefObject } from "react";

/**
 * Cierra un panel al tocar o hacer clic fuera de él.
 *
 * `inside` son los elementos que NO cuentan como "fuera": el propio panel y,
 * si lo hay, el botón que lo abre (para que ese botón siga alternando en
 * vez de cerrar y reabrir). El toque sí llega a lo que había debajo, así que
 * un solo toque puede cerrar el panel y, por ejemplo, cambiar de sección.
 *
 * Se decide al soltar, no al tocar: si el dedo se movió (la persona estaba
 * desplazando la página) o el navegador canceló el gesto, no se cierra.
 */
export function useDismissOnOutside(inside: Array<RefObject<HTMLElement | null>>, active: boolean, onDismiss: () => void) {
  const handler = useRef(onDismiss);
  handler.current = onDismiss;
  const refs = useRef(inside);
  refs.current = inside;

  useEffect(() => {
    if (!active) return;
    let start: { x: number; y: number } | null = null;
    const isOutside = (target: EventTarget | null) => target instanceof Node && refs.current.every((ref) => !ref.current?.contains(target));
    const onDown = (event: PointerEvent) => {
      start = isOutside(event.target) ? { x: event.clientX, y: event.clientY } : null;
    };
    const onUp = (event: PointerEvent) => {
      const tapped = start && isOutside(event.target) && Math.hypot(event.clientX - start.x, event.clientY - start.y) < 10;
      start = null;
      if (tapped) handler.current();
    };
    const onCancel = () => {
      start = null;
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("pointercancel", onCancel, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("pointercancel", onCancel, true);
    };
  }, [active]);
}

// Paneles abiertos que se cierran con Escape, en el orden en que se abrieron.
const escapeStack: Array<() => void> = [];

function onEscapeKey(event: KeyboardEvent) {
  if (event.key !== "Escape" || !escapeStack.length) return;
  escapeStack[escapeStack.length - 1]();
}

/**
 * Cierra con la tecla Escape. Si hay varios paneles abiertos a la vez (por
 * ejemplo, accesibilidad encima de una ventana), cada pulsación cierra solo
 * el último que se abrió.
 */
export function useEscapeKey(active: boolean, onEscape: () => void) {
  const handler = useRef(onEscape);
  handler.current = onEscape;

  useEffect(() => {
    if (!active) return;
    const entry = () => handler.current();
    if (!escapeStack.length) window.addEventListener("keydown", onEscapeKey);
    escapeStack.push(entry);
    return () => {
      escapeStack.splice(escapeStack.indexOf(entry), 1);
      if (!escapeStack.length) window.removeEventListener("keydown", onEscapeKey);
    };
  }, [active]);
}
