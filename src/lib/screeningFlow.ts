import { getScreening, needsCrisisSupport } from "../mock/screenings";
import type { ScreeningId, ScreeningResult } from "../types";

/**
 * Flujo de tamizaje adaptativo de KAHY.
 *
 * 1. Siempre se empieza por el módulo 1 (PHQ-4 o K10).
 * 2. Si es positivo (PHQ-4 ≥ 3 o K10 ≥ 22) se recomiendan PHQ-9 y GAD-7 (módulo 2).
 * 3. PHQ-9 ítem 9 > 0 → protocolo de crisis + Paykel. PHQ-9 o GAD-7 moderado o más → AUDIT-C,
 *    y si el AUDIT-C es positivo, el AUDIT completo (módulo 3).
 * 4. Dificultad para concentrarse o inquietud → ASRS. Historia de trauma → PCL-5 (módulo 4).
 *
 * Son funciones puras: la pantalla decide qué mostrar y las pruebas las revisan sin navegador.
 * Una recomendación se cumple cuando el instrumento se respondió después del resultado que la originó;
 * así, al repetir el módulo 1 otro día, la ruta se vuelve a evaluar desde cero.
 */

export const ENTRY_CUTOFFS: Partial<Record<ScreeningId, number>> = { phq4: 3, k10: 22 };
/** PHQ-9 y GAD-7: "moderado" empieza en 10. */
export const MODERATE_CUTOFF = 10;
export const AUDITC_CUTOFF = 3;
/** "Más de la mitad de los días" en PHQ-9 ítem 7 (concentración) o GAD-7 ítem 5 (inquietud). */
export const ATTENTION_ITEM_MIN = 2;
const PHQ9_CONCENTRATION = 6;
const GAD7_RESTLESSNESS = 4;
/** "Recordarme más tarde" vuelve a mostrar la recomendación al día siguiente. */
export const REMIND_LATER_MS = 24 * 60 * 60 * 1000;

export type TraumaAnswer = "si" | "no" | "prefiero-no-responder";

export type FlowRecommendation = {
  id: ScreeningId;
  module: 2 | 3 | 4;
  /** completedAt del resultado (o respuesta) que originó la recomendación. */
  since: number;
  title: string;
  message: string;
  urgent?: boolean;
};

export type ScreeningFlow = {
  /** Último resultado del módulo 1. */
  entry?: ScreeningResult;
  entryPositive: boolean;
  /** Último PHQ-9 o Paykel con respuestas de riesgo: el protocolo de crisis debe estar visible. */
  crisis: boolean;
  recommendations: FlowRecommendation[];
  /** Módulo 2 completo y falta la pregunta opcional sobre trauma (decide si se recomienda la PCL-5). */
  askTrauma: boolean;
  /** Módulo 1 negativo: no se satura con más cuestionarios. */
  wellbeing: boolean;
};

export type FlowPrefs = {
  /** Momento en que se eligió "Saltar por ahora" para cada instrumento. */
  skipped: Partial<Record<ScreeningId, number>>;
  /** Hasta cuándo se pospuso con "Recordarme más tarde". */
  remindAt: Partial<Record<ScreeningId, number>>;
  trauma?: { answer: TraumaAnswer; at: number };
};

export const emptyFlowPrefs: FlowPrefs = { skipped: {}, remindAt: {} };

export const wellbeingMessage =
  "Tus resultados iniciales no sugieren un malestar significativo. Puedes explorar los recursos de autocuidado o repetir el tamizaje en otro momento.";

function latestOf(results: ScreeningResult[], ids: ScreeningId[], since = Number.NEGATIVE_INFINITY): ScreeningResult | undefined {
  let latest: ScreeningResult | undefined;
  results.forEach((result) => {
    if (!ids.includes(result.id) || result.completedAt < since) return;
    if (!latest || result.completedAt >= latest.completedAt) latest = result;
  });
  return latest;
}

export function isEntryPositive(result: ScreeningResult): boolean {
  const cutoff = ENTRY_CUTOFFS[result.id];
  return cutoff !== undefined && result.score >= cutoff;
}

function recommendation(id: ScreeningId, since: number, message: string, urgent = false): FlowRecommendation {
  const definition = getScreening(id);
  return { id, module: definition.module as 2 | 3 | 4, since, title: `Módulo ${definition.module} · ${definition.name}`, message, urgent };
}

const minutes = (id: ScreeningId) => {
  const value = getScreening(id).minutes;
  return `Te tomará ${value} ${value === 1 ? "minuto" : "minutos"}.`;
};

export function computeScreeningFlow(results: ScreeningResult[], trauma?: FlowPrefs["trauma"]): ScreeningFlow {
  const latestPhq9 = latestOf(results, ["phq9"]);
  const latestPaykel = latestOf(results, ["paykel"]);
  const crisis = Boolean((latestPhq9 && needsCrisisSupport(latestPhq9)) || (latestPaykel && needsCrisisSupport(latestPaykel)));

  const entry = latestOf(results, ["phq4", "k10"]);
  if (!entry) return { entryPositive: false, crisis, recommendations: [], askTrauma: false, wellbeing: false };
  if (!isEntryPositive(entry)) return { entry, entryPositive: false, crisis, recommendations: [], askTrauma: false, wellbeing: true };

  const recommendations: FlowRecommendation[] = [];
  const phq9 = latestOf(results, ["phq9"], entry.completedAt);
  const gad7 = latestOf(results, ["gad7"], entry.completedAt);

  if (!phq9) recommendations.push(recommendation("phq9", entry.completedAt, `Basado en tus respuestas, te recomendamos completar una evaluación breve sobre tu estado de ánimo. ${minutes("phq9")}`));
  if (!gad7) recommendations.push(recommendation("gad7", entry.completedAt, `Basado en tus respuestas, te recomendamos completar una evaluación breve sobre ansiedad. ${minutes("gad7")}`));

  // 3a. Riesgo suicida: prioridad alta.
  if (phq9 && needsCrisisSupport(phq9) && !latestOf(results, ["paykel"], phq9.completedAt)) {
    recommendations.unshift(recommendation("paykel", phq9.completedAt, `Por lo que respondiste, te sugerimos 5 preguntas breves para entender mejor cómo estás. Ten a la mano la Línea de la Vida: 800 911 2000. ${minutes("paykel")}`, true));
  }

  // 3b. Consumo de alcohol: AUDIT-C y, si es positivo, el AUDIT completo.
  const moderate = [phq9, gad7].filter((result): result is ScreeningResult => result !== undefined && result.score >= MODERATE_CUTOFF);
  if (moderate.length) {
    const since = Math.max(...moderate.map((result) => result.completedAt));
    const auditc = latestOf(results, ["auditc"], since);
    if (!auditc) {
      recommendations.push(recommendation("auditc", since, `Algunas personas con síntomas como los tuyos notan cambios en su consumo de alcohol. Si quieres revisarlo, son 3 preguntas. ${minutes("auditc")}`));
    } else if (auditc.score >= AUDITC_CUTOFF && !latestOf(results, ["audit"], auditc.completedAt)) {
      recommendations.push(recommendation("audit", auditc.completedAt, `Tus respuestas sugieren revisar tu consumo con 7 preguntas más; las 3 que ya respondiste se conservan. ${minutes("audit")}`));
    }
  }

  // 4a. Atención: dificultad para concentrarse (PHQ-9) o inquietud (GAD-7).
  const attention = [
    phq9 && phq9.answers[PHQ9_CONCENTRATION] >= ATTENTION_ITEM_MIN ? phq9 : undefined,
    gad7 && gad7.answers[GAD7_RESTLESSNESS] >= ATTENTION_ITEM_MIN ? gad7 : undefined,
  ].filter((result): result is ScreeningResult => result !== undefined);
  if (attention.length) {
    const since = Math.max(...attention.map((result) => result.completedAt));
    if (!latestOf(results, ["asrs"], since)) {
      recommendations.push(recommendation("asrs", since, `Mencionaste dificultad para concentrarte o inquietud. Si te interesa, puedes completar un tamizaje breve de atención. ${minutes("asrs")}`));
    }
  }

  // 4b. Trauma: el PHQ-9 y el GAD-7 no preguntan por recuerdos intrusivos ni evitación,
  // así que al terminar el módulo 2 se hace una pregunta opcional que no suma puntos.
  const moduleTwoAt = phq9 && gad7 ? Math.max(phq9.completedAt, gad7.completedAt) : undefined;
  const traumaAnswered = moduleTwoAt !== undefined && trauma !== undefined && trauma.at >= moduleTwoAt;
  if (traumaAnswered && trauma.answer === "si" && !latestOf(results, ["pcl5"], trauma.at)) {
    recommendations.push(recommendation("pcl5", trauma.at, `Si te sientes con energía para hacerlo, un tamizaje sobre estrés postraumático puede ayudarte a ponerle nombre a lo que vives. ${minutes("pcl5")}`));
  }

  return { entry, entryPositive: true, crisis, recommendations, askTrauma: moduleTwoAt !== undefined && !traumaAnswered, wellbeing: false };
}

/** Quita las recomendaciones que la persona saltó (para ese mismo disparador) o pospuso. */
export function visibleRecommendations(recommendations: FlowRecommendation[], prefs: FlowPrefs, now: number): FlowRecommendation[] {
  return recommendations.filter((item) => {
    const skippedAt = prefs.skipped[item.id];
    if (skippedAt !== undefined && skippedAt >= item.since) return false;
    const remindAt = prefs.remindAt[item.id];
    return remindAt === undefined || remindAt <= now;
  });
}

/** Instrumentos recomendados ahora mismo (aunque estén pospuestos), para marcarlos en la lista. */
export function recommendedIds(flow: ScreeningFlow): Set<ScreeningId> {
  return new Set(flow.recommendations.map((item) => item.id));
}
