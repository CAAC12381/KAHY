import { Bubbles, Check, CirclePause, Cloud, HeartPulse, ListChecks, Maximize2, Play, RotateCcw, ShieldCheck, Timer, Wind } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import TaskBreakdown from "../components/TaskBreakdown";
import { Button, Card, DemoBadge } from "../components/ui";
import type { EmotionCalendarApi } from "../hooks/useEmotionCalendar";
import type { TaskPlansApi } from "../hooks/useTaskPlans";
import type { Preferences } from "../types";

export type Activity = "breathing" | "task" | "clouds" | "body" | "bubbles";

type BreathStage = "setup" | "practice" | "complete";
type BreathPhaseKind = "inhale" | "hold" | "exhale";
type BreathFeedback = "better" | "same" | "uncomfortable";

const breathingPatterns = [
  {
    id: "gentle",
    name: "Suave",
    description: "Una exhalación un poco más larga, sin sostener el aire.",
    phases: [
      { kind: "inhale" as BreathPhaseKind, label: "Inhala", seconds: 4, cue: "Toma aire con suavidad" },
      { kind: "exhale" as BreathPhaseKind, label: "Exhala", seconds: 6, cue: "Suelta el aire sin empujar" },
    ],
  },
  {
    id: "balanced",
    name: "Equilibrada",
    description: "Mismo tiempo al inhalar y exhalar, con una pausa breve opcional.",
    phases: [
      { kind: "inhale" as BreathPhaseKind, label: "Inhala", seconds: 4, cue: "Deja entrar el aire" },
      { kind: "hold" as BreathPhaseKind, label: "Pausa", seconds: 2, cue: "Sin apretar ni esforzarte" },
      { kind: "exhale" as BreathPhaseKind, label: "Exhala", seconds: 4, cue: "Suelta lentamente" },
    ],
  },
  {
    id: "easy",
    name: "Muy tranquila",
    description: "Un ritmo corto para comenzar o para días de poca energía.",
    phases: [
      { kind: "inhale" as BreathPhaseKind, label: "Inhala", seconds: 3, cue: "Solo hasta donde sea cómodo" },
      { kind: "exhale" as BreathPhaseKind, label: "Exhala", seconds: 4, cue: "Afloja hombros y mandíbula" },
    ],
  },
] as const;

const breathingDurations = [60, 120, 180] as const;

export default function ActivitiesPage({ preferences, notify, taskPlans, emotionCalendar, onHelp, onTalkToKahy, initialActivity, initialPlanId }: {
  preferences: Preferences;
  notify: (text: string) => void;
  taskPlans: TaskPlansApi;
  emotionCalendar: EmotionCalendarApi;
  onHelp: () => void;
  onTalkToKahy: (draft: string) => void;
  initialActivity?: Activity;
  initialPlanId?: string;
}) {
  const [activity, setActivity] = useState<Activity | null>(initialActivity ?? null);
  const activeTasks = taskPlans.active.length;
  return (
    <div className="page">
      <div className="page-heading"><div><span className="eyebrow">A tu ritmo</span><h1>Actividades breves</h1><p>Herramientas de demostración para probar calma, organización y registro emocional.</p></div><DemoBadge>Sin evaluación clínica</DemoBadge></div>
      {!activity ? <div className="activity-grid">
        <button className="activity-card breath" onClick={() => setActivity("breathing")}><span className="activity-illustration"><Wind /></span><span className="pill">1–3 min</span><h2>Respiración guiada</h2><p>Un ritmo visual de inhalar, pausar y exhalar.</p><span className="text-link">Comenzar <Play size={17} /></span></button>
        <button className="activity-card task" onClick={() => setActivity("task")}><span className="activity-illustration"><ListChecks /></span><span className="pill">{activeTasks ? `${activeTasks} ${activeTasks === 1 ? "tarea en curso" : "tareas en curso"}` : "Con ayuda de IA"}</span><h2>Desglosar una tarea</h2><p>Convierte algo grande en pasos pequeños, márcalos al avanzar y retómalos cuando quieras.</p><span className="text-link">{activeTasks ? "Continuar" : "Desglosar"} <ListChecks size={17} /></span></button>
        <button className="activity-card clouds" onClick={() => setActivity("clouds")}><span className="activity-illustration"><Cloud /></span><span className="pill">Juego tranquilo</span><h2>Un paseo entre nubes</h2><p>Guía un globo despacito entre las nubes, a tu propio ritmo.</p><span className="text-link">Jugar <Play size={17} /></span></button>
        <button className="activity-card body" onClick={() => setActivity("body")}><span className="activity-illustration"><HeartPulse /></span><span className="pill">Juego educativo</span><h2>El Inspector del Cuerpo</h2><p>Explora qué le pasa a tu cuerpo con la ansiedad y ayúdalo a calmarse.</p><span className="text-link">Explorar <Play size={17} /></span></button>
        <button className="activity-card bubbles" onClick={() => setActivity("bubbles")}><span className="activity-illustration"><Bubbles /></span><span className="pill">Regulación emocional</span><h2>Suelta la burbuja</h2><p>Piensa en algo que te abrume y suéltalo, una burbuja a la vez.</p><span className="text-link">Jugar <Play size={17} /></span></button>
      </div> : <div className="activity-detail"><button className="back-link" onClick={() => setActivity(null)}>← Todas las actividades</button>{activity === "breathing" && <Breathing reducedMotion={preferences.reducedMotion} onTalkToKahy={onTalkToKahy} />}{activity === "task" && <TaskBreakdown taskPlans={taskPlans} emotionCalendar={emotionCalendar} notify={notify} onHelp={onHelp} onTalkToKahy={onTalkToKahy} reducedMotion={preferences.reducedMotion} initialPlanId={initialPlanId} />}{activity === "clouds" && <CloudWalk />}{activity === "body" && <BodyInspector />}{activity === "bubbles" && <BubblePop />}</div>}
    </div>
  );
}

function Breathing({ reducedMotion, onTalkToKahy }: { reducedMotion: boolean; onTalkToKahy: (draft: string) => void }) {
  const [stage, setStage] = useState<BreathStage>("setup");
  const [patternId, setPatternId] = useState<(typeof breathingPatterns)[number]["id"]>("gentle");
  const [duration, setDuration] = useState<(typeof breathingDurations)[number]>(120);
  const [running, setRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [phaseSeconds, setPhaseSeconds] = useState(4);
  const [remainingSeconds, setRemainingSeconds] = useState(120);
  const [cycles, setCycles] = useState(0);
  const [feedback, setFeedback] = useState<BreathFeedback | null>(null);
  const pattern = useMemo(() => breathingPatterns.find((item) => item.id === patternId) ?? breathingPatterns[0], [patternId]);
  const phase = pattern.phases[phaseIndex] ?? pattern.phases[0];
  const elapsed = duration - remainingSeconds;
  const progress = Math.min(100, Math.max(0, (elapsed / duration) * 100));

  useEffect(() => {
    if (!running || stage !== "practice") return;
    const timer = window.setTimeout(() => {
      if (remainingSeconds <= 1) {
        setRemainingSeconds(0);
        setRunning(false);
        setStage("complete");
        return;
      }
      setRemainingSeconds((value) => value - 1);
      if (phaseSeconds > 1) {
        setPhaseSeconds((value) => value - 1);
        return;
      }
      const next = (phaseIndex + 1) % pattern.phases.length;
      if (next === 0) setCycles((value) => value + 1);
      setPhaseIndex(next);
      setPhaseSeconds(pattern.phases[next].seconds);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [running, stage, remainingSeconds, phaseSeconds, phaseIndex, pattern]);

  function startPractice() {
    setStage("practice");
    setRunning(true);
    setPhaseIndex(0);
    setPhaseSeconds(pattern.phases[0].seconds);
    setRemainingSeconds(duration);
    setCycles(0);
    setFeedback(null);
  }

  function restartPractice() {
    setRunning(false);
    setStage("setup");
    setPhaseIndex(0);
    setPhaseSeconds(pattern.phases[0].seconds);
    setRemainingSeconds(duration);
    setCycles(0);
    setFeedback(null);
  }

  function finishEarly() {
    setRunning(false);
    setStage("complete");
  }

  function formatTime(value: number) {
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  function talkAboutResult() {
    const result = feedback === "better" ? "me ayudó un poco" : feedback === "same" ? "me siento más o menos igual" : feedback === "uncomfortable" ? "me resultó incómoda" : "acabo de terminarla";
    onTalkToKahy(`Hice la respiración guiada y ${result}. Quiero contarte cómo me siento ahora.`);
  }

  return <Card className={`breathing-panel breathing-panel--${stage}`}>
    <div className="activity-title breathing-title">
      <span className="activity-illustration"><Wind /></span>
      <div><DemoBadge>Práctica guiada</DemoBadge><h1>Un respiro a tu ritmo</h1><p>Sigue la guía sin forzarte. Respirar de manera natural también está bien.</p></div>
    </div>

    {stage === "setup" && <div className="breathing-setup">
      <section className="breathing-preparation" aria-labelledby="breathing-ready-title">
        <span className="breathing-section-icon"><ShieldCheck size={21} /></span>
        <div><span className="eyebrow">Antes de empezar</span><h2 id="breathing-ready-title">Ponte lo más cómodo posible</h2></div>
        <ol>
          <li><span>1</span><div><strong>Afloja un poco el cuerpo</strong><small>Apoya los pies o recuéstate si eso te resulta mejor.</small></div></li>
          <li><span>2</span><div><strong>No busques hacerlo perfecto</strong><small>Puedes volver a tu respiración normal en cualquier momento.</small></div></li>
          <li><span>3</span><div><strong>Escucha tus señales</strong><small>Si sientes mareo, dolor o incomodidad, detente y descansa.</small></div></li>
        </ol>
      </section>

      <section className="breathing-options" aria-labelledby="breathing-options-title">
        <div className="breathing-section-heading"><div><span className="eyebrow">Personaliza la guía</span><h2 id="breathing-options-title">Elige un ritmo cómodo</h2></div><Timer size={22} /></div>
        <div className="breathing-patterns" role="radiogroup" aria-label="Ritmo de respiración">
          {breathingPatterns.map((item) => <button key={item.id} type="button" role="radio" aria-checked={patternId === item.id} className={patternId === item.id ? "active" : ""} onClick={() => setPatternId(item.id)}>
            <span className="breathing-choice-top"><strong>{item.name}</strong>{patternId === item.id && <Check size={17} aria-hidden="true" />}</span>
            <small>{item.description}</small>
            <span className="breathing-ratio">{item.phases.map((itemPhase) => `${itemPhase.label} ${itemPhase.seconds}s`).join(" · ")}</span>
          </button>)}
        </div>
        <fieldset className="breathing-duration"><legend>¿Cuánto tiempo quieres practicar?</legend><div>{breathingDurations.map((value) => <button key={value} type="button" className={duration === value ? "active" : ""} aria-pressed={duration === value} onClick={() => setDuration(value)}>{value / 60} {value === 60 ? "minuto" : "minutos"}</button>)}</div></fieldset>
        <Button className="breathing-start" onClick={startPractice}><Play size={18} /> Comenzar mi práctica</Button>
      </section>
    </div>}

    {stage === "practice" && <div className="breathing-practice">
      <div className="breathing-session-meta"><div><small>Tiempo restante</small><strong>{formatTime(remainingSeconds)}</strong></div><div><small>Ciclos completos</small><strong>{cycles}</strong></div></div>
      <div className="breathing-progress" role="progressbar" aria-label="Progreso de la práctica" aria-valuemin={0} aria-valuemax={duration} aria-valuenow={elapsed}><span style={{ width: `${progress}%` }} /></div>
      <div className="breathing-stage">
        <div className={`breathing-orb phase-${phase.kind} ${running && !reducedMotion ? "running" : ""}`} style={{ "--breath-duration": `${phase.seconds}s` } as CSSProperties}>
          <span className="breathing-orb-ring breathing-orb-ring--outer" aria-hidden="true" /><span className="breathing-orb-ring breathing-orb-ring--inner" aria-hidden="true" />
          <div className="breathing-orb-copy"><strong aria-live="polite">{running ? phase.label : "En pausa"}</strong><span>{phaseSeconds}</span><small>{running ? phase.cue : "Continúa cuando te sientas listo"}</small></div>
        </div>
        <div className="breath-steps" aria-label="Secuencia elegida">{pattern.phases.map((item, index) => <span className={index === phaseIndex ? "active" : ""} key={item.kind}>{item.label} {item.seconds}s</span>)}</div>
      </div>
      <div className="activity-controls breathing-controls"><Button onClick={() => setRunning((value) => !value)}>{running ? <><CirclePause size={18} /> Pausar</> : <><Play size={18} /> Continuar</>}</Button><Button variant="ghost" onClick={finishEarly}>Terminar por ahora</Button><button type="button" className="breathing-reset-link" onClick={restartPractice}><RotateCcw size={16} /> Cambiar ritmo</button></div>
      <p className="breathing-safety-note"><ShieldCheck size={17} /> No tienes que completar el tiempo. Detente si algo no se siente bien.</p>
    </div>}

    {stage === "complete" && <div className="breathing-complete">
      <span className="breathing-complete-icon"><Check size={28} /></span>
      <span className="eyebrow">Práctica terminada</span>
      <h2>Te diste un momento para pausar</h2>
      <p>No tiene que sentirse perfecto para contar. Nota, sin juzgar, cómo estás ahora.</p>
      <div className="breathing-summary"><span><strong>{formatTime(elapsed)}</strong><small>tiempo practicado</small></span><span><strong>{cycles}</strong><small>{cycles === 1 ? "ciclo completo" : "ciclos completos"}</small></span></div>
      <fieldset className="breathing-feedback"><legend>¿Cómo te cayó esta práctica?</legend><div>
        <button type="button" className={feedback === "better" ? "active" : ""} aria-pressed={feedback === "better"} onClick={() => setFeedback("better")}>Un poco mejor</button>
        <button type="button" className={feedback === "same" ? "active" : ""} aria-pressed={feedback === "same"} onClick={() => setFeedback("same")}>Más o menos igual</button>
        <button type="button" className={feedback === "uncomfortable" ? "active" : ""} aria-pressed={feedback === "uncomfortable"} onClick={() => setFeedback("uncomfortable")}>Me incomodó</button>
      </div></fieldset>
      {feedback === "uncomfortable" && <p className="breathing-feedback-note" role="status">Gracias por notarlo. No repitas la práctica ahora; vuelve a respirar con normalidad y busca apoyo si la molestia continúa.</p>}
      <div className="activity-controls"><Button onClick={talkAboutResult}>Hablarlo con KAHY</Button><Button variant="ghost" onClick={startPractice}><RotateCcw size={17} /> Repetir</Button><button type="button" className="breathing-reset-link" onClick={restartPractice}>Elegir otro ritmo</button></div>
    </div>}
  </Card>;
}

function CloudWalk() {
  return <Card className="clouds-panel"><div className="activity-title"><span className="activity-illustration"><Cloud /></span><div><DemoBadge>Juego de demostración</DemoBadge><h1>Un paseo entre nubes</h1><p>Sin puntajes que juzgar ni límite de tiempo. Cierra cuando quieras.</p></div></div><a className="game-fullscreen-link" href="/games/paseo-entre-nubes/index.html" target="_blank" rel="noreferrer"><Maximize2 size={17} /> Abrir en pantalla completa</a><div className="game-frame game-frame--clouds"><iframe src="/games/paseo-entre-nubes/index.html" title="Un paseo entre nubes" loading="lazy" /></div></Card>;
}

function BodyInspector() {
  return <Card className="body-panel"><div className="activity-title"><span className="activity-illustration"><HeartPulse /></span><div><DemoBadge>Juego de demostración</DemoBadge><h1>El Inspector del Cuerpo</h1><p>Sin diagnóstico ni evaluación: solo una forma amable de entender las señales del cuerpo.</p></div></div><a className="game-fullscreen-link" href="/games/inspector-del-cuerpo/index.html" target="_blank" rel="noreferrer"><Maximize2 size={17} /> Abrir en pantalla completa</a><div className="game-frame game-frame--body"><iframe src="/games/inspector-del-cuerpo/index.html" title="El Inspector del Cuerpo" loading="lazy" /></div></Card>;
}

function BubblePop() {
  return <Card className="bubbles-panel"><div className="activity-title"><span className="activity-illustration"><Bubbles /></span><div><DemoBadge>Juego de demostración</DemoBadge><h1>Suelta la burbuja</h1><p>Mantén presionado para empezar y suelta cada burbuja a tu propio ritmo.</p></div></div><a className="game-fullscreen-link" href="/games/suelta-la-burbuja/index.html" target="_blank" rel="noreferrer"><Maximize2 size={17} /> Abrir en pantalla completa</a><div className="game-frame game-frame--bubbles"><iframe src="/games/suelta-la-burbuja/index.html" title="Suelta la burbuja" loading="lazy" /></div></Card>;
}
