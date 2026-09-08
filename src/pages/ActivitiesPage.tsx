import { Check, CirclePause, Cloud, Flower2, HeartPulse, Leaf, ListChecks, Play, RotateCcw, Sparkles, Wind } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, DemoBadge, Progress } from "../components/ui";
import type { Preferences } from "../types";

type Activity = "breathing" | "garden" | "emotions" | "task" | "clouds" | "body";
const phases = [
  { label: "Inhala", seconds: 4 },
  { label: "Pausa", seconds: 2 },
  { label: "Exhala", seconds: 6 },
];

export default function ActivitiesPage({ preferences, notify }: { preferences: Preferences; notify: (text: string) => void }) {
  const [activity, setActivity] = useState<Activity | null>(null);
  return (
    <div className="page">
      <div className="page-heading"><div><span className="eyebrow">A tu ritmo</span><h1>Actividades breves</h1><p>Herramientas de demostración para probar calma, organización y registro emocional.</p></div><DemoBadge>Sin evaluación clínica</DemoBadge></div>
      {!activity ? <div className="activity-grid">
        <button className="activity-card breath" onClick={() => setActivity("breathing")}><span className="activity-illustration"><Wind /></span><span className="pill">1–3 min</span><h2>Respiración guiada</h2><p>Un ritmo visual de inhalar, pausar y exhalar.</p><span className="text-link">Comenzar <Play size={17} /></span></button>
        <button className="activity-card garden" onClick={() => setActivity("garden")}><span className="activity-illustration"><Flower2 /></span><span className="pill">Interactiva</span><h2>Jardín de pequeñas acciones</h2><p>Haz crecer una escena con acciones simbólicas.</p><span className="text-link">Abrir jardín <Leaf size={17} /></span></button>
        <button className="activity-card emotion" onClick={() => setActivity("emotions")}><span className="activity-illustration"><Sparkles /></span><span className="pill">1 min</span><h2>Nombrar una emoción</h2><p>Elige una palabra sin que la plataforma la interprete.</p><span className="text-link">Explorar <Sparkles size={17} /></span></button>
        <button className="activity-card task" onClick={() => setActivity("task")}><span className="activity-illustration"><ListChecks /></span><span className="pill">2 min</span><h2>Desglosar una tarea</h2><p>Convierte algo grande en un siguiente paso posible.</p><span className="text-link">Desglosar <ListChecks size={17} /></span></button>
        <button className="activity-card clouds" onClick={() => setActivity("clouds")}><span className="activity-illustration"><Cloud /></span><span className="pill">Juego tranquilo</span><h2>Un paseo entre nubes</h2><p>Guía un globo despacito entre las nubes, a tu propio ritmo.</p><span className="text-link">Jugar <Play size={17} /></span></button>
        <button className="activity-card body" onClick={() => setActivity("body")}><span className="activity-illustration"><HeartPulse /></span><span className="pill">Juego educativo</span><h2>El Inspector del Cuerpo</h2><p>Explora qué le pasa a tu cuerpo con la ansiedad y ayúdalo a calmarse.</p><span className="text-link">Explorar <Play size={17} /></span></button>
      </div> : <div className="activity-detail"><button className="back-link" onClick={() => setActivity(null)}>← Todas las actividades</button>{activity === "breathing" && <Breathing reducedMotion={preferences.reducedMotion} />}{activity === "garden" && <Garden notify={notify} />}{activity === "emotions" && <Emotions />}{activity === "task" && <TaskBreakdown notify={notify} />}{activity === "clouds" && <CloudWalk />}{activity === "body" && <BodyInspector />}</div>}
    </div>
  );
}

function Breathing({ reducedMotion }: { reducedMotion: boolean }) {
  const [running, setRunning] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [seconds, setSeconds] = useState(phases[0].seconds);
  const [cycles, setCycles] = useState(0);
  const phase = phases[phaseIndex];

  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      if (seconds > 1) setSeconds(seconds - 1);
      else {
        const next = (phaseIndex + 1) % phases.length;
        if (next === 0) setCycles((value) => value + 1);
        setPhaseIndex(next);
        setSeconds(phases[next].seconds);
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [running, seconds, phaseIndex]);

  function reset() { setRunning(false); setPhaseIndex(0); setSeconds(phases[0].seconds); setCycles(0); }
  return <Card className="breathing-panel"><div className="activity-title"><span className="activity-illustration"><Wind /></span><div><DemoBadge>Guía de demostración</DemoBadge><h1>Respiración 4 · 2 · 6</h1><p>Detente si resulta incómodo. No necesitas mantener el ritmo perfecto.</p></div></div><div className="breathing-stage"><div className={`breathing-orb phase-${phaseIndex} ${running && !reducedMotion ? "running" : ""}`}><strong>{phase.label}</strong><span>{seconds}</span></div><div className="breath-steps">{phases.map((item, index) => <span className={index === phaseIndex ? "active" : ""} key={item.label}>{item.label} {item.seconds}s</span>)}</div><p>Ciclos completos: {cycles}</p></div><div className="activity-controls"><Button onClick={() => setRunning(!running)}>{running ? <><CirclePause size={18} /> Pausar</> : <><Play size={18} /> {cycles ? "Continuar" : "Comenzar"}</>}</Button><Button variant="ghost" onClick={reset}><RotateCcw size={18} /> Reiniciar</Button></div></Card>;
}

function Garden({ notify }: { notify: (text: string) => void }) {
  const [growth, setGrowth] = useState(0);
  const actions = ["Tomé agua", "Abrí una ventana", "Hice una pausa", "Pedí apoyo", "Completé un paso"];
  return <Card className="garden-panel"><div className="activity-title"><span className="activity-illustration"><Flower2 /></span><div><DemoBadge>Juego simbólico</DemoBadge><h1>Jardín de pequeñas acciones</h1><p>Marca una acción de autocuidado para añadir una planta. No es una meta clínica ni una racha.</p></div></div><Progress value={growth} max={8} label="Crecimiento del jardín" /><div className="garden-scene" aria-label={`Jardín con ${growth} plantas`}><div className="garden-sky" />{Array.from({ length: growth }).map((_, index) => <span className={`plant plant-${index % 3}`} key={index}>{index % 3 === 0 ? "♧" : index % 3 === 1 ? "♢" : "✿"}</span>)}<div className="garden-ground" /></div><div className="action-chip-grid">{actions.map((item) => <button key={item} onClick={() => { if (growth < 8) { setGrowth(growth + 1); notify("Añadiste una planta al jardín de esta sesión."); } }} disabled={growth >= 8}><Leaf size={17} />{item}</button>)}</div>{growth >= 8 && <p className="completion-note"><Check size={18} /> El jardín está completo por ahora. Puedes reiniciarlo sin perder ninguna racha.</p>}<Button variant="ghost" onClick={() => setGrowth(0)}><RotateCcw size={18} /> Reiniciar jardín</Button></Card>;
}

function Emotions() {
  const emotions = ["Agotamiento", "Ansiedad", "Calma", "Confusión", "Enojo", "Tristeza", "Esperanza", "No sé todavía"];
  const [selected, setSelected] = useState("");
  return <Card className="emotion-panel"><div className="activity-title"><span className="activity-illustration"><Sparkles /></span><div><DemoBadge>Registro efímero</DemoBadge><h1>Nombrar sin juzgar</h1><p>Elige una palabra aproximada. No se guarda ni se usa para inferir nada.</p></div></div><div className="emotion-cloud">{emotions.map((item) => <button key={item} className={selected === item ? "active" : ""} onClick={() => setSelected(item)}>{selected === item && <Check size={17} />}{item}</button>)}</div>{selected && <div className="reflection-box"><strong>Elegiste: {selected}</strong><p>Una palabra no define todo lo que estás viviendo. Puedes cambiarla o cerrar la actividad.</p></div>}</Card>;
}

function CloudWalk() {
  return <Card className="clouds-panel"><div className="activity-title"><span className="activity-illustration"><Cloud /></span><div><DemoBadge>Juego de demostración</DemoBadge><h1>Un paseo entre nubes</h1><p>Sin puntajes que juzgar ni límite de tiempo. Cierra cuando quieras.</p></div></div><div className="game-frame"><iframe src="/games/paseo-entre-nubes/index.html" title="Un paseo entre nubes" loading="lazy" /></div></Card>;
}

function BodyInspector() {
  return <Card className="body-panel"><div className="activity-title"><span className="activity-illustration"><HeartPulse /></span><div><DemoBadge>Juego de demostración</DemoBadge><h1>El Inspector del Cuerpo</h1><p>Sin diagnóstico ni evaluación: solo una forma amable de entender las señales del cuerpo.</p></div></div><div className="game-frame"><iframe src="/games/inspector-del-cuerpo/index.html" title="El Inspector del Cuerpo" loading="lazy" /></div></Card>;
}

function TaskBreakdown({ notify }: { notify: (text: string) => void }) {
  const [task, setTask] = useState("");
  const [steps, setSteps] = useState([""]);
  return <Card className="task-panel"><div className="activity-title"><span className="activity-illustration"><ListChecks /></span><div><DemoBadge>Herramienta local</DemoBadge><h1>Haz más pequeño el siguiente paso</h1><p>Trabaja con acciones observables y breves.</p></div></div><label className="field plain"><span>Tarea grande</span><input value={task} onChange={(event) => setTask(event.target.value)} placeholder="Ej. preparar una exposición" /></label><div className="step-builder"><h3>Siguientes pasos pequeños</h3>{steps.map((step, index) => <label key={index}><span>{index + 1}</span><input value={step} onChange={(event) => setSteps(steps.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={index === 0 ? "Ej. abrir el documento" : "Otro paso opcional"} /></label>)}{steps.length < 4 && <Button variant="ghost" onClick={() => setSteps([...steps, ""])}>+ Añadir otro paso</Button>}</div><Button onClick={() => notify(task && steps.some(Boolean) ? "Plan listo en esta sesión. Nada se guardó." : "Escribe una tarea y al menos un paso.")}>Terminar plan de prueba</Button></Card>;
}
