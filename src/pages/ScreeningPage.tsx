import { Activity, ArrowRight, BookOpen, Brain, Check, ClipboardList, Gauge, Leaf, LifeBuoy, MessageCircle, ShieldAlert, ShieldCheck, Sparkles, Wind, Wine } from "lucide-react";
import { useState } from "react";
import { Button, Card, DemoBadge } from "../components/ui";
import SupportBanner from "../components/SupportBanner";
import ConsentNotice from "../components/screening/ConsentNotice";
import CrisisProtocol from "../components/screening/CrisisProtocol";
import RecommendationCard from "../components/screening/RecommendationCard";
import SourcesPanel from "../components/screening/SourcesPanel";
import TrafficLight from "../components/screening/TrafficLight";
import ValidationBadge from "../components/screening/ValidationBadge";
import type { ScreeningsState } from "../hooks/useScreenings";
import { useBackNavigation } from "../lib/backNavigation";
import { recommendedIds, wellbeingMessage, type FlowRecommendation, type TraumaAnswer } from "../lib/screeningFlow";
import {
  bandFor,
  buildScreeningResult,
  getScreening,
  needsCrisisSupport,
  optionsFor,
  resultDisclaimer,
  screeningLegalNotice,
  screeningModules,
  subscaleScores,
  triggersCrisis,
  type ScreeningDefinition,
  type ScreeningModule,
} from "../mock/screenings";
import type { MainView, ScreeningId, ScreeningResult } from "../types";

const icons: Record<ScreeningId, typeof Brain> = {
  phq4: Activity,
  k10: Gauge,
  phq9: Brain,
  gad7: Wind,
  paykel: LifeBuoy,
  auditc: Wine,
  audit: Wine,
  asrs: ClipboardList,
  pcl5: ShieldAlert,
};

const traumaOptions: { value: TraumaAnswer; label: string }[] = [
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
  { value: "prefiero-no-responder", label: "Prefiero no responder" },
];

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

export default function ScreeningPage({ screenings, onHelp, navigate }: { screenings: ScreeningsState; onHelp: () => void; navigate: (view: MainView) => void }) {
  const [activeId, setActiveId] = useState<ScreeningId | null>(null);
  const [consentFor, setConsentFor] = useState<ScreeningId | null>(null);
  // El consentimiento se pide antes de iniciar cada módulo durante esta visita.
  const [consentedModules, setConsentedModules] = useState<ScreeningModule[]>([]);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { flow } = screenings;
  const recommended = recommendedIds(flow);

  function begin(id: ScreeningId) {
    const definition = getScreening(id);
    const fresh = new Array(definition.items.length).fill(-1);
    // El AUDIT completo continúa el AUDIT-C: sus 3 primeras respuestas se conservan.
    const previous = definition.prefillFrom && screenings.latestOf(definition.prefillFrom.id);
    if (definition.prefillFrom && previous) previous.answers.slice(0, definition.prefillFrom.count).forEach((value, index) => { fresh[index] = value; });
    setActiveId(id);
    setConsentFor(null);
    setAnswers(fresh);
    setResult(null);
    setHistoryOpen(false);
    window.scrollTo({ top: 0 });
  }

  function start(id: ScreeningId) {
    if (consentedModules.includes(getScreening(id).module)) begin(id);
    else {
      setConsentFor(id);
      window.scrollTo({ top: 0 });
    }
  }

  function acceptConsent() {
    if (!consentFor) return;
    setConsentedModules((current) => [...current, getScreening(consentFor).module]);
    begin(consentFor);
  }

  function setAnswer(index: number, value: number) {
    setAnswers((current) => current.map((entry, itemIndex) => (itemIndex === index ? value : entry)));
  }

  function submit(definition: ScreeningDefinition) {
    if (answers.some((value) => value < 0)) return;
    const nextResult = buildScreeningResult(definition, answers);
    screenings.saveResult(nextResult);
    setResult(nextResult);
    window.scrollTo({ top: 0 });
  }

  function backToGrid() {
    setActiveId(null);
    setConsentFor(null);
    setAnswers([]);
    setResult(null);
    setHistoryOpen(false);
  }

  // Con un cuestionario abierto (o su resultado), la barra superior muestra la flecha de regreso.
  useBackNavigation(1, "Tamizaje", backToGrid, activeId !== null || consentFor !== null);

  function recommendationCards(items: FlowRecommendation[]) {
    return items.map((item) => (
      <RecommendationCard
        key={item.id}
        recommendation={item}
        onStart={() => start(item.id)}
        onSkip={() => screenings.skipRecommendation(item.id)}
        onRemind={() => screenings.remindLater(item.id)}
      />
    ));
  }

  const traumaQuestion = flow.askTrauma && (
    <Card className="trauma-question">
      <span className="eyebrow"><Sparkles size={14} /> Una pregunta más · opcional, no suma puntos</span>
      <p>¿Has vivido o presenciado algún evento muy estresante o traumático cuyos recuerdos todavía te molestan, o que procuras no recordar?</p>
      <div className="screening-options">
        {traumaOptions.map((option) => <button key={option.value} type="button" onClick={() => screenings.answerTrauma(option.value)}>{option.label}</button>)}
      </div>
      <small>Tu respuesta solo se guarda en este dispositivo y sirve para sugerirte, si quieres, un cuestionario sobre estrés postraumático.</small>
    </Card>
  );

  if (consentFor) {
    return <ConsentNotice definition={getScreening(consentFor)} onAccept={acceptConsent} onCancel={backToGrid} />;
  }

  if (activeId && !result) {
    const definition = getScreening(activeId);
    const answeredCount = answers.filter((value) => value >= 0).length;
    // El protocolo aparece justo debajo de la primera respuesta de riesgo, sin esperar al resultado.
    const crisisIndex = definition.crisis && triggersCrisis(definition, answers) ? definition.crisis.items.find((index) => answers[index] >= definition.crisis!.min) ?? -1 : -1;
    return (
      <div className="page screening-page">
        <div className="page-heading">
          <div>
            <span className="eyebrow">Módulo {definition.module} · {screeningModules[definition.module].title}</span>
            <h1>{definition.fullName}</h1>
            <p className="screening-heading-meta"><strong>{definition.name}</strong> <ValidationBadge note={definition.mexicoValidation} /> · {definition.focus}</p>
          </div>
          <DemoBadge>{answeredCount}/{definition.items.length} respondidas</DemoBadge>
        </div>
        <div className="notice-box scope-note"><ShieldCheck size={20} /><p>{screeningLegalNotice}</p></div>
        <SourcesPanel definition={definition} />
        <Card className="screening-form">
          <p className="screening-interval">{definition.interval}</p>
          {definition.note && <p className="screening-note">{definition.note}</p>}
          {definition.items.map((item, index) => (
            <div className="screening-item" key={item}>
              <p>{index + 1}. {item}</p>
              <div className="screening-options">
                {optionsFor(definition, index).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={answers[index] === option.value ? "active" : ""}
                    onClick={() => setAnswer(index, option.value)}
                    aria-pressed={answers[index] === option.value}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {index === crisisIndex && <CrisisProtocol compact onHelp={onHelp} />}
            </div>
          ))}
          <Button className="full-width" disabled={answeredCount < definition.items.length} onClick={() => submit(definition)}>Ver resultado <ArrowRight size={18} /></Button>
          <Button variant="ghost" className="full-width screening-exit" onClick={backToGrid}>Salir sin guardar</Button>
        </Card>
      </div>
    );
  }

  if (activeId && result) {
    const definition = getScreening(activeId);
    const band = bandFor(definition, result.score);
    const history = screenings.historyOf(activeId);
    const subscales = subscaleScores(definition, result.answers);
    const isEntry = flow.entry?.completedAt === result.completedAt;
    return (
      <div className="page screening-page">
        {needsCrisisSupport(result) && <CrisisProtocol onHelp={onHelp} onDirectory={() => navigate("specialists")} />}
        <Card className="screening-result">
          <span className="eyebrow"><Sparkles size={14} /> Resultado de {definition.name} <ValidationBadge note={definition.mexicoValidation} /></span>
          <div className={`screening-verdict screening-verdict--${band.level}`}>
            <TrafficLight level={band.level} />
            <div>
              <h1>{band.label}</h1>
              <p>{band.message}</p>
            </div>
          </div>
          {definition.scoring.type === "sum"
            ? <p className="screening-score">Puntaje: {result.score} de {definition.scoring.maxScore}</p>
            : <p className="screening-score">{result.score} de {definition.items.length} respuestas por encima del umbral (se necesitan {definition.scoring.positiveCount})</p>}
          {subscales.length > 0 && (
            <ul className="screening-subscales">
              {subscales.map((subscale) => (
                <li key={subscale.label}><strong>{subscale.label}: {subscale.score}</strong> · {subscale.positive ? `tu puntaje ${subscale.positiveText}` : "por debajo del punto de corte (3)"}</li>
              ))}
            </ul>
          )}
          <div className="notice-box scope-note screening-disclaimer"><ShieldCheck size={20} /><p><strong>{resultDisclaimer}</strong> Esta banda es la interpretación publicada por el propio instrumento, no un cálculo de riesgo hecho por KAHY.</p></div>

          {isEntry && flow.wellbeing && (
            <div className="screening-wellbeing">
              <p>{wellbeingMessage}</p>
              <div className="screening-result-actions">
                <Button variant="secondary" onClick={() => navigate("activities")}><Leaf size={17} /> Actividades de autocuidado</Button>
                <Button variant="ghost" onClick={() => navigate("resources")}><BookOpen size={17} /> Recursos</Button>
              </div>
            </div>
          )}
          {screenings.recommendations.length > 0 && (
            <div className="screening-next">
              <h2>Siguiente paso sugerido</h2>
              {recommendationCards(screenings.recommendations)}
            </div>
          )}
          {traumaQuestion}

          <SourcesPanel definition={definition} />

          <button type="button" className="companion-cancel" onClick={() => setHistoryOpen(!historyOpen)}>{historyOpen ? "Ocultar" : "Ver"} historial de {definition.name} ({history.length})</button>
          {historyOpen && (
            <div className="screening-history">
              {history.slice().reverse().map((entry) => (
                <div className="screening-history-row" key={entry.completedAt}>
                  <span>{formatDate(entry.completedAt)}</span>
                  <strong>{bandFor(definition, entry.score).label}</strong>
                </div>
              ))}
            </div>
          )}

          <div className="screening-result-actions">
            <Button variant="secondary" onClick={() => navigate("chat")}><MessageCircle size={18} /> Hablar de esto en el chat</Button>
            <Button variant="ghost" onClick={backToGrid}>Volver al tamizaje</Button>
          </div>
        </Card>
      </div>
    );
  }

  const hasResults = (ids: ScreeningId[]) => ids.some((id) => screenings.latestOf(id));
  const moduleStatus: Record<ScreeningModule, string> = {
    1: flow.entry ? `Hecho el ${formatDate(flow.entry.completedAt)}` : "Empieza aquí",
    2: !flow.entryPositive ? "Solo si el módulo 1 lo sugiere" : recommended.has("phq9") || recommended.has("gad7") ? "Recomendado" : "Completado",
    3: [...recommended].some((id) => getScreening(id).module === 3) ? "Recomendado" : "Solo si hay indicios",
    4: [...recommended].some((id) => getScreening(id).module === 4) ? "Recomendado" : "Opcional",
  };
  const visibleModules: Record<ScreeningModule, ScreeningId[]> = {
    1: screeningModules[1].instruments,
    2: flow.entryPositive || hasResults(screeningModules[2].instruments) ? screeningModules[2].instruments : [],
    3: screeningModules[3].instruments.filter((id) => recommended.has(id) || screenings.latestOf(id)),
    4: screeningModules[4].instruments,
  };

  return (
    <div className="page screening-page">
      <div className="page-heading"><div><span className="eyebrow">Tamizaje y salud emocional</span><h1>Autorreporte informativo</h1><p>Empieza con un tamizaje muy breve. Según tus respuestas, KAHY te sugiere un siguiente paso; tú decides si lo haces.</p></div><DemoBadge>Actualizado 25 oct 2026</DemoBadge></div>
      <div className="notice-box scope-note"><ShieldCheck size={20} /><p>{screeningLegalNotice}</p></div>
      {screenings.showSupportBanner && <SupportBanner onHelp={onHelp} onAcknowledge={screenings.acknowledgeSupport} />}

      <ol className="screening-route" aria-label="Tu ruta de tamizaje">
        {([1, 2, 3, 4] as ScreeningModule[]).map((module) => (
          <li key={module} className={`screening-route-step ${moduleStatus[module] === "Recomendado" ? "is-recommended" : ""}`}>
            <span className="screening-route-number">{module}</span>
            <div><strong>{screeningModules[module].title}</strong><small>{moduleStatus[module]}</small></div>
          </li>
        ))}
      </ol>

      {screenings.recommendations.length > 0 && (
        <section className="screening-next">
          <h2>Siguiente paso sugerido</h2>
          {recommendationCards(screenings.recommendations)}
        </section>
      )}
      {screenings.hiddenRecommendations > 0 && (
        <p className="screening-hidden-note">
          Tienes {screenings.hiddenRecommendations} {screenings.hiddenRecommendations === 1 ? "sugerencia pospuesta" : "sugerencias pospuestas"}.{" "}
          <button type="button" onClick={screenings.restoreRecommendations}>Mostrar de nuevo</button>
        </p>
      )}
      {flow.wellbeing && (
        <div className="notice-box screening-wellbeing-note"><Leaf size={20} /><p>{wellbeingMessage}</p></div>
      )}
      {traumaQuestion}

      {([1, 2, 3, 4] as ScreeningModule[]).map((module) => visibleModules[module].length > 0 && (
        <section className="screening-module" key={module}>
          <div className="section-heading"><div><span className="eyebrow">Módulo {module}</span><h2>{screeningModules[module].title}</h2></div><small>{screeningModules[module].purpose}</small></div>
          <div className="screening-grid">
            {visibleModules[module].map((id) => {
              const definition = getScreening(id);
              const Icon = icons[id];
              const latest = screenings.latestOf(id);
              return (
                <Card className="screening-card" key={id}>
                  <span className="screening-icon"><Icon size={22} /></span>
                  <h2>{definition.name}</h2>
                  <ValidationBadge note={definition.mexicoValidation} />
                  <p className="screening-fullname">{definition.fullName}</p>
                  <p>{definition.focus}</p>
                  <span className="screening-meta">{definition.items.length} preguntas · unos {definition.minutes} min{recommended.has(id) && <strong className="screening-chip">Recomendado</strong>}</span>
                  {latest ? (
                    <span className="screening-last"><Check size={14} /> Última vez: {formatDate(latest.completedAt)} · {bandFor(definition, latest.score).label}</span>
                  ) : (
                    <span className="screening-last screening-last--empty">Aún no lo has hecho</span>
                  )}
                  <Button variant="secondary" onClick={() => start(id)}>{latest ? "Volver a hacerlo" : "Comenzar"} <ArrowRight size={16} /></Button>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
