import { Apple, Hand, Heart, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Mascot from "../components/Mascot";
import { Button, Card, DemoBadge } from "../components/ui";
import { companionVoices, nextLine } from "../lib/companionVoices";
import { mascots } from "../mock/data";
import { createMokaViewer, type MokaAction, type MokaViewer } from "../three/mokaViewer";
import type { Preferences } from "../types";
import "../styles/companion-3d.css";

/**
 * Compañeros en 3D: una vista aparte solo para mirar y jugar con el modelo.
 * No toca el progreso del rincón de compañía (no da crecimiento ni felicidad)
 * y se carga solo al abrirla, así que three.js no pesa en el resto de la app.
 * Por ahora está Moka; los demás aparecen como "Pronto".
 */

const voice = companionVoices["mascota:vaca"];

const actionLines: Record<MokaAction, { listId: string; lines: string[] }> = {
  greet: { listId: "3d:moka:tap", lines: voice.tap },
  eat: { listId: "3d:moka:food", lines: voice.care.food ?? [] },
  // Solo existe en 3D (en el rincón de compañía no hay botón de cola), por eso sus frases viven aquí.
  wag: { listId: "3d:moka:wag", lines: ["¡Mira cómo muevo la cola! Así digo que estoy feliz.", "Muevo la cola y suena mi campanita. ¡Tilín, tilín!", "Cola feliz, vaquita feliz. ¡Muuu!"] },
};

export default function Companion3DPage({ preferences }: { preferences: Preferences }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<MokaViewer | null>(null);
  const bubbleTimer = useRef<number | undefined>(undefined);
  const reducedMotion = preferences.reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [status, setStatus] = useState<"loading" | "ready" | "unsupported">("loading");
  const [autoRotate, setAutoRotate] = useState(!reducedMotion);
  const [line, setLine] = useState<string | null>(null);

  function say(action: MokaAction) {
    const { listId, lines } = actionLines[action];
    setLine(nextLine(listId, lines));
    window.clearTimeout(bubbleTimer.current);
    bubbleTimer.current = window.setTimeout(() => setLine(null), 4200);
  }

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    try {
      viewerRef.current = createMokaViewer(stage, { reducedMotion, onTap: () => say("greet") });
      setStatus("ready");
    } catch {
      setStatus("unsupported");
    }
    return () => {
      window.clearTimeout(bubbleTimer.current);
      viewerRef.current?.dispose();
      viewerRef.current = null;
    };
    // El modelo se crea una sola vez; los cambios de preferencias se aplican al volver a abrir la sección.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function play(action: MokaAction) {
    viewerRef.current?.play(action);
    say(action);
  }

  function toggleRotation() {
    const next = !autoRotate;
    setAutoRotate(next);
    viewerRef.current?.setAutoRotate(next);
  }

  return (
    <div className="page companion-3d-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Vista especial · prototipo</span>
          <h1>Compañeros en 3D</h1>
          <p>Gira a Moka con el dedo o el mouse, acércala con dos dedos o la rueda y tócala para que te salude. Es solo para mirar y jugar: no cambia el crecimiento de tu compañero.</p>
        </div>
      </div>

      <div className="companion-3d-picker" role="list" aria-label="Compañeros disponibles en 3D">
        {mascots.map((item) => {
          const available = item.id === "vaca";
          return (
            <span key={item.id} role="listitem" className={available ? "companion-3d-chip active" : "companion-3d-chip"} aria-current={available || undefined}>
              <Mascot id={item.id} size="tiny" />
              <span><strong>{item.name}</strong><small>{available ? "En 3D" : "Pronto"}</small></span>
            </span>
          );
        })}
      </div>

      <Card className="companion-3d-card">
        <div className="companion-3d-stage">
          {/* three.js pone aquí su lienzo; React no maneja este nodo, por eso va aparte de los avisos. */}
          <div className="companion-3d-canvas-host" ref={stageRef} role="img" aria-label="Moka en 3D: una vaquita color crema con manchas cafés, hocico rosa, cuernitos y una campanita, parada en un prado con flores." />
          {status === "loading" && <span className="companion-3d-status">Preparando a Moka…</span>}
          {status === "unsupported" && (
            <div className="companion-3d-fallback">
              <Mascot id="vaca" size="medium" />
              <p>Este navegador no puede mostrar gráficos 3D (WebGL). Prueba en otro navegador o dispositivo; mientras, aquí está Moka en su dibujo.</p>
            </div>
          )}
          <span className="companion-3d-bubble-slot" role="status" aria-live="polite">
            {line && <span className="companion-3d-bubble" key={line}>{line}</span>}
          </span>
        </div>

        <div className="companion-3d-actions">
          <Button variant="secondary" onClick={() => play("greet")} disabled={status !== "ready"}><Hand size={18} /> Saludar</Button>
          <Button variant="secondary" onClick={() => play("eat")} disabled={status !== "ready"}><Apple size={18} /> Comer pasto</Button>
          <Button variant="secondary" onClick={() => play("wag")} disabled={status !== "ready"}><Heart size={18} /> Mover la cola</Button>
          <Button variant="ghost" onClick={toggleRotation} disabled={status !== "ready"} aria-pressed={autoRotate}>{autoRotate ? <><Pause size={18} /> Detener giro</> : <><Play size={18} /> Girar sola</>}</Button>
          <Button variant="ghost" onClick={() => viewerRef.current?.resetView()} disabled={status !== "ready"}><RotateCcw size={18} /> Centrar</Button>
        </div>
        <p className="companion-3d-note"><DemoBadge>Prototipo</DemoBadge> Moka está hecha con figuras 3D sencillas; su estilo es distinto al de la acuarela.</p>
      </Card>
    </div>
  );
}
