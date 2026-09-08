import type { ScreeningId, ScreeningResult } from "../types";

export const screeningLegalNotice =
  "Herramienta de tamizaje informativo, no sustituye la valoración clínica profesional. Los resultados no son un diagnóstico: son un punto de partida para conversar con un profesional de salud si tú lo decides.";

export type ScreeningOption = { value: number; label: string };

export type ScreeningBand = { min: number; max: number; label: string };

export type ScreeningDefinition = {
  id: ScreeningId;
  name: string;
  fullName: string;
  focus: string;
  interval: string;
  items: string[];
  options: ScreeningOption[];
  /** How score/interpretation is derived. "sum": add all answers into `bands`. "thresholdCount": count items meeting a per-item threshold (ASRS Part A). */
  scoring:
    | { type: "sum"; maxScore: number; bands: ScreeningBand[] }
    | { type: "thresholdCount"; thresholds: number[]; positiveCount: number; positiveLabel: string; negativeLabel: string };
  /** 0-based index of the item that must always surface crisis resources when endorsed (PHQ-9 item 9). */
  safetyItemIndex?: number;
  sourceIds: string[];
};

const phq9Gad7Options: ScreeningOption[] = [
  { value: 0, label: "Nunca" },
  { value: 1, label: "Varios días" },
  { value: 2, label: "Más de la mitad de los días" },
  { value: 3, label: "Casi todos los días" },
];

const asrsOptions: ScreeningOption[] = [
  { value: 0, label: "Nunca" },
  { value: 1, label: "Rara vez" },
  { value: 2, label: "A veces" },
  { value: 3, label: "Frecuentemente" },
  { value: 4, label: "Muy frecuentemente" },
];

const pcl5Options: ScreeningOption[] = [
  { value: 0, label: "Nada en absoluto" },
  { value: 1, label: "Un poco" },
  { value: 2, label: "Moderadamente" },
  { value: 3, label: "Bastante" },
  { value: 4, label: "Extremadamente" },
];

export const screenings: ScreeningDefinition[] = [
  {
    id: "phq9",
    name: "PHQ-9",
    fullName: "Cuestionario de Salud del Paciente-9",
    focus: "Síntomas de ánimo bajo o depresivos",
    interval: "En las últimas 2 semanas, ¿qué tan seguido te ha molestado alguno de los siguientes problemas?",
    items: [
      "Poco interés o placer en hacer las cosas",
      "Se ha sentido decaído(a), deprimido(a) o sin esperanzas",
      "Dificultad para quedarse o permanecer dormido(a), o ha dormido demasiado",
      "Se ha sentido cansado(a) o con poca energía",
      "Falta de apetito o ha comido en exceso",
      "Se ha sentido mal con usted mismo(a), o que es un fracaso, o que ha quedado mal con usted mismo(a) o con su familia",
      "Dificultad para concentrarse en actividades, como leer el periódico o ver televisión",
      "Se ha movido o hablado tan lento que otras personas podrían notarlo, o lo contrario: muy inquieto(a) o agitado(a), moviéndose mucho más de lo normal",
      "Pensamientos de que estaría mejor muerto(a), o de hacerse daño de alguna manera",
    ],
    options: phq9Gad7Options,
    scoring: {
      type: "sum",
      maxScore: 27,
      bands: [
        { min: 0, max: 4, label: "Mínima o ninguna" },
        { min: 5, max: 9, label: "Leve" },
        { min: 10, max: 14, label: "Moderada" },
        { min: 15, max: 19, label: "Moderadamente severa" },
        { min: 20, max: 27, label: "Severa" },
      ],
    },
    safetyItemIndex: 8,
    sourceIds: ["phq9-gad7-unam", "phq9-gad7-mx", "nice-depression"],
  },
  {
    id: "gad7",
    name: "GAD-7",
    fullName: "Escala de Trastorno de Ansiedad Generalizada-7",
    focus: "Síntomas de ansiedad",
    interval: "En las últimas 2 semanas, ¿qué tan seguido te ha molestado alguno de los siguientes problemas?",
    items: [
      "Sentirse nervioso(a), ansioso(a) o con los nervios de punta",
      "No poder parar o controlar su preocupación",
      "Preocuparse demasiado por diferentes cosas",
      "Dificultad para relajarse",
      "Estar tan inquieto(a) que es difícil quedarse quieto(a)",
      "Molestarse o irritarse fácilmente",
      "Sentir miedo, como si algo terrible pudiera pasar",
    ],
    options: phq9Gad7Options,
    scoring: {
      type: "sum",
      maxScore: 21,
      bands: [
        { min: 0, max: 4, label: "Mínima" },
        { min: 5, max: 9, label: "Leve" },
        { min: 10, max: 14, label: "Moderada" },
        { min: 15, max: 21, label: "Severa" },
      ],
    },
    sourceIds: ["phq9-gad7-unam", "phq9-gad7-mx", "nice-panic-anxiety"],
  },
  {
    id: "asrs",
    name: "ASRS v1.1 (Parte A)",
    fullName: "Escala de Autorreporte de TDAH en Adultos, Parte A",
    focus: "Síntomas de atención e impulsividad en adultos",
    interval: "En los últimos 6 meses, ¿con qué frecuencia...",
    items: [
      "¿Tiene problemas para terminar los detalles finales de un proyecto, una vez que ya hizo las partes difíciles?",
      "¿Tiene dificultad para poner las cosas en orden cuando tiene que hacer una tarea que requiere organización?",
      "¿Tiene problemas para recordar citas u obligaciones?",
      "Cuando tiene una tarea que requiere pensar mucho, ¿evita o retrasa empezarla?",
      "¿Se mueve o retuerce las manos o los pies cuando tiene que estar sentado(a) por mucho tiempo?",
      "¿Se siente excesivamente activo(a) e impulsado(a) a hacer cosas, como si lo moviera un motor?",
    ],
    options: asrsOptions,
    scoring: {
      // Umbral oficial de la Parte A: preguntas 1-3 cuentan como positivas desde "A veces" (>=2); preguntas 4-6 desde "Frecuentemente" (>=3).
      type: "thresholdCount",
      thresholds: [2, 2, 2, 3, 3, 3],
      positiveCount: 4,
      positiveLabel: "Compatible con síntomas significativos de TDAH en adultos",
      negativeLabel: "No compatible con el patrón que busca este tamizaje",
    },
    sourceIds: ["asrs-mx", "nice-adhd"],
  },
  {
    id: "pcl5",
    name: "PCL-5",
    fullName: "Lista de Verificación de TEPT para el DSM-5",
    focus: "Síntomas de estrés postraumático",
    interval: "En el último mes, ¿cuánto le ha molestado...",
    items: [
      "Recuerdos repetidos, perturbadores y no deseados de la experiencia estresante",
      "Sueños repetidos y perturbadores de la experiencia estresante",
      "De repente sentir o actuar como si la experiencia estresante estuviera ocurriendo de nuevo",
      "Sentirse muy molesto(a) cuando algo le recuerda la experiencia estresante",
      "Tener fuertes reacciones físicas cuando algo le recuerda la experiencia estresante (palpitaciones, dificultad para respirar, sudoración)",
      "Evitar recuerdos, pensamientos o sentimientos relacionados con la experiencia estresante",
      "Evitar cosas externas que le recuerden la experiencia estresante (personas, lugares, conversaciones, actividades, objetos o situaciones)",
      "Problemas para recordar partes importantes de la experiencia estresante",
      "Creencias negativas fuertes sobre usted mismo(a), otras personas o el mundo",
      "Culparse a usted mismo(a) o a alguien más por la experiencia estresante o lo que pasó después",
      "Tener fuertes emociones negativas como miedo, horror, enojo, culpa o vergüenza",
      "Pérdida de interés en actividades que antes disfrutaba",
      "Sentirse distante o alejado(a) de otras personas",
      "Dificultad para experimentar emociones positivas",
      "Comportamiento irritable, arrebatos de enojo o actuar de forma agresiva",
      "Tomar demasiados riesgos o hacer cosas que podrían causarle daño",
      "Estar \"superalerta\", vigilante o en guardia",
      "Sentirse nervioso(a) o sobresaltarse fácilmente",
      "Dificultad para concentrarse",
      "Problemas para dormir (dificultad para quedarse o permanecer dormido(a))",
    ],
    options: pcl5Options,
    scoring: {
      type: "sum",
      maxScore: 80,
      bands: [
        { min: 0, max: 32, label: "Por debajo del punto de corte de referencia" },
        { min: 33, max: 80, label: "En o por encima del punto de corte de referencia (33)" },
      ],
    },
    sourceIds: ["pcl5-unam", "pcl5-mx", "nice-ptsd"],
  },
];

export function getScreening(id: ScreeningId): ScreeningDefinition {
  return screenings.find((item) => item.id === id) ?? screenings[0];
}

export function scoreScreening(definition: ScreeningDefinition, answers: number[]): { score: number; band: string } {
  if (definition.scoring.type === "sum") {
    const score = answers.reduce((sum, value) => sum + value, 0);
    const band = definition.scoring.bands.find((entry) => score >= entry.min && score <= entry.max);
    return { score, band: band?.label ?? "" };
  }
  const { thresholds, positiveCount, positiveLabel, negativeLabel } = definition.scoring;
  const positives = answers.filter((value, index) => value >= thresholds[index]).length;
  return { score: positives, band: positives >= positiveCount ? positiveLabel : negativeLabel };
}

export function buildScreeningResult(definition: ScreeningDefinition, answers: number[]): ScreeningResult {
  const { score, band } = scoreScreening(definition, answers);
  const item9Positive = definition.safetyItemIndex !== undefined ? answers[definition.safetyItemIndex] >= 1 : undefined;
  return {
    id: definition.id,
    completedAt: Date.now(),
    answers,
    score,
    band,
    ...(item9Positive !== undefined ? { item9Positive } : {}),
  };
}
