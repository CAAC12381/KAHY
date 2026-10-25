import { WifiOff } from "lucide-react";
import { Component, lazy, Suspense, useMemo, useState, type ReactNode } from "react";
import type { Preferences } from "../types";

/**
 * Carga "Compañeros en 3D" solo cuando alguien abre la sección: three.js
 * pesa más que el resto de la app junta y no hace falta en ninguna otra
 * pantalla. Si la descarga falla (por ejemplo, sin internet la primera vez),
 * se muestra un aviso aquí, sin tumbar la app, y se puede reintentar.
 */
export default function LazyCompanion3D({ preferences, onHelp, onPracticed }: { preferences: Preferences; onHelp: () => void; onPracticed: () => void }) {
  const [attempt, setAttempt] = useState(0);
  // Un lazy() nuevo por intento: React recuerda una importación fallida y no la repite.
  const Page = useMemo(() => lazy(() => import("../pages/Companion3DPage")), [attempt]);
  return (
    <LoadBoundary key={attempt} onRetry={() => setAttempt((value) => value + 1)}>
      <Suspense fallback={<div className="page"><p className="lazy-section-status">Cargando la vista 3D…</p></div>}>
        <Page preferences={preferences} onHelp={onHelp} onPracticed={onPracticed} />
      </Suspense>
    </LoadBoundary>
  );
}

class LoadBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="page">
        <div className="scope-note lazy-section-error" role="alert">
          <WifiOff size={20} />
          <div>
            <strong>No se pudo abrir la vista 3D</strong>
            <p>La primera vez se descarga de internet. Revisa tu conexión e inténtalo de nuevo; después quedará guardada para usarla sin conexión.</p>
            <button className="button button--secondary" onClick={this.props.onRetry}>Intentar de nuevo</button>
          </div>
        </div>
      </div>
    );
  }
}
