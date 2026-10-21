import { Apple, Camera, Hand, Heart, Moon, Pause, Play, RotateCcw, Sparkles, Sun } from "lucide-react";
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

// Lo que dice Moka en cada momento. Las acciones que también existen en el rincón de compañía usan
// sus mismas frases (src/lib/companionVoices.ts); las que solo existen en 3D viven aquí.
const lines = {
  greet: { listId: "3d:moka:tap", lines: voice.tap },
  pet: { listId: "3d:moka:love", lines: voice.care.love ?? [] },
  eat: { listId: "3d:moka:food", lines: voice.care.food ?? [] },
  wag: { listId: "3d:moka:wag", lines: ["¡Mira cómo muevo la cola! Así digo que estoy feliz.", "Muevo la cola y suena mi campanita. ¡Tilín, tilín!", "Cola feliz, vaquita feliz. ¡Muuu!"] },
  sleep: { listId: "3d:moka:sleep", lines: ["Zzz… cinco minutitos más…", "Voy a soñar con un prado enorme. Zzz…", "Muuu… buenas noches. Zzz…"] },
  wake: { listId: "3d:moka:wake", lines: ["¡Ya desperté! ¿Me extrañaste?", "Muuu… qué rica siesta. ¡Hola otra vez!", "Soñé que jugábamos a las escondidillas. ¡Tú ganabas!"] },
  photo: { listId: "3d:moka:photo", lines: ["¡Salí bien guapa! Tu foto ya se guardó.", "¡Muuu! Foto lista. ¿Salió mi campanita?", "Guárdala bien, que salí sonriendo."] },
} satisfies Record<MokaAction | "sleep" | "wake" | "photo", { listId: string; lines: string[] }>;

export default function Companion3DPage({ preferences }: { preferences: Preferences }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<MokaViewer | null>(null);
  const bubbleTimer = useRef<number | undefined>(undefined);
  const reducedMotion = preferences.reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [status, setStatus] = useState<"loading" | "ready" | "unsupported">("loading");
  const [autoRotate, setAutoRotate] = useState(!reducedMotion);
  const [sleeping, setSleeping] = useState(false);
  const sleepingRef = useRef(false);
  const [line, setLine] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  function say(kind: keyof typeof lines) {
    setLine(nextLine(lines[kind].listId, lines[kind].lines));
    window.clearTimeout(bubbleTimer.current);
    bubbleTimer.current = window.setTimeout(() => setLine(null), 4200);
  }

  function changeSleep(next: boolean) {
    sleepingRef.current = next;
    setSleeping(next);
    viewerRef.current?.setSleeping(next);
    say(next ? "sleep" : "wake");
  }

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    // Esculpir a Moka tarda un momento; si la persona sale antes de que termine, se libera al acabar.
    let left = false;
    createMokaViewer(stage, {
      reducedMotion,
      // Tocarla la despierta si está dormida; si no, saluda.
      onTap: () => (sleepingRef.current ? changeSleep(false) : play("greet")),
      onProgress: (fraction) => { if (!left) setProgress(Math.round(fraction * 100)); },
    }).then((viewer) => {
      if (left) {
        viewer.dispose();
        return;
      }
      viewerRef.current = viewer;
      setStatus("ready");
    }).catch(() => {
      if (!left) setStatus("unsupported");
    });
    return () => {
      left = true;
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

  function takePhoto() {
    const url = viewerRef.current?.takePhoto();
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = "moka-kahy.png";
    link.click();
    say("photo");
  }

  const ready = status === "ready";
  const awake = ready && !sleeping;

  return (
    <div className="page companion-3d-page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">Vista especial · prototipo</span>
          <h1>Compañeros en 3D</h1>
          <p>Gira a Moka con el dedo o el mouse y acércala con dos dedos o la rueda: te sigue con la mirada. Tócala para que te salude. Es solo para mirar y jugar: no cambia el crecimiento de tu compañero.</p>
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
          <div className="companion-3d-canvas-host" ref={stageRef} role="img" aria-label="Moka en 3D: una vaquita color crema con manchas cafés, hocico rosa, cuernitos y una campanita, en un prado con flores." />
          {status === "loading" && <span className="companion-3d-status" role="status">{progress > 0 ? `Esculpiendo a Moka… ${progress} %` : "Preparando a Moka…"}</span>}
          {status === "unsupported" && (
            <div className="companion-3d-fallback">
              <Mascot id="vaca" size="medium" />
              <p>Este navegador no puede mostrar gráficos 3D (WebGL). Prueba en otro navegador o dispositivo; mientras, aquí está Moka en su dibujo.</p>
            </div>
          )}
          <span className="companion-3d-bubble-slot" role="status" aria-live="polite">
            {line && <span className="companion-3d-bubble" key={line}>{line}</span>}
          </span>
          {ready && (
            <div className="companion-3d-view-tools" role="group" aria-label="Controles de la vista">
              <button type="button" onClick={toggleRotation} aria-pressed={autoRotate} aria-label={autoRotate ? "Detener el giro" : "Girar sola"} title={autoRotate ? "Detener el giro" : "Girar sola"}>{autoRotate ? <Pause size={18} /> : <Play size={18} />}</button>
              <button type="button" onClick={() => viewerRef.current?.resetView()} aria-label="Centrar la vista" title="Centrar la vista"><RotateCcw size={18} /></button>
              <button type="button" onClick={takePhoto} aria-label="Tomar una foto de Moka" title="Tomar una foto"><Camera size={18} /></button>
            </div>
          )}
        </div>

        <div className="companion-3d-actions">
          <Button variant="secondary" onClick={() => play("greet")} disabled={!awake}><Hand size={18} /> Saludar</Button>
          <Button variant="secondary" onClick={() => play("pet")} disabled={!awake}><Heart size={18} /> Acariciar</Button>
          <Button variant="secondary" onClick={() => play("eat")} disabled={!awake}><Apple size={18} /> Comer pasto</Button>
          <Button variant="secondary" onClick={() => play("wag")} disabled={!awake}><Sparkles size={18} /> Mover la cola</Button>
          <Button variant={sleeping ? "primary" : "secondary"} className="companion-3d-sleep" onClick={() => changeSleep(!sleeping)} disabled={!ready} aria-pressed={sleeping}>{sleeping ? <><Sun size={18} /> Despertar</> : <><Moon size={18} /> Dormir</>}</Button>
        </div>
        {sleeping && <p className="companion-3d-hint">Moka está dormida. Tócala o pulsa “Despertar” para jugar otra vez.</p>}
        <p className="companion-3d-note"><DemoBadge>Prototipo</DemoBadge> Moka se esculpe en 3D aquí mismo al abrir esta sección (tarda un momento solo la primera vez); su estilo es distinto al de la acuarela.</p>
      </Card>
    </div>
  );
}
