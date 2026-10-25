import { Apple, Camera, Download, Flower, Hand, Heart, HeartHandshake, Moon, Pause, Play, RotateCcw, Share2, Sparkles, Sun, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Mascot from "../components/Mascot";
import MokaMirror from "../components/MokaMirror";
import { Button, Card, DemoBadge, Modal } from "../components/ui";
import { mirrorSituations, type MirrorSituation } from "../data/mokaMirror";
import { companionVoices, nextLine } from "../lib/companionVoices";
import { mascots } from "../mock/data";
import { playSound, setSoundEnabled, soundEnabled, type MokaSound } from "../three/mokaSounds";
import { createMokaViewer, type MokaAction, type MokaViewer } from "../three/mokaViewer";
import type { Preferences } from "../types";
import "../styles/companion-3d.css";

/**
 * Compañeros en 3D: una vista aparte para jugar con el modelo y para "Lo que
 * le dirías a alguien que quieres" (src/components/MokaMirror.tsx). Jugar no
 * toca el progreso del rincón de compañía; acompañar a Moka en ese ejercicio
 * sí (onPracticed, una vez al día). Está disponible para todos, sin importar
 * el compañero que se eligió. Se carga solo al abrirla, así que three.js no
 * pesa en el resto de la app. Por ahora está Moka; los demás dicen "Pronto".
 */

const voice = companionVoices["mascota:vaca"];

// Lo que dice Moka en cada momento. Las acciones que también existen en el rincón de compañía usan
// sus mismas frases (src/lib/companionVoices.ts); las que solo existen en 3D viven aquí.
const lines = {
  greet: { listId: "3d:moka:tap", lines: voice.tap },
  pet: { listId: "3d:moka:love", lines: voice.care.love ?? [] },
  eat: { listId: "3d:moka:food", lines: voice.care.food ?? [] },
  wag: { listId: "3d:moka:wag", lines: ["¡Mira cómo muevo la cola! Así digo que estoy feliz.", "Muevo la cola como abanico. ¡Fiu, fiu!", "Cola feliz, vaquita feliz. ¡Muuu!"] },
  smell: { listId: "3d:moka:smell", lines: ["Mmm… huele a primavera.", "¡Qué flor tan bonita! ¿Te la regalo?", "Huelo flores y me dan ganas de dar saltitos. ¡Muuu!"] },
  sleep: { listId: "3d:moka:sleep", lines: ["Zzz… cinco minutitos más…", "Voy a soñar con un prado enorme. Zzz…", "Muuu… buenas noches. Zzz…"] },
  wake: { listId: "3d:moka:wake", lines: ["¡Ya desperté! ¿Me extrañaste?", "Muuu… qué rica siesta. ¡Hola otra vez!", "Soñé que jugábamos a las escondidillas. ¡Tú ganabas!"] },
  photo: { listId: "3d:moka:photo", lines: ["¡Salí bien guapa! ¿La guardamos?", "¡Muuu! Foto lista. ¿Salió mi copete?", "Guárdala bien, que salí sonriendo."] },
} satisfies Record<Exclude<MokaAction, "cheer"> | "sleep" | "wake" | "photo", { listId: string; lines: string[] }>;

const actionSound: Record<Exclude<MokaAction, "cheer">, MokaSound> = { greet: "moo", pet: "happy", eat: "munch", wag: "bell", smell: "sniff" };

/** Convierte la foto (data URL) en archivo para compartirla. */
async function photoFile(url: string) {
  const blob = await (await fetch(url)).blob();
  return new File([blob], "moka-kahy.png", { type: "image/png" });
}

export default function Companion3DPage({ preferences, onHelp, onPracticed }: {
  preferences: Preferences;
  /** Abre "Ayuda inmediata" (si en el ejercicio se escribe algo que suena a riesgo). */
  onHelp: () => void;
  /** Se consoló a Moka en "Lo que le dirías a alguien que quieres". */
  onPracticed: () => void;
}) {
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
  const [sound, setSound] = useState(soundEnabled);
  const [photo, setPhoto] = useState<{ url: string; canShare: boolean } | null>(null);
  // "Lo que le dirías a alguien que quieres": la situación en curso (round reinicia el ejercicio).
  const [mirror, setMirror] = useState<{ situation: MirrorSituation; round: number } | null>(null);
  const mirrorRef = useRef(false);
  const rotateBeforeMirror = useRef(false);

  function showLine(text: string, duration = 4200) {
    setLine(text);
    window.clearTimeout(bubbleTimer.current);
    bubbleTimer.current = window.setTimeout(() => setLine(null), duration);
  }

  function say(kind: keyof typeof lines) {
    showLine(nextLine(lines[kind].listId, lines[kind].lines));
  }

  function changeSleep(next: boolean) {
    sleepingRef.current = next;
    setSleeping(next);
    viewerRef.current?.setSleeping(next);
    say(next ? "sleep" : "wake");
    playSound(next ? "yawn" : "happy");
  }

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    // Esculpir a Moka tarda un momento; si la persona sale antes de que termine, se libera al acabar.
    let left = false;
    createMokaViewer(stage, {
      reducedMotion,
      // Tocarla la despierta si está dormida; si no, saluda (en el ejercicio no: te está contando algo).
      onTap: () => {
        if (mirrorRef.current) return;
        if (sleepingRef.current) changeSleep(false);
        else play("greet");
      },
      // En el ejercicio acariciarla también la reconforta, pero sin sus frases de juego.
      onPet: () => {
        if (mirrorRef.current) return;
        say("pet");
        playSound("happy");
      },
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

  function play(action: Exclude<MokaAction, "cheer">) {
    viewerRef.current?.play(action);
    say(action);
    playSound(actionSound[action]);
  }

  function startMirror(previous?: MirrorSituation) {
    // Dormida no puede contarte nada: se despierta sin su frase de "buenos días".
    if (sleepingRef.current) {
      sleepingRef.current = false;
      setSleeping(false);
      viewerRef.current?.setSleeping(false);
    }
    const ids = mirrorSituations.map((item) => item.id);
    let id = nextLine("3d:moka:mirror", ids);
    if (id === previous?.id) id = nextLine("3d:moka:mirror", ids);
    const situation = mirrorSituations.find((item) => item.id === id) ?? mirrorSituations[0];
    // Mientras te cuenta lo que le pasó, Moka queda de frente: la vista se centra y deja de girar.
    if (!mirrorRef.current) rotateBeforeMirror.current = autoRotate;
    setAutoRotate(false);
    viewerRef.current?.setAutoRotate(false);
    viewerRef.current?.resetView();
    mirrorRef.current = true;
    setMirror((current) => ({ situation, round: (current?.round ?? 0) + 1 }));
    setLine(null);
    viewerRef.current?.setDowncast(true);
    playSound("yawn"); // Un suspiro.
  }

  function moveMoka(state: "down" | "cheer" | "calm", text?: string) {
    const viewer = viewerRef.current;
    viewer?.setDowncast(state === "down");
    if (state !== "cheer") return;
    viewer?.play("cheer");
    playSound("happy");
    if (text) showLine(text, 6000);
    // En el celular el recuadro de Moka puede quedar arriba: se acerca para verla reaccionar.
    stageRef.current?.parentElement?.scrollIntoView({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
  }

  function endMirror() {
    mirrorRef.current = false;
    setMirror(null);
    viewerRef.current?.setDowncast(false);
    if (rotateBeforeMirror.current) {
      setAutoRotate(true);
      viewerRef.current?.setAutoRotate(true);
    }
  }

  function toggleRotation() {
    const next = !autoRotate;
    setAutoRotate(next);
    viewerRef.current?.setAutoRotate(next);
  }

  function toggleSound() {
    const next = !sound;
    setSound(next);
    setSoundEnabled(next);
    if (next) playSound("bell"); // Se escucha al momento que ya está activado.
  }

  async function takePhoto() {
    const url = viewerRef.current?.takePhoto();
    if (!url) return;
    let canShare = false;
    try {
      canShare = typeof navigator.canShare === "function" && navigator.canShare({ files: [await photoFile(url)] });
    } catch {
      canShare = false;
    }
    setPhoto({ url, canShare });
    say("photo");
  }

  function downloadPhoto() {
    if (!photo) return;
    const link = document.createElement("a");
    link.href = photo.url;
    link.download = "moka-kahy.png";
    link.click();
  }

  async function sharePhoto() {
    if (!photo) return;
    try {
      await navigator.share({ files: [await photoFile(photo.url)], title: "Moka · KAHY" });
    } catch {
      // La persona canceló o el navegador no pudo: la foto sigue en la vista previa para descargarla.
    }
  }

  const ready = status === "ready";
  const awake = ready && !sleeping;

  return (
    <>
      <div className="page companion-3d-page">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Vista especial · prototipo</span>
            <h1>Compañeros en 3D</h1>
            <p>Gira la vista arrastrando el fondo y acércala con dos dedos o la rueda. Toca a Moka para que te salude y pásale el dedo o el mouse por encima para acariciarla. Jugar no cambia el crecimiento de tu compañero; acompañar a Moka en “Lo que le dirías a alguien que quieres”, sí (una vez al día).</p>
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
          <div className={sleeping ? "companion-3d-stage is-night" : "companion-3d-stage"}>
            {/* three.js pone aquí su lienzo (que se puede usar con el teclado); React no maneja ese nodo, por eso va aparte de los avisos. */}
            <div className="companion-3d-canvas-host" ref={stageRef} />
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
                <button type="button" onClick={toggleSound} aria-pressed={sound} aria-label={sound ? "Apagar sonidos" : "Encender sonidos"} title={sound ? "Apagar sonidos" : "Encender sonidos"}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
                <button type="button" onClick={toggleRotation} aria-pressed={autoRotate} aria-label={autoRotate ? "Detener el giro" : "Girar sola"} title={autoRotate ? "Detener el giro" : "Girar sola"}>{autoRotate ? <Pause size={18} /> : <Play size={18} />}</button>
                <button type="button" onClick={() => viewerRef.current?.resetView()} aria-label="Centrar la vista" title="Centrar la vista"><RotateCcw size={18} /></button>
                <button type="button" onClick={() => void takePhoto()} aria-label="Tomar una foto de Moka" title="Tomar una foto"><Camera size={18} /></button>
              </div>
            )}
          </div>

          {mirror ? (
            <MokaMirror
              key={mirror.round}
              situation={mirror.situation}
              onMoka={moveMoka}
              onPracticed={onPracticed}
              onAnother={() => startMirror(mirror.situation)}
              onClose={endMirror}
              onHelp={onHelp}
            />
          ) : (
            <>
              <div className="companion-3d-mirror-cta">
                <span className="companion-3d-mirror-icon" aria-hidden="true"><HeartHandshake size={22} /></span>
                <div>
                  <strong>Lo que le dirías a alguien que quieres</strong>
                  <p>A Moka le salió algo mal y se está tratando con dureza. Escúchala y dile lo que le dirías a alguien que quieres.</p>
                </div>
                <Button onClick={() => startMirror()} disabled={!ready}>Acompañar a Moka</Button>
              </div>
          <div className="companion-3d-actions">
            <Button variant="secondary" onClick={() => play("greet")} disabled={!awake}><Hand size={18} /> Saludar</Button>
            <Button variant="secondary" onClick={() => play("pet")} disabled={!awake}><Heart size={18} /> Acariciar</Button>
            <Button variant="secondary" onClick={() => play("eat")} disabled={!awake}><Apple size={18} /> Comer pasto</Button>
            <Button variant="secondary" onClick={() => play("wag")} disabled={!awake}><Sparkles size={18} /> Mover la cola</Button>
            <Button variant="secondary" onClick={() => play("smell")} disabled={!awake}><Flower size={18} /> Oler una flor</Button>
            <Button variant={sleeping ? "primary" : "secondary"} className="companion-3d-sleep" onClick={() => changeSleep(!sleeping)} disabled={!ready} aria-pressed={sleeping}>{sleeping ? <><Sun size={18} /> Despertar</> : <><Moon size={18} /> Dormir</>}</Button>
          </div>
          {sleeping && <p className="companion-3d-hint">Moka está dormida. Tócala o pulsa “Despertar” para jugar otra vez.</p>}
            </>
          )}
          <p className="companion-3d-keys">Con teclado: <kbd>Tab</kbd> hasta Moka, <kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> para girar, <kbd>+</kbd> <kbd>−</kbd> para acercar y <kbd>Enter</kbd> para saludarla.</p>
          <p className="companion-3d-note"><DemoBadge>Prototipo</DemoBadge> Moka se esculpe en 3D aquí mismo al abrir esta sección (tarda un momento solo la primera vez), con el mismo estilo de plastilina que su ilustración.</p>
        </Card>
      </div>

      {/* Fuera de .page: esa capa se anima con transform y desacomodaría la ventana. */}
      {photo && (
        <Modal title="Foto de Moka" onClose={() => setPhoto(null)}>
          <img className="companion-3d-photo" src={photo.url} alt="Foto de Moka en 3D, con marco y la fecha de hoy." />
          <div className="companion-3d-photo-actions">
            <Button onClick={downloadPhoto}><Download size={18} /> Descargar</Button>
            {photo.canShare && <Button variant="secondary" onClick={() => void sharePhoto()}><Share2 size={18} /> Compartir</Button>}
          </div>
        </Modal>
      )}
    </>
  );
}
