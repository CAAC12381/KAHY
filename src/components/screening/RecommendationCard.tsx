import { ArrowRight, BellRing, Clock } from "lucide-react";
import type { FlowRecommendation } from "../../lib/screeningFlow";
import { getScreening } from "../../mock/screenings";
import { Button } from "../ui";
import ValidationBadge from "./ValidationBadge";

/** Tarjeta "siguiente módulo". "Saltar por ahora" y "Recordarme más tarde" siempre están visibles. */
export default function RecommendationCard({ recommendation, onStart, onSkip, onRemind }: { recommendation: FlowRecommendation; onStart: () => void; onSkip: () => void; onRemind: () => void }) {
  const definition = getScreening(recommendation.id);
  return (
    <div className={`recommendation-card ${recommendation.urgent ? "recommendation-card--urgent" : ""}`}>
      <div className="recommendation-card-head">
        <span className="eyebrow">{recommendation.urgent ? <BellRing size={14} /> : <Clock size={14} />} {recommendation.title}</span>
        <ValidationBadge note={definition.mexicoValidation} />
      </div>
      <p>{recommendation.message}</p>
      <div className="recommendation-card-actions">
        <Button onClick={onStart}>Comenzar <ArrowRight size={16} /></Button>
        <Button variant="ghost" onClick={onSkip}>Saltar por ahora</Button>
        <Button variant="ghost" onClick={onRemind}>Recordarme más tarde</Button>
      </div>
    </div>
  );
}
