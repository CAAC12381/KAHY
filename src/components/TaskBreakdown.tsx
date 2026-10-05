import { Check, ChevronDown, ChevronUp, Clock, ListChecks, MessageCircle, Pause, Play, Plus, RotateCcw, Scissors, Sparkles, Target, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, DemoBadge } from "./ui";
import { MAX_STEPS, makeStep, type TaskPlansApi } from "../hooks/useTaskPlans";
import type { EmotionCalendarApi } from "../hooks/useEmotionCalendar";
import { useBackNavigation } from "../lib/backNavigation";
import { emotionLabels, emotionTone } from "../lib/emotionLexicon";
import { detectSafetySignal } from "../mock/conversation";
import { requestBreakdown } from "../services/taskApi";
import type { EmotionName, TaskEnergy, TaskPlan, TaskStep } from "../types";

type Screen = { mode: "list" } | { mode: "new" } | { mode: "plan"; id: string } | { mode: "focus"; id: string };

const energyOptions: Array<{ id: TaskEnergy; label: string; hint: string }> = [
  { id: "poca", label: "Poca", hint: "Pasos mínimos" },
  { id: "media", label: "Media", hint: "Ritmo normal" },
  { id: "bastante", label: "Bastante", hint: "Bloques más largos" },
];
const feelingsBefore: EmotionName[] = ["agobio", "ansiedad", "cansancio", "confusión", "frustración", "calma", "esperanza"];
const feelingsAfter: EmotionName[] = ["alivio", "alegría", "calma", "esperanza", "cansancio", "frustración"];
const minuteOptions = [1, 2, 5, 10, 15, 20, 25, 30, 45, 60];
const sourceLabels: Record<TaskPlan["source"], string> = { ia: "Sugerido por la IA de KAHY", local: "Sugerido por KAHY sin conexión", manual: "Pasos escritos por ti", chat: "Creado desde el chat" };

function nextStep(plan: TaskPlan) {
  return plan.steps.find((step) => !step.done && step.text.trim());
}

function remainingMinutes(plan: TaskPlan) {
  return plan.steps.filter((step) => !step.done).reduce((total, step) => total + (step.minutes || 0), 0);
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function FeelingChips({ options, value, onPick, label }: { options: EmotionName[]; value?: EmotionName; onPick: (emotion: EmotionName) => void; label: string }) {
  return <div className="feeling-chips" role="group" aria-label={label}>{options.map((emotion) => <button key={emotion} type="button" className={`feeling-chip tone-${emotionTone(emotion)} ${value === emotion ? "active" : ""}`} aria-pressed={value === emotion} onClick={() => onPick(emotion)}>{emotionLabels[emotion]}</button>)}</div>;
}

function PlanProgress({ plan }: { plan: TaskPlan }) {
  const total = plan.steps.length;
  const done = plan.steps.filter((step) => step.done).length;
  const minutes = remainingMinutes(plan);
  return (
    <div className="task-progress">
      <div className="task-progress-label"><strong>{done} de {total} {total === 1 ? "paso" : "pasos"}</strong>{!plan.completedAt && minutes > 0 && <span><Clock size={14} /> ≈ {minutes} min restantes</span>}</div>
      <div className="task-progress-track" role="progressbar" aria-label="Avance de la tarea" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}><span style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
    </div>
  );
}

export default function TaskBreakdown({ taskPlans, emotionCalendar, notify, onHelp, onTalkToKahy, reducedMotion, initialPlanId }: {
  taskPlans: TaskPlansApi;
  emotionCalendar: EmotionCalendarApi;
  notify: (text: string) => void;
  onHelp: () => void;
  onTalkToKahy: (draft: string) => void;
  reducedMotion: boolean;
  initialPlanId?: string;
}) {
  const [screen, setScreen] = useState<Screen>(() => initialPlanId ? { mode: "plan", id: initialPlanId } : taskPlans.plans.length ? { mode: "list" } : { mode: "new" });
  const [encouragement, setEncouragement] = useState<{ planId: string; text: string } | null>(null);
  const plan = screen.mode === "plan" || screen.mode === "focus" ? taskPlans.plans.find((item) => item.id === screen.id) : undefined;

  useEffect(() => {
    if ((screen.mode === "plan" || screen.mode === "focus") && !plan) setScreen({ mode: "list" });
  }, [screen, plan]);

  // Dentro de una tarea, la flecha de la barra superior regresa un nivel; en la lista manda la de Actividades.
  const innerBack = screen.mode === "focus"
    ? { label: "Todos los pasos", go: () => setScreen({ mode: "plan", id: screen.id }) }
    : screen.mode === "plan" || (screen.mode === "new" && taskPlans.plans.length > 0)
      ? { label: "Mis tareas", go: () => setScreen({ mode: "list" }) }
      : null;
  useBackNavigation(2, innerBack?.label ?? "", () => innerBack?.go(), innerBack !== null);

  function recordFeeling(emotion: EmotionName, moment: "antes" | "después") {
    emotionCalendar.record({
      primary: emotion,
      detail: moment === "antes" ? "al pensar en una tarea pendiente" : "al terminar una tarea desglosada",
      intensity: "media",
      progress: moment === "antes" ? "identificó" : "actuó",
      confidence: "alta",
    });
  }

  return (
    <Card className="task-panel">
      <div className="activity-title"><span className="activity-illustration"><ListChecks /></span><div><DemoBadge>Se guarda en este dispositivo</DemoBadge><h1>Haz más pequeño el siguiente paso</h1><p>Convierte algo que pesa en acciones cortas y concretas. Avanza a tu ritmo: pausar también cuenta.</p></div></div>
      {screen.mode === "list" && <PlanList taskPlans={taskPlans} onOpen={(id) => setScreen({ mode: "plan", id })} onNew={() => setScreen({ mode: "new" })} />}
      {screen.mode === "new" && <NewPlan
        hasPlans={taskPlans.plans.length > 0}
        onCancel={() => setScreen({ mode: "list" })}
        onHelp={onHelp}
        onCreate={(input, message) => {
          const created = taskPlans.create(input);
          if (input.feelingBefore) recordFeeling(input.feelingBefore, "antes");
          if (message) setEncouragement({ planId: created.id, text: message });
          setScreen({ mode: "plan", id: created.id });
        }}
      />}
      {screen.mode === "plan" && plan && <PlanEditor
        plan={plan}
        taskPlans={taskPlans}
        encouragement={encouragement?.planId === plan.id ? encouragement.text : ""}
        onDismissEncouragement={() => setEncouragement(null)}
        onBack={() => setScreen({ mode: "list" })}
        onFocus={() => setScreen({ mode: "focus", id: plan.id })}
        onNew={() => setScreen({ mode: "new" })}
        onHelp={onHelp}
        notify={notify}
        onTalkToKahy={onTalkToKahy}
        onFeelingAfter={(emotion) => { taskPlans.update(plan.id, (current) => ({ ...current, feelingAfter: emotion })); recordFeeling(emotion, "después"); }}
        reducedMotion={reducedMotion}
      />}
      {screen.mode === "focus" && plan && <FocusMode plan={plan} taskPlans={taskPlans} onExit={() => setScreen({ mode: "plan", id: plan.id })} onHelp={onHelp} notify={notify} />}
    </Card>
  );
}

function PlanList({ taskPlans, onOpen, onNew }: { taskPlans: TaskPlansApi; onOpen: (id: string) => void; onNew: () => void }) {
  const active = [...taskPlans.active].reverse();
  const finished = taskPlans.plans.filter((plan) => plan.completedAt).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  return (
    <div className="task-list-view">
      <div className="task-section-head"><h2>Tus tareas</h2><Button onClick={onNew}><Plus size={18} /> Nueva tarea</Button></div>
      {active.length === 0 && <p className="task-empty">No tienes tareas en curso. Cuando algo se sienta grande, escríbelo aquí y lo hacemos más pequeño.</p>}
      <div className="task-cards">
        {active.map((plan) => {
          const next = nextStep(plan);
          return (
            <button className="task-card" key={plan.id} onClick={() => onOpen(plan.id)}>
              <span className="task-card-title">{plan.title}</span>
              <PlanProgress plan={plan} />
              {next && <span className="task-card-next"><Target size={15} /> Siguiente: {next.text}</span>}
            </button>
          );
        })}
      </div>
      {finished.length > 0 && <details className="task-finished">
        <summary>Tareas terminadas ({finished.length})</summary>
        <ul>{finished.map((plan) => <li key={plan.id}>
          <button className="task-finished-open" onClick={() => onOpen(plan.id)}><Check size={15} /> <span>{plan.title}</span></button>
          <small>{formatDate(plan.completedAt || plan.updatedAt)}{plan.feelingBefore && plan.feelingAfter ? ` · ${emotionLabels[plan.feelingBefore]} → ${emotionLabels[plan.feelingAfter]}` : ""}</small>
          <button className="task-icon-button" onClick={() => { if (window.confirm(`¿Eliminar "${plan.title}"?`)) taskPlans.remove(plan.id); }} aria-label={`Eliminar ${plan.title}`}><Trash2 size={15} /></button>
        </li>)}</ul>
      </details>}
    </div>
  );
}

function NewPlan({ hasPlans, onCancel, onCreate, onHelp }: {
  hasPlans: boolean;
  onCancel: () => void;
  onCreate: (input: Parameters<TaskPlansApi["create"]>[0], encouragement?: string) => void;
  onHelp: () => void;
}) {
  const [title, setTitle] = useState("");
  const [energy, setEnergy] = useState<TaskEnergy>("media");
  const [feeling, setFeeling] = useState<EmotionName | undefined>();
  const [loading, setLoading] = useState(false);
  const clean = title.trim();

  async function suggest() {
    if (!clean || loading) return;
    if (detectSafetySignal(clean)) { onHelp(); return; }
    setLoading(true);
    const result = await requestBreakdown(clean, energy);
    setLoading(false);
    if (result.kind === "safety") { onHelp(); return; }
    onCreate({ title: clean, energy, source: result.source, feelingBefore: feeling, steps: result.steps.map((step) => makeStep(step.text, step.minutes)) }, result.encouragement);
  }

  function manual() {
    if (!clean) return;
    onCreate({ title: clean, energy, source: "manual", feelingBefore: feeling, steps: [makeStep("")] });
  }

  return (
    <form className="task-new" onSubmit={(event) => { event.preventDefault(); void suggest(); }}>
      <label className="field plain"><span>¿Qué tarea te está pesando?</span><input value={title} maxLength={240} onChange={(event) => setTitle(event.target.value)} placeholder="Ej. preparar la exposición de biología" autoFocus /></label>
      <fieldset className="task-fieldset"><legend>¿Cuánta energía tienes ahora?</legend>
        <div className="energy-options">{energyOptions.map((option) => <button type="button" key={option.id} className={energy === option.id ? "active" : ""} aria-pressed={energy === option.id} onClick={() => setEnergy(option.id)}><strong>{option.label}</strong><small>{option.hint}</small></button>)}</div>
      </fieldset>
      <fieldset className="task-fieldset"><legend>¿Cómo te hace sentir esta tarea? <small>Opcional · se anota en tu calendario emocional</small></legend>
        <FeelingChips options={feelingsBefore} value={feeling} onPick={(emotion) => setFeeling(feeling === emotion ? undefined : emotion)} label="Cómo te hace sentir la tarea" />
      </fieldset>
      <div className="task-new-actions">
        <Button type="submit" disabled={!clean || loading}>{loading ? <><span className="task-spinner" aria-hidden="true" /> Pensando pasos pequeños…</> : <><Sparkles size={18} /> Ayúdame a dividirla</>}</Button>
        <Button type="button" variant="secondary" disabled={!clean || loading} onClick={manual}>Prefiero escribir mis pasos</Button>
        {hasPlans && <Button type="button" variant="ghost" onClick={onCancel}>Ver mis tareas</Button>}
      </div>
      <p className="fine-print">Si la IA en línea no está disponible, KAHY sugiere pasos desde este dispositivo. Evita escribir datos personales identificables.</p>
    </form>
  );
}

function PlanEditor({ plan, taskPlans, encouragement, onDismissEncouragement, onBack, onFocus, onNew, onHelp, notify, onTalkToKahy, onFeelingAfter, reducedMotion }: {
  plan: TaskPlan;
  taskPlans: TaskPlansApi;
  encouragement: string;
  onDismissEncouragement: () => void;
  onBack: () => void;
  onFocus: () => void;
  onNew: () => void;
  onHelp: () => void;
  notify: (text: string) => void;
  onTalkToKahy: (draft: string) => void;
  onFeelingAfter: (emotion: EmotionName) => void;
  reducedMotion: boolean;
}) {
  const [splitting, setSplitting] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const next = nextStep(plan);
  const nextIndex = next ? plan.steps.indexOf(next) : -1;

  function setSteps(change: (steps: TaskStep[]) => TaskStep[]) {
    taskPlans.update(plan.id, (current) => ({ ...current, steps: change(current.steps) }));
  }

  function toggle(step: TaskStep) {
    setSteps((steps) => steps.map((item) => item.id === step.id ? { ...item, done: !item.done, doneAt: item.done ? undefined : Date.now() } : item));
    if (!step.done) {
      const remaining = plan.steps.filter((item) => !item.done && item.id !== step.id && item.text.trim()).length;
      if (remaining > 0) notify(remaining === 1 ? "Un paso menos. Solo queda uno." : `Un paso menos. Quedan ${remaining}.`);
    }
  }

  function move(index: number, direction: -1 | 1) {
    setSteps((steps) => {
      const target = index + direction;
      if (target < 0 || target >= steps.length) return steps;
      const copy = [...steps];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    });
  }

  async function split(step: TaskStep) {
    if (!step.text.trim() || splitting) return;
    if (plan.steps.length >= MAX_STEPS) { notify(`Un plan puede tener hasta ${MAX_STEPS} pasos. Borra o termina alguno primero.`); return; }
    if (detectSafetySignal(step.text)) { onHelp(); return; }
    setSplitting(step.id);
    const result = await requestBreakdown(plan.title, plan.energy, step.text);
    setSplitting(null);
    if (result.kind === "safety") { onHelp(); return; }
    setSteps((steps) => {
      const index = steps.findIndex((item) => item.id === step.id);
      if (index < 0) return steps;
      const room = MAX_STEPS - steps.length + 1;
      const pieces = result.steps.slice(0, room).map((piece) => makeStep(piece.text, piece.minutes));
      return [...steps.slice(0, index), ...pieces, ...steps.slice(index + 1)];
    });
    notify("Listo: dividí ese paso en partes más pequeñas.");
  }

  function talkDraft() {
    const done = plan.steps.filter((step) => step.done).length;
    if (plan.completedAt) return `Terminé la tarea "${plan.title}" que desglosé en KAHY. Quiero contarte cómo me fue.`;
    return next
      ? `Estoy trabajando en "${plan.title}". Llevo ${done} de ${plan.steps.length} pasos y el siguiente es "${next.text}". Me está costando avanzar, ¿me ayudas?`
      : `Quiero ayuda para desglosar la tarea "${plan.title}".`;
  }

  return (
    <div className="task-plan-view">
      <div className="task-plan-head">
        {editingTitle
          ? <input className="task-title-input" defaultValue={plan.title} maxLength={240} autoFocus aria-label="Nombre de la tarea" onBlur={(event) => { const value = event.target.value.trim(); if (value && value !== plan.title) taskPlans.update(plan.id, (current) => ({ ...current, title: value })); setEditingTitle(false); }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape") setEditingTitle(false); }} />
          : <h2><button className="task-title-button" onClick={() => setEditingTitle(true)} title="Editar nombre">{plan.title}</button></h2>}
        <div className="task-meta"><span className="pill">Energía {plan.energy}</span><span className="pill">{sourceLabels[plan.source]}</span>{plan.feelingBefore && <span className={`pill tone-${emotionTone(plan.feelingBefore)}`}>Al empezar: {emotionLabels[plan.feelingBefore]}</span>}</div>
      </div>
      <PlanProgress plan={plan} />

      {encouragement && <div className="task-encouragement" role="status"><Sparkles size={17} /><p>{encouragement}</p><button onClick={onDismissEncouragement} aria-label="Cerrar mensaje">×</button></div>}

      {plan.completedAt
        ? <CompletionCard plan={plan} reducedMotion={reducedMotion} onFeelingAfter={onFeelingAfter} onTalk={() => onTalkToKahy(talkDraft())} onNew={onNew} />
        : next && <div className="task-next-card">
          <span className="eyebrow"><Target size={14} /> Tu siguiente paso</span>
          <p>{next.text}</p>
          <div className="task-next-actions">
            <Button onClick={onFocus}><Target size={17} /> Enfocarme en este paso</Button>
            <Button variant="secondary" onClick={() => toggle(next)}><Check size={17} /> Ya lo hice</Button>
          </div>
        </div>}

      <ol className="task-steps">
        {plan.steps.map((step, index) => (
          <li key={step.id} className={`task-step ${step.done ? "done" : ""} ${index === nextIndex ? "is-next" : ""}`}>
            <button className="task-check" onClick={() => toggle(step)} disabled={!step.text.trim()} aria-pressed={step.done} aria-label={step.done ? `Desmarcar paso ${index + 1}` : `Marcar paso ${index + 1} como hecho`}>{step.done ? <Check size={16} /> : index + 1}</button>
            <textarea className="task-step-text" rows={1} value={step.text} maxLength={200} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur(); } }} placeholder={index === 0 ? "Ej. abrir el documento" : "Describe una acción pequeña"} aria-label={`Paso ${index + 1}`} onChange={(event) => setSteps((steps) => steps.map((item) => item.id === step.id ? { ...item, text: event.target.value } : item))} />
            <select className="task-minutes" value={step.minutes ?? ""} aria-label={`Minutos estimados del paso ${index + 1}`} onChange={(event) => setSteps((steps) => steps.map((item) => item.id === step.id ? { ...item, minutes: event.target.value ? Number(event.target.value) : undefined } : item))}>
              <option value="">— min</option>
              {[...new Set([...minuteOptions, ...(step.minutes ? [step.minutes] : [])])].sort((a, b) => a - b).map((value) => <option key={value} value={value}>{value} min</option>)}
            </select>
            <div className="task-step-actions">
              <button className="task-icon-button" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Subir paso"><ChevronUp size={16} /></button>
              <button className="task-icon-button" onClick={() => move(index, 1)} disabled={index === plan.steps.length - 1} aria-label="Bajar paso"><ChevronDown size={16} /></button>
              {!step.done && <button className="task-icon-button" onClick={() => split(step)} disabled={!step.text.trim() || splitting !== null} aria-label="Dividir este paso en partes más pequeñas" title="Hacerlo más pequeño">{splitting === step.id ? <span className="task-spinner small" aria-hidden="true" /> : <Scissors size={16} />}</button>}
              <button className="task-icon-button danger" onClick={() => setSteps((steps) => steps.filter((item) => item.id !== step.id))} disabled={plan.steps.length === 1} aria-label="Borrar paso"><Trash2 size={16} /></button>
            </div>
          </li>
        ))}
      </ol>
      {plan.steps.length < MAX_STEPS
        ? <Button variant="ghost" onClick={() => setSteps((steps) => [...steps, makeStep("")])}><Plus size={17} /> Añadir otro paso</Button>
        : <p className="fine-print">Llegaste al máximo de {MAX_STEPS} pasos. Si hace falta más, quizá conviene separar la tarea en dos.</p>}

      <div className="task-footer">
        <Button variant="secondary" onClick={() => onTalkToKahy(talkDraft())}><MessageCircle size={17} /> Hablar con KAHY sobre esta tarea</Button>
        <Button variant="danger" onClick={() => { if (window.confirm(`¿Eliminar "${plan.title}" y todos sus pasos?`)) { taskPlans.remove(plan.id); onBack(); } }}><Trash2 size={17} /> Eliminar tarea</Button>
      </div>
    </div>
  );
}

function CompletionCard({ plan, reducedMotion, onFeelingAfter, onTalk, onNew }: { plan: TaskPlan; reducedMotion: boolean; onFeelingAfter: (emotion: EmotionName) => void; onTalk: () => void; onNew: () => void }) {
  return (
    <div className={`task-complete ${reducedMotion ? "" : "celebrate"}`} role="status">
      {!reducedMotion && <div className="task-petals" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <i key={index} />)}</div>}
      <span className="task-complete-icon"><Check size={28} /></span>
      <h3>Terminaste todos los pasos</h3>
      <p>Lo que parecía grande se volvió una serie de acciones posibles. Date un momento antes de pasar a lo siguiente.</p>
      {plan.feelingAfter
        ? <p className="task-feeling-compare">{plan.feelingBefore ? <>Empezaste con <b>{emotionLabels[plan.feelingBefore]}</b> y terminaste con <b>{emotionLabels[plan.feelingAfter]}</b>.</> : <>Te sientes: <b>{emotionLabels[plan.feelingAfter]}</b>.</>} Quedó anotado en tu calendario emocional.</p>
        : <><p className="task-complete-question">¿Cómo te sientes ahora?</p><FeelingChips options={feelingsAfter} onPick={onFeelingAfter} label="Cómo te sientes al terminar" /></>}
      <div className="task-next-actions">
        <Button variant="secondary" onClick={onTalk}><MessageCircle size={17} /> Contarle a KAHY cómo me fue</Button>
        <Button variant="ghost" onClick={onNew}><Plus size={17} /> Desglosar otra tarea</Button>
      </div>
    </div>
  );
}

function FocusMode({ plan, taskPlans, onExit, onHelp, notify }: { plan: TaskPlan; taskPlans: TaskPlansApi; onExit: () => void; onHelp: () => void; notify: (text: string) => void }) {
  const step = nextStep(plan);
  const index = step ? plan.steps.indexOf(step) : -1;
  const [secondsLeft, setSecondsLeft] = useState((step?.minutes || 5) * 60);
  const [running, setRunning] = useState(false);
  const [splitting, setSplitting] = useState(false);
  const total = (step?.minutes || 5) * 60;

  useEffect(() => {
    setSecondsLeft((step?.minutes || 5) * 60);
    setRunning(false);
  }, [step?.id, step?.minutes]);

  useEffect(() => {
    if (!running) return;
    if (secondsLeft <= 0) { setRunning(false); return; }
    const timer = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [running, secondsLeft]);

  useEffect(() => {
    if (!step) onExit();
  }, [step, onExit]);

  if (!step) return null;

  function markDone() {
    if (!step) return;
    taskPlans.update(plan.id, (current) => ({ ...current, steps: current.steps.map((item) => item.id === step.id ? { ...item, done: true, doneAt: Date.now() } : item) }));
    const remaining = plan.steps.filter((item) => !item.done && item.id !== step.id && item.text.trim()).length;
    notify(remaining ? "Bien hecho. Cuando quieras, sigue con el próximo." : "Ese era el último paso.");
  }

  async function makeSmaller() {
    if (!step || splitting) return;
    if (plan.steps.length >= MAX_STEPS) { notify(`Un plan puede tener hasta ${MAX_STEPS} pasos.`); return; }
    setSplitting(true);
    const result = await requestBreakdown(plan.title, plan.energy, step.text);
    setSplitting(false);
    if (result.kind === "safety") { onHelp(); return; }
    taskPlans.update(plan.id, (current) => {
      const position = current.steps.findIndex((item) => item.id === step.id);
      if (position < 0) return current;
      const pieces = result.steps.slice(0, MAX_STEPS - current.steps.length + 1).map((piece) => makeStep(piece.text, piece.minutes));
      return { ...current, steps: [...current.steps.slice(0, position), ...pieces, ...current.steps.slice(position + 1)] };
    });
  }

  const minutes = Math.floor(Math.max(0, secondsLeft) / 60);
  const seconds = Math.max(0, secondsLeft) % 60;
  const finished = secondsLeft <= 0;

  return (
    <div className="task-focus">
      <span className="eyebrow">Modo enfoque · paso {index + 1} de {plan.steps.length}</span>
      <p className="task-focus-plan">{plan.title}</p>
      <h2 className="task-focus-step">{step.text}</h2>
      <div className="task-timer" role="timer" aria-live="off">
        <span className="task-timer-digits">{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</span>
        <div className="task-progress-track"><span style={{ width: `${((total - Math.max(0, secondsLeft)) / total) * 100}%` }} /></div>
      </div>
      {finished && <p className="task-focus-note" role="status">Se acabó el tiempo estimado. No pasa nada si no terminaste: puedes darte 5 minutos más o dejarlo aquí por hoy.</p>}
      <div className="task-focus-actions">
        <Button onClick={markDone}><Check size={18} /> Lo hice</Button>
        {finished
          ? <Button variant="secondary" onClick={() => { setSecondsLeft(5 * 60); setRunning(true); }}><Plus size={18} /> 5 minutos más</Button>
          : <Button variant="secondary" onClick={() => setRunning(!running)}>{running ? <><Pause size={18} /> Pausar</> : <><Play size={18} /> {secondsLeft < total ? "Continuar" : "Iniciar temporizador"}</>}</Button>}
        <Button variant="ghost" onClick={() => { setSecondsLeft(total); setRunning(false); }} disabled={secondsLeft === total}><RotateCcw size={17} /> Reiniciar</Button>
      </div>
      <button className="task-smaller" onClick={makeSmaller} disabled={splitting}>{splitting ? <><span className="task-spinner small" aria-hidden="true" /> Dividiendo…</> : <><Scissors size={16} /> Este paso todavía se siente grande</>}</button>
      <p className="fine-print">El temporizador es solo una guía. Puedes pausar o salir cuando quieras.</p>
    </div>
  );
}
