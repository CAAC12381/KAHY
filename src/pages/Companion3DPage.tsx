import { Apple, Camera, Download, Flower, Hand, Heart, HeartHandshake, Moon, Pause, Play, Quote, RotateCcw, Share2, Sparkles, Sun, Trash2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Mascot from "../components/Mascot";
import CompanionMirror from "../components/CompanionMirror";
import { Button, Card, DemoBadge, Modal } from "../components/ui";
import { companionOf, mirrorCompanions, mirrorThemes, situationsFor, situationsOf, type MirrorSituation, type MirrorTheme } from "../data/companionMirror";
import type { MirrorJournalApi } from "../hooks/useMirrorJournal";
import { companionVoices, nextLine } from "../lib/companionVoices";
import { mascots } from "../mock/data";
import { playSound, setSoundEnabled, soundEnabled, type MokaSound } from "../three/mokaSounds";
import { createMokaViewer, type MokaAction, type MokaViewer } from "../three/mokaViewer";
import type { MascotId, Preferences } from "../types";
import "../styles/companion-3d.css";

/**
 * Compañeros en 3D: una vista aparte para jugar con Moka en 3D y para "Lo que
 * le dirías a alguien que quieres" (src/components/CompanionMirror.tsx) con
 * los cuatro compañeros. Pío, Lima y Tita todavía no tienen modelo 3D: en el
 * ejercicio acompañan con su ilustración (y su cara triste mientras cuentan
 * lo que les pasó). Jugar no toca el progreso del rincón de compañía;
 * acompañarlos en el ejercicio sí (onPracticed, una vez al día). Está
 * disponible para todos, sin importar el compañero que se eligió. Se carga
 * solo al abrirla, así que three.js no pesa en el resto de la app.
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

// Qué ilustración usa cada compañero sin 3D: la que se parece a su cara triste (Pío y Tita son bebés en
// esa imagen; la de Pío grande es una gallina adulta, que en sus historias es otro personaje).
const DRAWN_STAGE: Record<MascotId, number> = { vaca: 2, pollito: 1, camaleon: 2, tortuga: 1 };

/** Convierte la foto (data URL) en archivo para compartirla. */
async function photoFile(url: string) {
  const blob = await (await fetch(url)).blob();
  return new File([blob], "moka-kahy.png", { type: "image/png" });
}

export default function Companion3DPage({ preferences, onHelp, onPracticed, journal, initialTheme }: {
  preferences: Preferences;
  /** Abre "Ayuda inmediata" (si en el ejercicio se escribe algo que suena a riesgo). */
  onHelp: () => void;
  /** Se consoló a un compañero en "Lo que le dirías a alguien que quieres". */
  onPracticed: (companion: MascotId) => void;
  /** Frases guardadas (solo en este dispositivo). */
  journal: MirrorJournalApi;
  /** Al llegar desde el chat o el calendario: el compañero de este tema empieza con una situación parecida. */
  initialTheme?: MirrorTheme;
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
  const [mirror, setMirror] = useState<{ situation: MirrorSituation; round: number; fromChat: boolean } | null>(null);
  const mirrorRef = useRef(false);
  const rotateBeforeMirror = useRef(false);
  const startedFromTheme = useRef(false);
  // Con quién se está: Moka (en 3D) o Pío, Lima y Tita (con su ilustración, y cómo se ve mientras tanto).
  const [companion, setCompanion] = useState<MascotId>(() => (initialTheme ? mirrorThemes[initialTheme].companion : "vaca"));
  const [drawnMood, setDrawnMood] = useState<"calm" | "down" | "cheer">("calm");
  const isMoka = companion === "vaca";

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

  // Desde el chat o el calendario ("Practicar con…"): en cuanto el compañero está listo, empieza el ejercicio.
  // (Moka tarda un momento en esculpirse; los demás están listos de inmediato con su ilustración.)
  useEffect(() => {
    if (!initialTheme || startedFromTheme.current) return;
    if (mirrorThemes[initialTheme].companion === "vaca" && status === "loading") return;
    startedFromTheme.current = true;
    startMirror(undefined, initialTheme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, initialTheme]);

  /**
   * Empieza (o cambia de) situación. `theme`: viene del chat o del calendario, y el compañero de ese
   * tema vive algo parecido a lo que la persona contó; si no, es una del compañero elegido.
   */
  function startMirror(previous?: MirrorSituation, theme?: MirrorTheme) {
    const pool = theme ? situationsFor(theme) : situationsOf(companion);
    const listId = `3d:mirror:${theme ?? companion}`;
    const ids = pool.map((item) => item.id);
    let id = nextLine(listId, ids);
    if (id === previous?.id) id = nextLine(listId, ids);
    const situation = pool.find((item) => item.id === id) ?? pool[0];
    const who = companionOf(situation);
    setCompanion(who);
    mirrorRef.current = true;
    setMirror((current) => ({ situation, round: (current?.round ?? 0) + 1, fromChat: Boolean(theme) }));
    setLine(null);
    playSound("yawn"); // Un suspiro.
    if (who !== "vaca") {
      setDrawnMood("down");
      return;
    }
    // Dormida no puede contarte nada: se despierta sin su frase de "buenos días".
    if (sleepingRef.current) {
      sleepingRef.current = false;
      setSleeping(false);
      viewerRef.current?.setSleeping(false);
    }
    // Mientras te cuenta lo que le pasó, Moka queda de frente: la vista se centra y deja de girar.
    if (!mirror) rotateBeforeMirror.current = autoRotate;
    setAutoRotate(false);
    viewerRef.current?.setAutoRotate(false);
    viewerRef.current?.resetView();
    viewerRef.current?.setDowncast(true);
  }

  function moveCompanion(state: "down" | "cheer" | "calm", text?: string) {
    if (state === "cheer") {
      playSound("happy");
      if (text) showLine(text, 6000);
      // En el celular el recuadro puede quedar arriba: se acerca para verlo reaccionar.
      stageRef.current?.parentElement?.scrollIntoView({ block: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
    }
    if (!isMoka) {
      setDrawnMood(state);
      return;
    }
    const viewer = viewerRef.current;
    viewer?.setDowncast(state === "down");
    if (state === "cheer") viewer?.play("cheer");
  }

  function endMirror() {
    mirrorRef.current = false;
    setMirror(null);
    setDrawnMood("calm");
    viewerRef.current?.setDowncast(false);
    if (rotateBeforeMirror.current) {
      setAutoRotate(true);
      viewerRef.current?.setAutoRotate(true);
    }
    rotateBeforeMirror.current = false;
  }

  function chooseCompanion(next: MascotId) {
    if (mirror) return;
    setCompanion(next);
    setLine(null);
    setDrawnMood("calm");
  }

  // Las ilustraciones se cargan al elegir al compañero (su cara triste incluida), para que al empezar el
  // ejercicio no se vea el cambio de imagen a medias.
  useEffect(() => {
    const mascot = mascots.find((item) => item.id === companion);
    if (!mascot || companion === "vaca") return;
    [mascot.sadImage, mascot.stages[DRAWN_STAGE[companion] - 1]].forEach((src) => {
      if (src) new Image().src = src;
    });
  }, [companion]);

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
  const current = mirrorCompanions[companion];

  return (
    <>
      <div className="page companion-3d-page">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Vista especial · prototipo</span>
            <h1>Compañeros en 3D</h1>
            <p>Elige a un compañero. Moka ya está en 3D: gira la vista arrastrando el fondo, acércala con dos dedos o la rueda, tócala para que te salude y pásale el dedo o el mouse por encima para acariciarla. Pío, Lima y Tita, por ahora, te acompañan con su dibujo. Jugar no cambia el crecimiento de tu compañero; acompañarlos en “Lo que le dirías a alguien que quieres”, sí (una vez al día).</p>
          </div>
        </div>

        <div className="companion-3d-picker" role="group" aria-label="Elige a un compañero">
          {mascots.map((item) => (
            <button
              type="button"
              key={item.id}
              className={item.id === companion ? "companion-3d-chip active" : "companion-3d-chip"}
              aria-pressed={item.id === companion}
              onClick={() => chooseCompanion(item.id)}
              disabled={Boolean(mirror) && item.id !== companion}
              title={mirror && item.id !== companion ? "Termina el ejercicio para cambiar de compañero" : undefined}
            >
              <Mascot id={item.id} size="tiny" />
              <span><strong>{item.name}</strong><small>{item.id === "vaca" ? "En 3D" : "En dibujo"}</small></span>
            </button>
          ))}
        </div>

        <Card className="companion-3d-card">
          <div className={["companion-3d-stage", isMoka && sleeping ? "is-night" : "", isMoka ? "" : "is-drawn"].filter(Boolean).join(" ")}>
            {/* three.js pone aquí su lienzo (que se puede usar con el teclado); React no maneja ese nodo, por eso va aparte de los avisos. */}
            <div className="companion-3d-canvas-host" ref={stageRef} />
            {!isMoka && (
              <div className={`companion-3d-drawn is-${drawnMood}`}>
                <Mascot id={companion} size="large" stage={DRAWN_STAGE[companion]} mood={drawnMood === "down" ? "triste" : "feliz"} />
              </div>
            )}
            {isMoka && status === "loading" && <span className="companion-3d-status" role="status">{progress > 0 ? `Esculpiendo a Moka… ${progress} %` : "Preparando a Moka…"}</span>}
            {isMoka && status === "unsupported" && (
              <div className="companion-3d-fallback">
                <Mascot id="vaca" size="medium" />
                <p>Este navegador no puede mostrar gráficos 3D (WebGL). Prueba en otro navegador o dispositivo; mientras, aquí está Moka en su dibujo.</p>
              </div>
            )}
            <span className="companion-3d-bubble-slot" role="status" aria-live="polite">
              {line && <span className="companion-3d-bubble" key={line}>{line}</span>}
            </span>
            {isMoka && ready && (
              <div className="companion-3d-view-tools" role="group" aria-label="Controles de la vista">
                <button type="button" onClick={toggleSound} aria-pressed={sound} aria-label={sound ? "Apagar sonidos" : "Encender sonidos"} title={sound ? "Apagar sonidos" : "Encender sonidos"}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
                <button type="button" onClick={toggleRotation} aria-pressed={autoRotate} aria-label={autoRotate ? "Detener el giro" : "Girar sola"} title={autoRotate ? "Detener el giro" : "Girar sola"}>{autoRotate ? <Pause size={18} /> : <Play size={18} />}</button>
                <button type="button" onClick={() => viewerRef.current?.resetView()} aria-label="Centrar la vista" title="Centrar la vista"><RotateCcw size={18} /></button>
                <button type="button" onClick={() => void takePhoto()} aria-label="Tomar una foto de Moka" title="Tomar una foto"><Camera size={18} /></button>
              </div>
            )}
          </div>

          {mirror ? (
            <CompanionMirror
              key={mirror.round}
              situation={mirror.situation}
              fromChat={mirror.fromChat}
              onCompanion={moveCompanion}
              onPracticed={() => onPracticed(companionOf(mirror.situation))}
              onSave={(phrase) => journal.savePhrase(phrase, mirror.situation.id)}
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
                  <p>{current.about} Escúcha{current.object} y dile lo que le dirías a alguien que quieres.</p>
                </div>
                {/* Sin 3D (WebGL) también se puede: Moka acompaña con su dibujo. */}
                <Button onClick={() => startMirror()} disabled={isMoka && status === "loading"}>Acompañar a {current.name}</Button>
              </div>
          {isMoka && (
          <div className="companion-3d-actions">
            <Button variant="secondary" onClick={() => play("greet")} disabled={!awake}><Hand size={18} /> Saludar</Button>
            <Button variant="secondary" onClick={() => play("pet")} disabled={!awake}><Heart size={18} /> Acariciar</Button>
            <Button variant="secondary" onClick={() => play("eat")} disabled={!awake}><Apple size={18} /> Comer pasto</Button>
            <Button variant="secondary" onClick={() => play("wag")} disabled={!awake}><Sparkles size={18} /> Mover la cola</Button>
            <Button variant="secondary" onClick={() => play("smell")} disabled={!awake}><Flower size={18} /> Oler una flor</Button>
            <Button variant={sleeping ? "primary" : "secondary"} className="companion-3d-sleep" onClick={() => changeSleep(!sleeping)} disabled={!ready} aria-pressed={sleeping}>{sleeping ? <><Sun size={18} /> Despertar</> : <><Moon size={18} /> Dormir</>}</Button>
          </div>
          )}
          {isMoka && sleeping && <p className="companion-3d-hint">Moka está dormida. Tócala o pulsa “Despertar” para jugar otra vez.</p>}
            </>
          )}
          {isMoka ? (
            <>
              <p className="companion-3d-keys">Con teclado: <kbd>Tab</kbd> hasta Moka, <kbd>←</kbd> <kbd>→</kbd> <kbd>↑</kbd> <kbd>↓</kbd> para girar, <kbd>+</kbd> <kbd>−</kbd> para acercar y <kbd>Enter</kbd> para saludarla.</p>
              <p className="companion-3d-note"><DemoBadge>Prototipo</DemoBadge> Moka se esculpe en 3D aquí mismo al abrir esta sección (tarda un momento solo la primera vez), con el mismo estilo de plastilina que su ilustración.</p>
            </>
          ) : (
            <p className="companion-3d-note"><DemoBadge>Prototipo</DemoBadge> {current.name} todavía no tiene su versión en 3D; mientras, te acompaña con su ilustración.</p>
          )}
        </Card>

        {journal.phrases.length > 0 && (
          <Card className="mirror-phrases">
            <div className="settings-title">
              <Quote size={21} />
              <div>
                <h2>Frases que me he dicho</h2>
                <p>Las que les dijiste a tus compañeros y te sirvieron. Vuelve a ellas cuando tu mente se ponga dura contigo. Se guardan solo en este dispositivo.</p>
              </div>
            </div>
            <ul>
              {[...journal.phrases].reverse().map((phrase) => (
                <li key={phrase.id}>
                  <blockquote>{phrase.text}</blockquote>
                  <time dateTime={new Date(phrase.at).toISOString()}>{new Date(phrase.at).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}</time>
                  <button type="button" onClick={() => journal.removePhrase(phrase.id)} aria-label={`Borrar la frase: ${phrase.text}`} title="Borrar"><Trash2 size={16} /></button>
                </li>
              ))}
            </ul>
          </Card>
        )}
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
