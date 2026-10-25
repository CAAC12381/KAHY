import { ArrowRight, BookmarkCheck, BookmarkPlus, Check, HeartHandshake, LifeBuoy, MessageCircleHeart, PenLine, RefreshCw, Undo2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { detectSafetySignal } from "../../api/_lib/chatGuards";
import { MIRROR_TEXT_LIMIT, mirrorPhrase, type MirrorSituation } from "../data/mokaMirror";
import { Button } from "./ui";

/**
 * "Lo que le dirías a alguien que quieres" (ver src/data/mokaMirror.ts):
 * Moka cuenta algo que le salió mal, la persona la consuela y esa frase se le
 * devuelve. Lo que se escribe aquí no se envía a ningún lado; solo se guarda
 * (en este dispositivo) si la persona elige "Guardar en mis frases". La
 * página mueve a Moka con `onMoka`.
 */

type Step = "story" | "thanks" | "mirror" | "kept" | "notYet" | "later" | "safety";
const OWN_WORDS = -1;

export default function MokaMirror({ situation, fromChat = false, onMoka, onPracticed, onSave, onAnother, onClose, onHelp }: {
  situation: MirrorSituation;
  /** La situación se eligió por algo parecido que la persona contó en el chat. */
  fromChat?: boolean;
  /** down: apenada; cheer: consolada (con su respuesta); calm: vuelve a la normalidad sin festejo. */
  onMoka: (state: "down" | "cheer" | "calm", line?: string) => void;
  /** La persona consoló a Moka (el compañero crece una vez al día por esto). */
  onPracticed: () => void;
  /** Guarda la frase en "Frases que me he dicho" (solo en este dispositivo). */
  onSave: (phrase: string) => void;
  onAnother: () => void;
  onClose: () => void;
  onHelp: () => void;
}) {
  const [step, setStep] = useState<Step>("story");
  const [choice, setChoice] = useState<number | null>(null);
  const [ownWords, setOwnWords] = useState("");
  const [saved, setSaved] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstStep = useRef(true);

  // Al cambiar de paso, el foco va al título para que el lector de pantalla lo anuncie.
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  const said = choice === OWN_WORDS ? ownWords.trim() : choice === null ? "" : situation.options[choice];

  function tellMoka() {
    if (!said) return;
    if (choice === OWN_WORDS && detectSafetySignal(said)) {
      onMoka("calm");
      setStep("safety");
      return;
    }
    onMoka("cheer", situation.thanks);
    onPracticed();
    setStep("thanks");
  }

  function notNow() {
    onMoka("calm");
    setStep("later");
  }

  function backToStory() {
    onMoka("down");
    setStep("story");
  }

  const heading = (text: string) => <h2 ref={headingRef} tabIndex={-1}>{text}</h2>;
  const backToPlay = <Button variant="ghost" onClick={onClose}><Undo2 size={18} /> Volver a jugar con Moka</Button>;

  return (
    <section className="mirror" aria-label="Lo que le dirías a alguien que quieres">
      <span className="eyebrow"><HeartHandshake size={16} /> Lo que le dirías a alguien que quieres</span>

      {step === "story" && (
        <>
          {fromChat && <p className="mirror-hint">A Moka le pasó algo parecido a lo que contaste en el chat, en versión granja.</p>}
          <blockquote className="mirror-quote">
            <p>{situation.story}</p>
            <p>Y pensé: “{situation.thought}”.</p>
            <cite>Moka</cite>
          </blockquote>
          {heading("¿Qué le dirías a Moka?")}
          <p className="mirror-hint">Elige una frase o escríbela con tus palabras, como se la dirías a alguien que quieres.</p>
          <fieldset className="mirror-options">
            <legend className="sr-only">Lo que le dirías a Moka</legend>
            {situation.options.map((option, index) => (
              <label className="mirror-option" key={option}>
                <input type="radio" name="mirror-choice" checked={choice === index} onChange={() => setChoice(index)} />
                <span>{option}</span>
              </label>
            ))}
            <label className="mirror-option">
              <input type="radio" name="mirror-choice" checked={choice === OWN_WORDS} onChange={() => setChoice(OWN_WORDS)} />
              <span className="mirror-own"><PenLine size={17} /> Con mis palabras</span>
            </label>
          </fieldset>
          {choice === OWN_WORDS && (
            <div className="mirror-write">
              <label htmlFor="mirror-own-words">Lo que le dirías a Moka</label>
              <textarea id="mirror-own-words" rows={3} maxLength={MIRROR_TEXT_LIMIT} value={ownWords} onChange={(event) => setOwnWords(event.target.value)} autoFocus />
              <p className="mirror-note"><span>Lo que escribas no se envía a ningún lado. Solo se guarda, en este dispositivo, si al final eliges guardar la frase.</span><span>{ownWords.length}/{MIRROR_TEXT_LIMIT}</span></p>
            </div>
          )}
          <div className="mirror-actions">
            <Button onClick={tellMoka} disabled={!said}><MessageCircleHeart size={18} /> Decírselo a Moka</Button>
            <Button variant="ghost" onClick={notNow}>Ahora no</Button>
          </div>
        </>
      )}

      {step === "thanks" && (
        <>
          {heading("Moka te escuchó")}
          <blockquote className="mirror-quote">
            <p>{situation.thanks}</p>
            <cite>Moka</cite>
          </blockquote>
          <div className="mirror-actions">
            <Button onClick={() => setStep("mirror")}>Continuar <ArrowRight size={18} /></Button>
          </div>
        </>
      )}

      {step === "mirror" && (
        <>
          {heading("Ahora, para ti")}
          <p>¿Alguna vez te has dicho algo como “{situation.thought}”? Lo que le dijiste a Moka también vale para ti:</p>
          <blockquote className="mirror-quote mirror-quote--you">
            <p>{mirrorPhrase(said)}</p>
          </blockquote>
          <p className="mirror-hint">Léela despacio, como si te la dijera alguien que te quiere. ¿Te sirve?</p>
          <div className="mirror-actions">
            <Button onClick={() => setStep("kept")}><Check size={18} /> Sí, me sirve</Button>
            <Button variant="secondary" onClick={() => setStep("notYet")}>Todavía no me la creo</Button>
          </div>
        </>
      )}

      {(step === "kept" || step === "notYet") && (
        <>
          {heading(step === "kept" ? "Qué bueno" : "Está bien")}
          <p>
            {step === "kept"
              ? "Puedes volver a decírtela cuando tu mente se ponga dura contigo. Ya sabes cómo suena: se la dijiste a Moka."
              : "Es muy común: a muchas personas les sale más fácil ser amables con alguien más que consigo mismas. Que se lo hayas dicho a Moka ya es un paso."}
          </p>
          <p className="mirror-note">Acompañar a Moka hace crecer a tu compañero, una vez al día.</p>
          <div className="mirror-actions">
            {step === "kept" && (
              <Button onClick={() => { onSave(mirrorPhrase(said)); setSaved(true); }} disabled={saved}>
                {saved ? <><BookmarkCheck size={18} /> Guardada en tus frases</> : <><BookmarkPlus size={18} /> Guardar en mis frases</>}
              </Button>
            )}
            <Button variant="secondary" onClick={onAnother}><RefreshCw size={18} /> Otra situación</Button>
            {backToPlay}
          </div>
        </>
      )}

      {step === "later" && (
        <>
          {heading("Está bien")}
          <p>No tiene que salir hoy. Gracias por quedarte un ratito con Moka.</p>
          <div className="mirror-actions">{backToPlay}</div>
        </>
      )}

      {step === "safety" && (
        <div className="mirror-safety">
          {heading("Gracias por escribirlo")}
          <p>Lo que escribiste suena a algo muy pesado, y no tienes que cargarlo a solas. Si estás en peligro, llama al 911. La Línea de la Vida, <strong>800 911 2000</strong>, te escucha todos los días, a cualquier hora.</p>
          <div className="mirror-actions">
            <Button variant="danger" onClick={onHelp}><LifeBuoy size={18} /> Ver opciones de ayuda</Button>
            <Button variant="ghost" onClick={backToStory}>Volver</Button>
          </div>
        </div>
      )}
    </section>
  );
}
