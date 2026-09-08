import { ArrowLeft, ArrowRight, Brain, Check, ChevronDown, ClipboardList, ExternalLink, MessageCircle, ShieldAlert, ShieldCheck, Sparkles, Wind } from "lucide-react";
import { useState } from "react";
import { Button, Card, DemoBadge } from "../components/ui";
import SupportBanner from "../components/SupportBanner";
import type { ScreeningsState } from "../hooks/useScreenings";
import { buildScreeningResult, getScreening, screeningLegalNotice, screenings as screeningDefs, type ScreeningDefinition } from "../mock/screenings";
import { trustedSources } from "../mock/data";
import type { MainView, ScreeningId, ScreeningResult } from "../types";

const icons: Record<ScreeningId, typeof Brain> = {
  phq9: Brain,
  gad7: Wind,
  asrs: ClipboardList,
  pcl5: ShieldAlert,
};

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

export default function ScreeningPage({ screenings, onHelp, navigate }: { screenings: ScreeningsState; onHelp: () => void; navigate: (view: MainView) => void }) {
  const [activeId, setActiveId] = useState<ScreeningId | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  function start(id: ScreeningId) {
    const definition = getScreening(id);
    setActiveId(id);
    setAnswers(new Array(definition.items.length).fill(-1));
    setResult(null);
    setHistoryOpen(false);
  }

  function setAnswer(index: number, value: number) {
    setAnswers((current) => current.map((entry, itemIndex) => (itemIndex === index ? value : entry)));
  }

  function submit(definition: ScreeningDefinition) {
    if (answers.some((value) => value < 0)) return;
    const nextResult = buildScreeningResult(definition, answers);
    screenings.saveResult(nextResult);
    setResult(nextResult);
  }

  function backToGrid() {
    setActiveId(null);
    setAnswers([]);
    setResult(null);
    setHistoryOpen(false);
  }

  if (activeId && !result) {
    const definition = getScreening(activeId);
    const answeredCount = answers.filter((value) => value >= 0).length;
    return (
      <div className="page screening-page">
        <button className="back-link" onClick={backToGrid}><ArrowLeft size={18} /> Volver al tamizaje</button>
        <div className="page-heading"><div><span className="eyebrow">{definition.name}</span><h1>{definition.fullName}</h1><p>{definition.focus}</p></div><DemoBadge>{answeredCount}/{definition.items.length} respondidas</DemoBadge></div>
        <div className="notice-box scope-note"><ShieldCheck size={20} /><p>{screeningLegalNotice}</p></div>
        <Card className="screening-form">
          <p className="screening-interval">{definition.interval}</p>
          {definition.items.map((item, index) => (
            <div className="screening-item" key={item}>
              <p>{index + 1}. {item}</p>
              <div className="screening-options">
                {definition.options.map((option) => (
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
            </div>
          ))}
          <Button className="full-width" disabled={answeredCount < definition.items.length} onClick={() => submit(definition)}>Ver resultado <ArrowRight size={18} /></Button>
        </Card>
      </div>
    );
  }

  if (activeId && result) {
    const definition = getScreening(activeId);
    const sources = definition.sourceIds.map((id) => trustedSources.find((item) => item.id === id)).filter(Boolean);
    const history = screenings.historyOf(activeId);
    const isSum = definition.scoring.type === "sum";
    return (
      <div className="page screening-page">
        <button className="back-link" onClick={backToGrid}><ArrowLeft size={18} /> Volver al tamizaje</button>
        <Card className="screening-result">
          <span className="eyebrow"><Sparkles size={14} /> Resultado de {definition.name}</span>
          <h1>{result.band}</h1>
          {isSum && <p className="screening-score">Puntaje: {result.score} de {(definition.scoring as { maxScore: number }).maxScore}</p>}
          <div className="notice-box scope-note"><ShieldCheck size={20} /><p>{screeningLegalNotice} Esta banda es la interpretación publicada por el propio instrumento, no un cálculo de riesgo hecho por KAHY.</p></div>

          {result.item9Positive && (
            <SupportBanner onHelp={onHelp} onAcknowledge={screenings.acknowledgeSupport} />
          )}

          <details className="assistant-details screening-sources">
            <summary><span><ExternalLink size={16} /> Bases científicas y validación en México</span><ChevronDown size={16} /></summary>
            <div className="assistant-details-body">
              {sources.map((source) => source && (
                <a className="screening-source-row" href={source.url} target="_blank" rel="noreferrer" key={source.id}>
                  <strong>{source.title}</strong>
                  <small>{source.organization}</small>
                  <span>{source.summary}</span>
                </a>
              ))}
            </div>
          </details>

          <button type="button" className="companion-cancel" onClick={() => setHistoryOpen(!historyOpen)}>{historyOpen ? "Ocultar" : "Ver"} historial de {definition.name} ({history.length})</button>
          {historyOpen && (
            <div className="screening-history">
              {history.slice().reverse().map((entry) => (
                <div className="screening-history-row" key={entry.completedAt}>
                  <span>{formatDate(entry.completedAt)}</span>
                  <strong>{entry.band}</strong>
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

  return (
    <div className="page screening-page">
      <div className="page-heading"><div><span className="eyebrow">Tamizaje y salud emocional</span><h1>Autorreporte informativo</h1><p>Cuestionarios de autorreporte ampliamente usados en salud mental. No diagnostican; son un punto de partida para conversar con un profesional si tú lo decides.</p></div><DemoBadge>Actualizado 8 sep 2026</DemoBadge></div>
      <div className="notice-box scope-note"><ShieldCheck size={20} /><p>{screeningLegalNotice}</p></div>
      {screenings.showSupportBanner && <SupportBanner onHelp={onHelp} onAcknowledge={screenings.acknowledgeSupport} />}
      <div className="screening-grid">
        {screeningDefs.map((definition) => {
          const Icon = icons[definition.id];
          const latest = screenings.latestOf(definition.id);
          return (
            <Card className="screening-card" key={definition.id}>
              <span className="screening-icon"><Icon size={22} /></span>
              <h2>{definition.name}</h2>
              <p className="screening-fullname">{definition.fullName}</p>
              <p>{definition.focus}</p>
              {latest ? (
                <span className="screening-last"><Check size={14} /> Última vez: {formatDate(latest.completedAt)} · {latest.band}</span>
              ) : (
                <span className="screening-last screening-last--empty">Aún no lo has hecho</span>
              )}
              <Button variant="secondary" onClick={() => start(definition.id)}>{latest ? "Volver a hacerlo" : "Comenzar"} <ArrowRight size={16} /></Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
